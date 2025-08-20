import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsOptional, IsNumber, IsString, IsJSON, Min } from 'class-validator';
import { BaseEntity } from './base.entity';

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
  variants?: Record<string, any>;

  // Relationships
  @ManyToOne('Order', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: any;

  @ManyToOne('MenuItem', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'menu_item_id' })
  menu_item: any;

  // Virtual properties
  get has_variants(): boolean {
    return this.variants && Object.keys(this.variants).length > 0;
  }

  get has_special_instructions(): boolean {
    return !!this.special_instructions;
  }

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

  addSpecialInstructions(instructions: string): void {
    this.special_instructions = instructions;
  }

  addVariants(variants: Record<string, any>): void {
    this.variants = variants;
  }

  getVariantValue(variantName: string): any {
    return this.variants?.[variantName];
  }
} 