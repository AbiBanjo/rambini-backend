import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsEnum, IsOptional, IsBoolean, IsNumber, IsString, Min } from 'class-validator';
import { BaseEntity } from './base.entity';

export enum Currency {
  NGN = 'NGN',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

@Entity('wallets')
@Index(['user_id'], { unique: true })
@Index(['balance'])
export class Wallet extends BaseEntity {
  @Column({ type: 'varchar' })
  @IsString()
  user_id: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0.0 })
  @IsNumber()
  @Min(0)
  balance: number;

  @Column({ type: 'enum', enum: Currency, default: Currency.NGN })
  @IsEnum(Currency)
  currency: Currency;

  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  is_active: boolean;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 1000000.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  daily_limit?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 10000000.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthly_limit?: number;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  last_transaction_at?: Date;

  // Relationships
  @OneToOne('User')
  @JoinColumn({ name: 'user_id' })
  user: any;

  // Virtual properties
  get is_balance_sufficient(): boolean {
    return this.balance > 0;
  }

  get formatted_balance(): string {
    return `${this.currency} ${this.balance.toFixed(2)}`;
  }

  // Methods
  credit(amount: number): void {
    if (amount > 0) {
      this.balance += amount;
      this.last_transaction_at = new Date();
    }
  }

  debit(amount: number): boolean {
    if (amount > 0 && this.balance >= amount) {
      this.balance -= amount;
      this.last_transaction_at = new Date();
      return true;
    }
    return false;
  }

  can_transact(amount: number): boolean {
    return this.is_active && this.balance >= amount;
  }

  updateLimits(daily?: number, monthly?: number): void {
    if (daily !== undefined && daily >= 0) {
      this.daily_limit = daily;
    }
    if (monthly !== undefined && monthly >= 0) {
      this.monthly_limit = monthly;
    }
  }
} 