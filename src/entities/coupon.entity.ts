// src/entities/coupon.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Vendor } from './vendor.entity';

export enum CouponType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
}

export enum CouponStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: CouponType,
  })
  type: CouponType;

  @Column('decimal', { precision: 10, scale: 2 })
  value: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  min_order_amount: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  max_discount_amount: number;

  @Column({ nullable: true })
  usage_limit: number;

  @Column({ default: 0 })
  usage_count: number;

  @Column({ default: 1 })
  usage_limit_per_user: number;

  @Column({ type: 'timestamp', nullable: true })
  start_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  end_date: Date;

  @Column({
    type: 'enum',
    enum: CouponStatus,
    default: CouponStatus.ACTIVE,
  })
  status: CouponStatus;

  @Column({ nullable: true })
  vendor_id: string;

  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Helper methods
  isValid(): boolean {
    if (this.status !== CouponStatus.ACTIVE) return false;

    const now = new Date();
    if (this.start_date && now < new Date(this.start_date)) return false;
    if (this.end_date && now > new Date(this.end_date)) return false;
    if (this.usage_limit && this.usage_count >= this.usage_limit) return false;

    return true;
  }

  canBeUsedBy(userId: string, userUsageCount: number): boolean {
    return userUsageCount < this.usage_limit_per_user;
  }

  calculateDiscount(subtotal: number): number {
    let discount = 0;

    if (this.type === CouponType.PERCENTAGE) {
      discount = (subtotal * this.value) / 100;
      if (this.max_discount_amount) {
        discount = Math.min(discount, this.max_discount_amount);
      }
    } else {
      discount = this.value;
    }

    return Math.min(discount, subtotal);
  }
}