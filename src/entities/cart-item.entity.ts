import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsString, IsNumber, IsOptional, Min, Max, IsJSON } from 'class-validator';
import { BaseEntity } from './base.entity';
import { MenuItem } from './menu-item.entity';

@Entity('cart_items')
@Index(['user_id', 'menu_item_id'], { unique: true })
export class CartItem extends BaseEntity {
  @Column({ type: 'varchar' })
  @IsString()
  user_id: string;

  @Column({ type: 'varchar' })
  @IsString()
  menu_item_id: string;

  @Column({ type: 'int' })
  @IsNumber()
  @Min(1)
  @Max(99)
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @IsNumber()
  @Min(0)
  unit_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @IsNumber()
  @Min(0)
  total_price: number;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  special_instructions?: string;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @IsJSON()
  customizations?: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  // Relationships
  @ManyToOne('MenuItem', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_item_id' })
  menu_item: MenuItem;

  // Computed properties
  get canUpdateQuantity(): boolean {
    return this.is_active && this.quantity > 0;
  }

  get isOutOfStock(): boolean {
    return !this.menu_item?.is_available;
  }

  updateQuantity(newQuantity: number): void {
    if (newQuantity < 1 || newQuantity > 99) {
      throw new Error('Quantity must be between 1 and 99');
    }
    this.quantity = newQuantity;
    this.calculateTotal();
  }

  calculateTotal(): void {
    this.total_price = this.unit_price * this.quantity;
  }

  addSpecialInstructions(instructions: string): void {
    this.special_instructions = instructions;
  }

  addCustomization(key: string, value: any): void {
    if (!this.customizations) {
      this.customizations = {};
    }
    this.customizations[key] = value;
  }

  removeCustomization(key: string): void {
    if (this.customizations) {
      delete this.customizations[key];
    }
  }

  deactivate(): void {
    this.is_active = false;
  }

  activate(): void {
    this.is_active = true;
  }
} 