import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsEnum, IsOptional, IsString, IsNumber, Min, IsBoolean } from 'class-validator';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Currency } from './wallet.entity';

export enum WithdrawalStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
}

export enum RecipientType {
  INDIVIDUAL = 'INDIVIDUAL',
  CORPORATE = 'CORPORATE',
}

export enum AccountType {
  CHECKING = 'CHECKING',
  CURRENT = 'CURRENT',
  SAVINGS = 'SAVINGS',
}

export enum Country {
  NIGERIA = 'NG',
  UNITED_STATES = 'US',
  UNITED_KINGDOM = 'UK',
}

@Entity('withdrawals')
@Index(['user_id'])
@Index(['status'])
@Index(['created_at'])
export class Withdrawal extends BaseEntity {
  @Column({ type: 'varchar' })
  @IsString()
  user_id: string;

  @Column({ 
    type: 'decimal', 
    precision: 15, 
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value) || 0
    }
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @Column({ type: 'enum', enum: Currency })
  @IsEnum(Currency)
  currency: Currency;

  @Column({ type: 'enum', enum: Country })
  @IsEnum(Country)
  country: Country;

  @Column({ type: 'enum', enum: WithdrawalStatus, default: WithdrawalStatus.PENDING })
  @IsEnum(WithdrawalStatus)
  status: WithdrawalStatus;

  @Column({ type: 'decimal', 
    precision: 15, 
    scale: 2, 
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value) || 0
    }
  })
  @IsNumber()
  @Min(0)
  fee: number;

  // Common bank details
  @Column({ type: 'varchar', length: 255 })
  @IsString()
  bank_name: string;

  @Column({ type: 'varchar', length: 50 })
  @IsString()
  account_number: string;

  // Nigeria specific fields
  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  account_name?: string; // For Nigeria

  // US specific fields
  @Column({ type: 'enum', enum: RecipientType, nullable: true })
  @IsOptional()
  @IsEnum(RecipientType)
  recipient_type?: RecipientType;

  @Column({ type: 'varchar', length: 20, nullable: true })
  @IsOptional()
  @IsString()
  routing_number?: string; // For US

  @Column({ type: 'enum', enum: AccountType, nullable: true })
  @IsOptional()
  @IsEnum(AccountType)
  account_type?: AccountType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  recipient_address?: string; // For US

  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString()
  recipient_city?: string; // For US

  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString()
  recipient_state?: string; // For US

  @Column({ type: 'varchar', length: 20, nullable: true })
  @IsOptional()
  @IsString()
  recipient_zip_code?: string; // For US

  // UK specific fields
  @Column({ type: 'varchar', length: 20, nullable: true })
  @IsOptional()
  @IsString()
  sort_code?: string; // For UK

  // Processing fields
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  admin_notes?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  transaction_reference?: string;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  processed_at?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  processed_by?: string; // Admin user ID

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  is_otp_verified: boolean;

  // Relationships
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Virtual properties
  get net_amount(): number {
    return this.amount - this.fee;
  }

  get formatted_amount(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }

  get formatted_net_amount(): string {
    return `${this.currency} ${this.net_amount.toFixed(2)}`;
  }

  get is_pending(): boolean {
    return this.status === WithdrawalStatus.PENDING;
  }

  get is_processing(): boolean {
    return this.status === WithdrawalStatus.PROCESSING;
  }

  get is_completed(): boolean {
    return this.status === WithdrawalStatus.COMPLETED;
  }

  get is_failed(): boolean {
    return this.status === WithdrawalStatus.FAILED;
  }

  get is_rejected(): boolean {
    return this.status === WithdrawalStatus.REJECTED;
  }

  get is_final_status(): boolean {
    return [WithdrawalStatus.COMPLETED, WithdrawalStatus.FAILED, WithdrawalStatus.REJECTED].includes(this.status);
  }

  // Methods
  markAsProcessing(adminId: string): void {
    this.status = WithdrawalStatus.PROCESSING;
    this.processed_by = adminId;
  }

  markAsCompleted(adminId: string, transactionRef?: string, notes?: string): void {
    this.status = WithdrawalStatus.COMPLETED;
    this.processed_by = adminId;
    this.processed_at = new Date();
    this.transaction_reference = transactionRef;
    if (notes) this.admin_notes = notes;
  }

  markAsFailed(adminId: string, reason?: string): void {
    this.status = WithdrawalStatus.FAILED;
    this.processed_by = adminId;
    this.processed_at = new Date();
    if (reason) this.admin_notes = reason;
  }

  markAsRejected(adminId: string, reason?: string): void {
    this.status = WithdrawalStatus.REJECTED;
    this.processed_by = adminId;
    this.processed_at = new Date();
    if (reason) this.admin_notes = reason;
  }

  verifyOTP(): void {
    this.is_otp_verified = true;
  }

  getBankDetailsForCountry(): Record<string, any> {
    const baseDetails = {
      bank_name: this.bank_name,
      account_number: this.account_number,
    };

    switch (this.country) {
      case Country.NIGERIA:
        return {
          ...baseDetails,
          account_name: this.account_name,
        };
      case Country.UNITED_STATES:
        return {
          ...baseDetails,
          recipient_type: this.recipient_type,
          routing_number: this.routing_number,
          account_type: this.account_type,
          recipient_address: this.recipient_address,
          recipient_city: this.recipient_city,
          recipient_state: this.recipient_state,
          recipient_zip_code: this.recipient_zip_code,
        };
      case Country.UNITED_KINGDOM:
        return {
          ...baseDetails,
          recipient_type: this.recipient_type,
          sort_code: this.sort_code,
        };
      default:
        return baseDetails;
    }
  }
}
