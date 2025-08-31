import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CartRepository } from '../repositories/cart.repository';
import { MenuItemRepository } from 'src/modules/menu/repositories/menu-item.repository';
import { AddToCartDto, UpdateCartItemDto, CartResponseDto, CartItemResponseDto } from '../dto';
import { CartItem, MenuItem } from 'src/entities';
import { MenuItemService } from '@/modules/menu/services/menu-item.service';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly cartRepository: CartRepository,
    private readonly menuItemService: MenuItemService,
  ) {}

  async addToCart(userId: string, addToCartDto: AddToCartDto): Promise<CartItemResponseDto> {
    this.logger.log(`Adding item ${addToCartDto.menu_item_id} to cart for user ${userId}`);

    // Validate menu item exists and is available
    const menuItem = await this.menuItemService.getMenuItemById(addToCartDto.menu_item_id);
    if (!menuItem) {
      throw new NotFoundException(`Menu item with ID ${addToCartDto.menu_item_id} not found`);
    }

    if (!menuItem.is_available) {
      throw new BadRequestException(`Menu item "${menuItem.name}" is not available for ordering`);
    }

    // Check if item already exists in cart
    const existingCartItem = await this.cartRepository.findByUserAndMenuItem(userId, addToCartDto.menu_item_id);
    
    if (existingCartItem) {
      // Update existing cart item
      const newQuantity = existingCartItem.quantity + addToCartDto.quantity;
      if (newQuantity > 99) {
        throw new BadRequestException('Total quantity cannot exceed 99 items');
      }

      existingCartItem.updateQuantity(newQuantity);
      

      const updatedCartItem = await this.cartRepository.update(existingCartItem.id, {
        quantity: existingCartItem.quantity
      });
      this.logger.log(`Updated existing cart item ${updatedCartItem.id} with quantity ${newQuantity}`);

      console.log('updatedCartItem', updatedCartItem);
      
      return this.mapToCartItemResponse(updatedCartItem);
    }

    // Create new cart item
    const cartItem = await this.cartRepository.create({
      user_id: userId,
      menu_item_id: addToCartDto.menu_item_id,
      vendor_id: menuItem.vendor_id,
      quantity: addToCartDto.quantity,
      unit_price: menuItem.price,
      total_price: menuItem.price * addToCartDto.quantity,
    });

    this.logger.log(`Added new item to cart: ${cartItem.id}`);
    return this.mapToCartItemResponse(cartItem);
  }

  async getCart(userId: string): Promise<CartResponseDto> {
    this.logger.log(`Fetching cart for user ${userId}`);

    const cartItems = await this.cartRepository.getCartWithDetails(userId);
    const summary = await this.cartRepository.getCartSummary(userId);

    const cartItemsResponse = cartItems.map(item => this.mapToCartItemResponse(item));

    return {
      user_id: userId,
      items: cartItemsResponse,
      total_items: summary.total_items,
      subtotal: summary.subtotal,
      total_amount: summary.subtotal, // No fees applied yet
      is_empty: summary.is_empty,
      vendor_count: summary.vendor_count,
    };
  }

  async updateCartItem(userId: string, cartItemId: string, updateDto: UpdateCartItemDto): Promise<CartItemResponseDto> {
    this.logger.log(`Updating cart item ${cartItemId} for user ${userId}`);

    const cartItem = await this.cartRepository.findById(cartItemId);
    if (!cartItem) {
      throw new NotFoundException(`Cart item with ID ${cartItemId} not found`);
    }

    if (cartItem.user_id !== userId) {
      throw new BadRequestException('You can only update your own cart items');
    }

    // Update quantity if provided
    if (updateDto.quantity !== undefined) {
      cartItem.updateQuantity(updateDto.quantity);
    }

    const updatedCartItem = await this.cartRepository.update(cartItem.id, {
      quantity: cartItem.quantity,
      total_price: cartItem.total_price
    });
    this.logger.log(`Cart item ${cartItemId} updated successfully`);

    return this.mapToCartItemResponse(updatedCartItem);
  }

  async removeFromCart(userId: string, cartItemId: string): Promise<void> {
    this.logger.log(`Removing cart item ${cartItemId} for user ${userId}`);

    const cartItem = await this.cartRepository.findById(cartItemId);
    if (!cartItem) {
      throw new NotFoundException(`Cart item with ID ${cartItemId} not found`);
    }

    if (cartItem.user_id !== userId) {
      throw new BadRequestException('You can only remove your own cart items');
    }

    await this.cartRepository.deactivate(cartItemId);
    this.logger.log(`Cart item ${cartItemId} removed successfully`);
  }

  async clearCart(userId: string): Promise<{ removed_count: number }> {
    this.logger.log(`Clearing cart for user ${userId}`);

    const removedCount = await this.cartRepository.clearUserCart(userId);
    this.logger.log(`Cleared ${removedCount} items from cart for user ${userId}`);

    return { removed_count: removedCount };
  }

  async validateCart(userId: string): Promise<{
    is_valid: boolean;
    valid_items: CartItemResponseDto[];
    invalid_items: CartItemResponseDto[];
    errors: string[];
    summary: {
      total_items: number;
      subtotal: number;
      vendor_count: number;
    };
  }> {
    this.logger.log(`Validating cart for user ${userId}`);

    const validation = await this.cartRepository.validateCartItems(userId);
    
    const valid_items = validation.valid_items.map(item => this.mapToCartItemResponse(item));
    const invalid_items = validation.invalid_items.map(item => this.mapToCartItemResponse(item));

    // Get summary for valid items only
    const summary = await this.cartRepository.getCartSummary(userId);

    return {
      is_valid: validation.valid_items.length > 0 && validation.errors.length === 0,
      valid_items,
      invalid_items,
      errors: validation.errors,
      summary: {
        total_items: summary.total_items,
        subtotal: summary.subtotal,
        vendor_count: summary.vendor_count,
      },
    };
  }

  async getCartItemById(userId: string, cartItemId: string): Promise<CartItemResponseDto> {
    const cartItem = await this.cartRepository.findById(cartItemId);
    if (!cartItem) {
      throw new NotFoundException(`Cart item with ID ${cartItemId} not found`);
    }

    if (cartItem.user_id !== userId) {
      throw new BadRequestException('You can only view your own cart items');
    }

    return this.mapToCartItemResponse(cartItem);
  }

  private mapToCartItemResponse(cartItem: CartItem): CartItemResponseDto {
    return {
      id: cartItem.id,
      menu_item_id: cartItem.menu_item_id,
      quantity: cartItem.quantity,
      unit_price: cartItem.unit_price,
      total_price: cartItem.total_price,
      created_at: cartItem.created_at,
      updated_at: cartItem.updated_at,
      menu_item_name: cartItem.menu_item?.name || 'Unknown',
      menu_item_image: cartItem.menu_item?.image_url,
      vendor_id: cartItem.menu_item?.vendor_id || 'Unknown',
      vendor_name: cartItem.menu_item?.vendor?.business_name || 'Unknown',
      category_id: cartItem.menu_item?.category_id || 'Unknown',
      category_name: cartItem.menu_item?.category?.name || 'Unknown',
    };
  }
} 