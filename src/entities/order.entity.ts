import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { IsEnum, IsOptional, IsBoolean, IsNumber, IsString, IsDateString, Min, Max } from 'class-validator';
import { BaseEntity } from './base.entity';
import { DeliveryProvider } from './delivery.entity';
import { Currency } from './wallet.entity';
import { User } from './user.entity';
import { Vendor } from './vendor.entity';
import { Address } from './address.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  NEW = 'NEW',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum OrderType {
  DELIVERY = 'DELIVERY',
  PICKUP = 'PICKUP',
}

export enum PaymentMethod {
  WALLET = 'WALLET',
  STRIPE = 'STRIPE',
  PAYSTACK = 'PAYSTACK',
  MERCURY = 'MERCURY',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

@Entity('orders')
@Index(['order_number'], { unique: true })
@Index(['customer_id', 'order_status'])
@Index(['vendor_id', 'order_status'])
@Index(['order_status', 'created_at'])
@Index(['payment_status', 'created_at'])
export class Order extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  @IsString()
  order_number: string;

  @Column({ type: 'varchar' })
  @IsString()
  customer_id: string;

  @Column({ type: 'varchar' })
  @IsString()
  vendor_id: string;

  @Column({ type: 'varchar', nullable: true })
  @IsString()
  @IsOptional()
  delivery_address_id?: string;

  @Column({ type: 'enum', enum: DeliveryProvider, nullable: true })
  @IsEnum(DeliveryProvider)
  delivery_provider?: DeliveryProvider

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.NEW })
  @IsEnum(OrderStatus)
  order_status: OrderStatus;

  @Column({ type: 'enum', enum: OrderType, default: OrderType.DELIVERY })
  @IsEnum(OrderType)
  order_type: OrderType;

  @Column({ type: 'enum', enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  @IsEnum(PaymentStatus)
  payment_status: PaymentStatus;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  payment_reference?: string;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  payment_provider?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  @IsNumber()
  @Min(0)
  delivery_fee: number;


  @Column({ type: 'decimal', precision: 12, scale: 2 })
  @IsNumber()
  @Min(0)
  total_amount: number;

  @Column({ type: 'enum', enum: Currency, default: Currency.NGN })
  @IsEnum(Currency)
  currency: Currency;

  @Column({ type: 'int', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(480)
  estimated_prep_time_minutes?: number;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  estimated_delivery_time?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  order_ready_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  delivered_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  cancelled_at?: Date;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  cancellation_reason?: string;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  cancelled_by?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  special_instructions?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  delivery_notes?: string;

  @Column({ type: 'int', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  customer_rating?: number;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  customer_review?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  vendor_notes?: string;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @ManyToOne(() => Vendor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @ManyToOne(() => Address, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'delivery_address_id' })
  delivery_address: Address;

  @OneToMany(() => OrderItem, orderItem => orderItem.order)
  order_items: OrderItem[];

  // Virtual properties
  get is_paid(): boolean {
    return this.payment_status === PaymentStatus.PAID;
  }

  get is_cancelled(): boolean {
    return this.order_status === OrderStatus.CANCELLED;
  }

  get is_delivered(): boolean {
    return this.order_status === OrderStatus.DELIVERED;
  }

  get is_preparing(): boolean {
    return this.order_status === OrderStatus.PREPARING;
  }

  get is_ready(): boolean {
    return this.order_status === OrderStatus.READY;
  }

  get can_be_cancelled(): boolean {
    return [OrderStatus.NEW, OrderStatus.CONFIRMED].includes(this.order_status);
  }

  get can_be_rated(): boolean {
    return this.order_status === OrderStatus.DELIVERED && !this.customer_rating;
  }

  // Methods
  confirm(): void {
    this.order_status = OrderStatus.CONFIRMED;
  }

  startPreparing(): void {
    this.order_status = OrderStatus.PREPARING;
  }

  markAsReady(): void {
    this.order_status = OrderStatus.READY;
    this.order_ready_at = new Date();
  }

  startDelivery(): void {
    this.order_status = OrderStatus.OUT_FOR_DELIVERY;
  }

  markAsDelivered(): void {
    this.order_status = OrderStatus.DELIVERED;
    this.delivered_at = new Date();
  }

  cancel(reason: string, cancelledBy: string): void {
    this.order_status = OrderStatus.CANCELLED;
    this.cancellation_reason = reason;
    this.cancelled_by = cancelledBy;
    this.cancelled_at = new Date();
  }

  markAsPaid(reference: string, provider: string): void {
    this.payment_status = PaymentStatus.PAID;
    this.payment_reference = reference;
    this.payment_provider = provider;
  }

  addCustomerReview(rating: number, review: string): void {
    this.customer_rating = rating;
    this.customer_review = review;
  }
} 