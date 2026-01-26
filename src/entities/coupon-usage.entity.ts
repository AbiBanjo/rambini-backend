// src/entities/coupon-usage.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Coupon } from './coupon.entity';

@Entity('coupon_usage')
export class CouponUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  coupon_id: string;

  @Column()
  user_id: string;

  @Column({ nullable: true })
  order_id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  discount_amount: number;

  @CreateDateColumn()
  used_at: Date;

  @ManyToOne(() => Coupon)
  @JoinColumn({ name: 'coupon_id' })
  coupon: Coupon;
}