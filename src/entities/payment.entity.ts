import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsEnum, IsOptional, IsNumber, IsString, IsDateString, IsJSON, Min } from 'class-validator';
import { BaseEntity } from './base.entity';
import { PaymentMethod } from './order.entity';
import { Order } from './order.entity';
import { SavedCard } from './saved-card.entity';

export enum PaymentTransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum PaymentProvider {
  WALLET = 'WALLET',
  STRIPE = 'STRIPE',
  PAYSTACK = 'PAYSTACK',
  MERCURY = 'MERCURY',
  CARD = 'CARD',
}

@Entity('payments')
@Index(['order_id'], { unique: true })
@Index(['payment_reference'], { unique: true })
@Index(['status', 'created_at'])
@Index(['provider', 'status'])
export class Payment extends BaseEntity {
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  order_id?: string;

  @Column({ type: 'varchar', unique: true })
  @IsString()
  payment_reference: string;

  @Column({ type: 'enum', enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @Column({ type: 'enum', enum: PaymentTransactionStatus, default: PaymentTransactionStatus.PENDING })
  @IsEnum(PaymentTransactionStatus)
  status: PaymentTransactionStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  @IsNumber()
  @Min(0)
  amount: number;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  external_reference?: string;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  gateway_transaction_id?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  failure_reason?: string;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  processed_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  failed_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  refunded_at?: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  @IsNumber()
  @Min(0)
  refunded_amount: number;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  refund_reason?: string;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @IsJSON()
  gateway_response?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @IsJSON()
  metadata?: Record<string, any>;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  saved_card_id?: string;

  // Relationships
  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => SavedCard, { nullable: true })
  @JoinColumn({ name: 'saved_card_id' })
  saved_card?: SavedCard;

  // Virtual properties
  get is_pending(): boolean {
    return this.status === PaymentTransactionStatus.PENDING;
  }

  get is_processing(): boolean {
    return this.status === PaymentTransactionStatus.PROCESSING;
  }

  get is_completed(): boolean {
    return this.status === PaymentTransactionStatus.COMPLETED;
  }

  get is_failed(): boolean {
    return this.status === PaymentTransactionStatus.FAILED;
  }

  get is_cancelled(): boolean {
    return this.status === PaymentTransactionStatus.CANCELLED;
  }

  get is_refunded(): boolean {
    return this.status === PaymentTransactionStatus.REFUNDED;
  }

  get is_partially_refunded(): boolean {
    return this.status === PaymentTransactionStatus.PARTIALLY_REFUNDED;
  }

  get is_wallet_payment(): boolean {
    return this.payment_method === PaymentMethod.WALLET;
  }

  get is_external_payment(): boolean {
    return this.payment_method !== PaymentMethod.WALLET;
  }

  // Methods
  markAsProcessing(): void {
    this.status = PaymentTransactionStatus.PROCESSING;
  }

  markAsCompleted(gatewayTransactionId?: string, gatewayResponse?: Record<string, any>): void {
    this.status = PaymentTransactionStatus.COMPLETED;
    this.processed_at = new Date();
    if (gatewayTransactionId) {
      this.gateway_transaction_id = gatewayTransactionId;
    }
    if (gatewayResponse) {
      this.gateway_response = gatewayResponse;
    }
  }

  markAsFailed(reason: string, gatewayResponse?: Record<string, any>): void {
    this.status = PaymentTransactionStatus.FAILED;
    this.failure_reason = reason;
    this.failed_at = new Date();
    if (gatewayResponse) {
      this.gateway_response = gatewayResponse;
    }
  }

  markAsCancelled(reason?: string): void {
    this.status = PaymentTransactionStatus.CANCELLED;
    this.failed_at = new Date();
    if (reason) {
      this.failure_reason = reason;
    }
  }

  processRefund(amount: number, reason: string): void {
    if (amount > 0 && amount <= this.amount - this.refunded_amount) {
      this.refunded_amount += amount;
      
      if (this.refunded_amount >= this.amount) {
        this.status = PaymentTransactionStatus.REFUNDED;
        this.refunded_at = new Date();
      } else {
        this.status = PaymentTransactionStatus.PARTIALLY_REFUNDED;
      }
      
      this.refund_reason = reason;
    }
  }

  addMetadata(key: string, value: any): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata[key] = value;
  }

  getMetadataValue(key: string): any {
    return this.metadata?.[key];
  }
}
