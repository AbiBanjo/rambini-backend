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

  @Column({ 
    type: 'decimal', 
    precision: 15, 
    scale: 2, 
    default: 0.0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value) || 0
    }
  })
  @IsNumber()
  @Min(0)
  balance: number;

  @Column({ 
    type: 'decimal', 
    precision: 15, 
    scale: 2, 
    default: 0.0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value) || 0
    }
  })
  @IsNumber()
  @Min(0)
  vendor_balance: number;

  @Column({ type: 'enum', enum: Currency, default: Currency.NGN })
  @IsEnum(Currency)
  currency: Currency;

  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  is_active: boolean;



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
      const currentBalance = Number(this.balance) || 0; // force numeric
      this.balance = currentBalance + Number(amount);
      this.last_transaction_at = new Date();
    }
  }

  creditVendor(amount: number): void {
    if (amount > 0) {
      const currentBalance = Number(this.vendor_balance) || 0; // force numeric
      this.vendor_balance = currentBalance + Number(amount);
      this.last_transaction_at = new Date();
    }
  }

  debit(amount: number): boolean {
    const currentBalance = Number(this.balance) || 0;
    if (amount > 0 && currentBalance >= amount) {
      this.balance = currentBalance - Number(amount);
      this.last_transaction_at = new Date();
      return true;
    }
    return false;
  }


  can_transact(amount: number): boolean {
    return this.is_active && this.balance >= amount;
  }

} 