import { Injectable } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CartItem, MenuItem, Vendor, Category } from 'src/entities';

@Injectable()
export class CartRepository {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
  ) {}

  async create(cartItem: Partial<CartItem>): Promise<CartItem> {
    const newCartItem = this.cartItemRepository.create(cartItem);
    return await this.cartItemRepository.save(newCartItem);
  }

  async findById(id: string): Promise<CartItem | null> {
    return await this.cartItemRepository.findOne({
      where: { id },
      relations: ['menu_item', 'menu_item.vendor', 'menu_item.category'],
    });
  }

  async findByUserAndMenuItem(userId: string, menuItemId: string): Promise<CartItem | null> {
    return await this.cartItemRepository.findOne({
      where: { user_id: userId, menu_item_id: menuItemId},
      relations: ['menu_item', 'menu_item.vendor', 'menu_item.category'],
    });
  }

  async findByUserId(userId: string): Promise<CartItem[]> {
    return await this.cartItemRepository.find({
      where: { user_id: userId },
      relations: ['menu_item', 'menu_item.vendor', 'menu_item.category'],
      order: { created_at: 'ASC' },
    });
  }

  async findActiveByUserId(userId: string): Promise<CartItem[]> {
    return await this.cartItemRepository.find({
      where: { user_id: userId, is_active: true },
      relations: ['menu_item', 'menu_item.vendor', 'menu_item.category'],
      order: { created_at: 'ASC' },
    });
  }

  async update(id: string, updateData: Partial<CartItem>): Promise<CartItem | null> {
    await this.cartItemRepository.update(id, updateData);
    return await this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.cartItemRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  async deactivate(id: string): Promise<boolean> {
    const result = await this.cartItemRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  async clearUserCart(userId: string): Promise<number> {
    const result = await this.cartItemRepository.delete({ user_id: userId });
    return result.affected || 0;
  }

  async removeItem(userId: string, menuItemId: string): Promise<boolean> {
    const result = await this.cartItemRepository.delete({
      user_id: userId,
      menu_item_id: menuItemId
    });
    return (result.affected || 0) > 0;
  }

  async updateQuantity(id: string, quantity: number): Promise<CartItem | null> {
    const cartItem = await this.findById(id);
    if (!cartItem) return null;

    cartItem.updateQuantity(quantity);
    return await this.cartItemRepository.save(cartItem);
  }

  async getCartSummary(userId: string): Promise<{
    total_items: number;
    subtotal: number;
    vendor_count: number;
    is_empty: boolean;
  }> {
    const cartItems = await this.findActiveByUserId(userId);
    
    if (cartItems.length === 0) {
      return {
        total_items: 0,
        subtotal: 0,
        vendor_count: 0,
        is_empty: true,
      };
    }

    const total_items = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cartItems.reduce((sum, item) => sum + item.total_price, 0);
    const vendor_count = new Set(cartItems.map(item => item.menu_item.vendor_id)).size;

    return {
      total_items,
      subtotal,
      vendor_count,
      is_empty: false,
    };
  }

  async validateCartItems(userId: string): Promise<{
    valid_items: CartItem[];
    invalid_items: CartItem[];
    errors: string[];
  }> {
    const cartItems = await this.findActiveByUserId(userId);
    const valid_items: CartItem[] = [];
    const invalid_items: CartItem[] = [];
    const errors: string[] = [];

    for (const cartItem of cartItems) {
      const menuItem = cartItem.menu_item;
      
      // Check if menu item still exists and is available
      if (!menuItem || !menuItem.is_available) {
        invalid_items.push(cartItem);
        errors.push(`Menu item "${menuItem?.name || 'Unknown'}" is no longer available`);
        continue;
      }

      // Check if price has changed
      if (menuItem.price !== cartItem.unit_price) {
        cartItem.unit_price = menuItem.price;
        cartItem.calculateTotal();
        await this.cartItemRepository.save(cartItem);
      }

      // Check if quantity is within limits
      if (cartItem.quantity < 1 || cartItem.quantity > 99) {
        invalid_items.push(cartItem);
        errors.push(`Invalid quantity for "${menuItem.name}"`);
        continue;
      }

      valid_items.push(cartItem);
    }

    return { valid_items, invalid_items, errors };
  }

  async getCartWithDetails(userId: string): Promise<CartItem[]> {
    return await this.cartItemRepository
      .createQueryBuilder('cart_item')
      .leftJoinAndSelect('cart_item.menu_item', 'menu_item')
      .leftJoinAndSelect('menu_item.vendor', 'vendor')
      .leftJoinAndSelect('menu_item.category', 'category')
      .where('cart_item.user_id = :userId', { userId })
      .andWhere('cart_item.is_active = :isActive', { isActive: true })
      .orderBy('cart_item.created_at', 'ASC')
      .getMany();
  }
} 