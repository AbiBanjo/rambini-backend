import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Order } from './order.entity';
import { Payment } from './payment.entity';

export enum RefundRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSED = 'PROCESSED',
}

@Entity('refund_requests')
export class RequestRefund extends BaseEntity {
  @Column()
  order_id: string;

  @Column()
  payment_id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  requested_amount: number;

  @Column({
    type: 'enum',
    enum: RefundRequestStatus,
    default: RefundRequestStatus.PENDING,
  })
  status: RefundRequestStatus;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ type: 'text', nullable: true })
  admin_comment?: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;
}
