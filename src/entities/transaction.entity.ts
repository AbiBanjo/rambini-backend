import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsEnum, IsOptional, IsNumber, IsString, IsDateString, IsJSON, Min } from 'class-validator';
import { BaseEntity } from './base.entity';

export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  COMMISSION = 'COMMISSION',
  PAYOUT = 'PAYOUT',
  REFUND = 'REFUND',
  REVERSAL = 'REVERSAL',
  FEE = 'FEE',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

@Entity('transactions')
@Index(['wallet_id', 'transaction_type'])
@Index(['status', 'created_at'])
@Index(['reference_id'])
export class Transaction extends BaseEntity {
  @Column({ type: 'varchar' })
  @IsString()
  wallet_id: string;

  @Column({ type: 'enum', enum: TransactionType })
  @IsEnum(TransactionType)
  transaction_type: TransactionType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  @IsNumber()
  @Min(0)
  amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  @IsNumber()
  @Min(0)
  balance_before: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  @IsNumber()
  @Min(0)
  balance_after: number;

  @Column({ type: 'text' })
  @IsString()
  description: string;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  reference_id?: string;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  external_reference?: string;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  @IsEnum(TransactionStatus)
  status: TransactionStatus;

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
  reversed_at?: Date;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  reversal_reason?: string;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @IsJSON()
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne('Wallet', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: any;

  // Virtual properties
  get is_credit(): boolean {
    return this.transaction_type === TransactionType.CREDIT;
  }

  get is_debit(): boolean {
    return this.transaction_type === TransactionType.DEBIT;
  }

  get is_completed(): boolean {
    return this.status === TransactionStatus.COMPLETED;
  }

  get is_pending(): boolean {
    return this.status === TransactionStatus.PENDING;
  }

  get is_failed(): boolean {
    return this.status === TransactionStatus.FAILED;
  }

  get is_reversed(): boolean {
    return this.status === TransactionStatus.REVERSED;
  }

  get is_system_transaction(): boolean {
    return [TransactionType.COMMISSION, TransactionType.FEE].includes(this.transaction_type);
  }

  // Methods
  process(): void {
    this.status = TransactionStatus.COMPLETED;
    this.processed_at = new Date();
  }

  fail(reason: string): void {
    this.status = TransactionStatus.FAILED;
    this.failure_reason = reason;
  }

  reverse(reason: string): void {
    this.status = TransactionStatus.REVERSED;
    this.reversal_reason = reason;
    this.reversed_at = new Date();
  }

  updateBalances(before: number, after: number): void {
    this.balance_before = before;
    this.balance_after = after;
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

  isReferenceMatch(reference: string): boolean {
    return this.reference_id === reference || this.external_reference === reference;
  }
} 