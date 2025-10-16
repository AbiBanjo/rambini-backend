import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum PaymentGateway {
  STRIPE = 'stripe',
  PAYSTACK = 'paystack',
}

@Entity('saved_cards')
export class SavedCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'enum', enum: PaymentGateway })
  gateway: PaymentGateway;

  // Stripe fields
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripe_customer_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  stripe_payment_method_id: string;

  // Paystack fields
  @Column({ type: 'varchar', length: 255, nullable: true })
  paystack_customer_code: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  paystack_authorization_code: string;

  // Common card details
  @Column({ type: 'varchar', length: 4 })
  card_last4: string;

  @Column({ type: 'varchar', length: 50 })
  card_brand: string;

  @Column({ type: 'int' })
  exp_month: number;

  @Column({ type: 'int' })
  exp_year: number;

  @Column({ type: 'varchar', length: 2, nullable: true })
  country: string;

  @Column({ type: 'boolean', default: false })
  is_default: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_used_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Helper methods
  isExpired(): boolean {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    return this.exp_year < currentYear || (this.exp_year === currentYear && this.exp_month < currentMonth);
  }

  get maskedNumber(): string {
    return `**** **** **** ${this.card_last4}`;
  }

  get displayName(): string {
    return `${this.card_brand.toUpperCase()} ${this.maskedNumber}`;
  }

  isStripe(): boolean {
    return this.gateway === PaymentGateway.STRIPE;
  }

  isPaystack(): boolean {
    return this.gateway === PaymentGateway.PAYSTACK;
  }

  markAsUsed(): void {
    this.last_used_at = new Date();
  }
}
