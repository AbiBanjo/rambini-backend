import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsOptional, IsNumber, IsString, IsJSON, Min } from 'class-validator';
import { BaseEntity } from './base.entity';
import { Order } from './order.entity';
import { MenuItem } from './menu-item.entity';

@Entity('order_items')
@Index(['order_id'])
@Index(['menu_item_id'])
export class OrderItem extends BaseEntity {
  @Column({ type: 'varchar' })
  @IsString()
  order_id: string;

  @Column({ type: 'varchar' })
  @IsString()
  menu_item_id: string;

  @Column({ type: 'int' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  @IsNumber()
  @Min(0)
  unit_price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  @IsNumber()
  @Min(0)
  total_price: number;


  // Relationships
  @ManyToOne(() => Order, order => order.order_items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => MenuItem, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'menu_item_id' })
  menu_item: MenuItem;

 
  // Methods
  calculateTotal(): void {
    this.total_price = this.unit_price * this.quantity;
  }

  updateQuantity(newQuantity: number): void {
    this.quantity = newQuantity;
    this.calculateTotal();
  }

  updateUnitPrice(newPrice: number): void {
    this.unit_price = newPrice;
    this.calculateTotal();
  }

} 