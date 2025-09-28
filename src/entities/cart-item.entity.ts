import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { IsString, IsNumber, Min, Max } from 'class-validator';
import { BaseEntity } from './base.entity';
import { MenuItem } from './menu-item.entity';
import { Vendor } from './vendor.entity';

@Entity('cart_items')
export class CartItem extends BaseEntity {
  @Column({ type: 'varchar' })
  @IsString()
  user_id: string;

  @Column({ type: 'varchar' })
  @IsString()
  menu_item_id: string;

  @Column({ type: 'varchar' })
  @IsString()
  vendor_id: string;

  @Column({ type: 'int' })
  @IsNumber()
  @Min(1)
  @Max(99)
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  @IsNumber()
  @Min(0)
  unit_price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  @IsNumber()
  @Min(0)
  total_price: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  // Relationships
  @ManyToOne(() => MenuItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_item_id' })
  menu_item: MenuItem;

  @ManyToOne(() => Vendor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  // total price can be calculated automatically 
  @BeforeInsert()
  calculateTotalPrice() {
    this.total_price = Number(this.unit_price) * Number(this.quantity);
  }

  @BeforeUpdate()
  calculateTotalPriceOnUpdate() {
    this.total_price = Number(this.unit_price) * Number(this.quantity);
  }

  // Computed properties
  get canUpdateQuantity(): boolean {
    return this.quantity > 0;
  }

  get isOutOfStock(): boolean {
    return !this.menu_item?.is_available;
  }

  updateQuantity(newQuantity: number): void {
    this.quantity = newQuantity;
    this.calculateTotal();
  }

  calculateTotal(): void {
    this.total_price = Number(this.unit_price )* Number(this.quantity);
  }
} 