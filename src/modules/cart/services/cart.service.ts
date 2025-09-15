import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CartRepository } from '../repositories/cart.repository';
import { MenuItemRepository } from 'src/modules/menu/repositories/menu-item.repository';
import { AddToCartDto, UpdateCartItemDto, CartResponseDto, CartItemResponseDto, GroupedCartResponseDto, VendorCartGroupDto, VendorCartResponseDto } from '../dto';
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

  async getCart(userId: string, isActive: boolean = true): Promise<CartResponseDto> {
    this.logger.log(`Fetching ${isActive ? 'active' : 'inactive'} cart for user ${userId}`);

    const cartItems = await this.cartRepository.getCartWithDetails(userId, isActive);
    const summary = await this.cartRepository.getCartSummary(userId, isActive);

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

  async getCartItemsByIds(userId: string, cartItemIds: string[]): Promise<CartItem[]> {
    this.logger.log(`Getting cart items by IDs for user ${userId}: ${cartItemIds.join(', ')}`);
    
    const cartItems = await this.cartRepository.findByCartItemIds(userId, cartItemIds);
    
    if (cartItems.length !== cartItemIds.length) {
      const foundIds = cartItems.map(item => item.id);
      const missingIds = cartItemIds.filter(id => !foundIds.includes(id));
      throw new NotFoundException(`Cart items not found: ${missingIds.join(', ')}`);
    }
    
    return cartItems;
  }

  async validateCartItemsForCheckout(userId: string, cartItemIds: string[]): Promise<{
    cartItems: CartItem[];
    vendorId: string;
    subtotal: number;
    is_valid: boolean;
    issues: string[];
  }> {
    this.logger.log(`Validating cart items for checkout: ${cartItemIds.join(', ')}`);
    
    // Get cart items by IDs
    const cartItems = await this.getCartItemsByIds(userId, cartItemIds);
    
    const issues: string[] = [];
    let subtotal = 0;
    
    // Validate each cart item
    for (const cartItem of cartItems) {
      // Check if menu item still exists and is available
      if (!cartItem.menu_item) {
        issues.push(`Menu item no longer exists for cart item ${cartItem.id}`);
        continue;
      }

      if (!cartItem.menu_item.is_available) {
        issues.push(`"${cartItem.menu_item.name}" is no longer available`);
        continue;
      }

      // Check if price has changed significantly (more than 10%)
      const currentPrice = cartItem.menu_item.price;
      const cartPrice = cartItem.unit_price;
      const priceChange = Math.abs(currentPrice - cartPrice) / cartPrice;
      
      if (priceChange > 0.1) {
        issues.push(`Price for "${cartItem.menu_item.name}" has changed from ₦${cartPrice} to ₦${currentPrice}`);
      }

      subtotal += cartItem.total_price;
    }

    // Validate single vendor
    const vendorIds = new Set(cartItems.map(item => item.vendor_id));
    if (vendorIds.size === 0) {
      issues.push('No valid vendor found for cart items');
    } else if (vendorIds.size > 1) {
      issues.push('All items must be from the same vendor. Please create separate orders for different vendors.');
    }

    const vendorId = vendorIds.size === 1 ? Array.from(vendorIds)[0] : '';

    return {
      cartItems,
      vendorId,
      subtotal,
      is_valid: issues.length === 0,
      issues,
    };
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

  async getCartGroupedByVendor(userId: string, isActive: boolean = true): Promise<GroupedCartResponseDto> {
    this.logger.log(`Fetching ${isActive ? 'active' : 'inactive'} cart grouped by vendor for user ${userId}`);

    const cartItems = await this.cartRepository.getCartItemsGroupedByVendor(userId, isActive);
    
    if (cartItems.length === 0) {
      return {
        user_id: userId,
        vendors: [],
        total_items: 0,
        subtotal: 0,
        total_amount: 0,
        is_empty: true,
        vendor_count: 0,
      };
    }

    // Group cart items by vendor
    const vendorGroups = new Map<string, CartItem[]>();
    
    for (const cartItem of cartItems) {
      const vendorId = cartItem.vendor_id || cartItem.menu_item?.vendor_id;
      if (!vendorId) continue;
      
      if (!vendorGroups.has(vendorId)) {
        vendorGroups.set(vendorId, []);
      }
      vendorGroups.get(vendorId)!.push(cartItem);
    }

    // Convert groups to response format
    const vendors: VendorCartGroupDto[] = [];
    let totalItems = 0;
    let totalSubtotal = 0;

    for (const [vendorId, items] of vendorGroups) {
      const vendorItems = items.map(item => this.mapToCartItemResponse(item));
      const vendorTotalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      const vendorSubtotal = items.reduce((sum, item) => sum + item.total_price, 0);
      
      vendors.push({
        vendor_id: vendorId,
        vendor_name: items[0]?.menu_item?.vendor?.business_name || 'Unknown Vendor',
        items: vendorItems,
        vendor_total_items: vendorTotalItems,
        vendor_subtotal: vendorSubtotal,
      });

      totalItems += vendorTotalItems;
      totalSubtotal += vendorSubtotal;
    }

    return {
      user_id: userId,
      vendors,
      total_items: totalItems,
      subtotal: totalSubtotal,
      total_amount: totalSubtotal, // No fees applied yet
      is_empty: false,
      vendor_count: vendors.length,
    };
  }

  async getCartByVendor(userId: string, vendorId: string, isActive: boolean = true): Promise<VendorCartResponseDto> {
    this.logger.log(`Fetching ${isActive ? 'active' : 'inactive'} cart items for user ${userId} from vendor ${vendorId}`);

    const cartItems = await this.cartRepository.getCartItemsByVendor(userId, vendorId, isActive);
    const summary = await this.cartRepository.getCartSummaryByVendor(userId, vendorId, isActive);

    const cartItemsResponse = cartItems.map(item => this.mapToCartItemResponse(item));

    // Get vendor name from first item or default
    const vendorName = cartItems.length > 0 
      ? cartItems[0]?.menu_item?.vendor?.business_name || 'Unknown Vendor'
      : 'Unknown Vendor';

    return {
      user_id: userId,
      vendor_id: vendorId,
      vendor_name: vendorName,
      items: cartItemsResponse,
      total_items: summary.total_items,
      subtotal: summary.subtotal,
      is_empty: summary.is_empty,
    };
  }

  async removeCartItems(userId: string, cartItemIds: string[]): Promise<void> {
    this.logger.log(`Removing cart items ${cartItemIds.join(', ')} for user ${userId}`);

    if (!cartItemIds || cartItemIds.length === 0) {
      return;
    }

    // Validate that all cart items belong to the user
    const cartItems = await this.cartRepository.findByCartItemIds(userId, cartItemIds);
    
    if (cartItems.length !== cartItemIds.length) {
      const foundIds = cartItems.map(item => item.id);
      const missingIds = cartItemIds.filter(id => !foundIds.includes(id));
      throw new NotFoundException(`Cart items not found: ${missingIds.join(', ')}`);
    }

    // Remove all cart items
    for (const cartItemId of cartItemIds) {
      await this.cartRepository.delete(cartItemId);
    }

    this.logger.log(`Successfully removed ${cartItemIds.length} cart items`);
  }
} 