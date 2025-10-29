import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsEnum, IsOptional, IsBoolean, IsString, IsJSON, IsDateString } from 'class-validator';
import { BaseEntity } from './base.entity';

export enum NotificationType {
  ORDER_UPDATE = 'ORDER_UPDATE',
  PAYMENT = 'PAYMENT',
  PROMOTION = 'PROMOTION',
  SYSTEM = 'SYSTEM',
  VENDOR_APPLICATION = 'VENDOR_APPLICATION',
  SECURITY_ALERT = 'SECURITY_ALERT',
  WALLET_UPDATE = 'WALLET_UPDATE',
  REVIEW_REQUEST = 'REVIEW_REQUEST',
  NEWS = 'NEWS',
  ADMIN_BROADCAST = 'ADMIN_BROADCAST',
  VENDOR_ANNOUNCEMENT = 'VENDOR_ANNOUNCEMENT',
  CUSTOMER_ANNOUNCEMENT = 'CUSTOMER_ANNOUNCEMENT',
  WITHDRAWAL_OTP = 'WITHDRAWAL_OTP',
  WITHDRAWAL_REQUEST = 'WITHDRAWAL_REQUEST',
  WITHDRAWAL_COMPLETED = 'WITHDRAWAL_COMPLETED',
  WITHDRAWAL_FAILED = 'WITHDRAWAL_FAILED',
  WITHDRAWAL_REJECTED = 'WITHDRAWAL_REJECTED',
  ADMIN_WITHDRAWAL_REQUEST = 'ADMIN_WITHDRAWAL_REQUEST',
  VENDOR_PROFILE_CREATED = 'VENDOR_PROFILE_CREATED',
}

export enum NotificationDelivery {
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

@Entity('notifications')
@Index(['user_id', 'is_read'])
@Index(['notification_type', 'created_at'])
@Index(['delivery_status'])
@Index(['priority'])
export class Notification extends BaseEntity {
  @Column({ type: 'varchar' })
  @IsString()
  user_id: string;

  @Column({ type: 'enum', enum: NotificationType })
  @IsEnum(NotificationType)
  notification_type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  title: string;

  @Column({ type: 'text' })
  @IsString()
  message: string;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @IsJSON()
  data?: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  is_read: boolean;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  read_at?: Date;

  @Column({ type: 'enum', enum: NotificationDelivery, default: NotificationDelivery.IN_APP })
  @IsEnum(NotificationDelivery)
  delivery_method: NotificationDelivery;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  scheduled_for?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  sent_at?: Date;

  @Column({ type: 'enum', enum: DeliveryStatus, default: DeliveryStatus.PENDING })
  @IsEnum(DeliveryStatus)
  delivery_status: DeliveryStatus;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  failure_reason?: string;

  @Column({ type: 'enum', enum: NotificationPriority, default: NotificationPriority.NORMAL })
  @IsEnum(NotificationPriority)
  priority: NotificationPriority;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  expires_at?: Date;

  @Column({ type: 'int', default: 0 })
  @IsOptional()
  retry_count?: number;

  // Relationships
  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: any;

  // Virtual properties
  get is_scheduled(): boolean {
    return !!this.scheduled_for && this.scheduled_for > new Date();
  }

  get is_expired(): boolean {
    return this.expires_at ? this.expires_at < new Date() : false;
  }

  get is_delivered(): boolean {
    return this.delivery_status === DeliveryStatus.DELIVERED;
  }

  get is_failed(): boolean {
    return this.delivery_status === DeliveryStatus.FAILED;
  }

  get is_urgent(): boolean {
    return this.priority === NotificationPriority.URGENT;
  }

  get is_high_priority(): boolean {
    return [NotificationPriority.HIGH, NotificationPriority.URGENT].includes(this.priority);
  }

  get can_be_retried(): boolean {
    return this.delivery_status === DeliveryStatus.FAILED;
  }

  // Methods
  markAsRead(): void {
    this.is_read = true;
    this.read_at = new Date();
  }

  markAsUnread(): void {
    this.is_read = false;
    this.read_at = null;
  }

  markAsSent(): void {
    this.delivery_status = DeliveryStatus.SENT;
    this.sent_at = new Date();
  }

  markAsDelivered(): void {
    this.delivery_status = DeliveryStatus.DELIVERED;
  }

  markAsFailed(reason: string): void {
    this.delivery_status = DeliveryStatus.FAILED;
    this.failure_reason = reason;
  }

  scheduleFor(date: Date): void {
    this.scheduled_for = date;
  }

  setExpiry(date: Date): void {
    this.expires_at = date;
  }

  addData(key: string, value: any): void {
    if (!this.data) {
      this.data = {};
    }
    this.data[key] = value;
  }

  getDataValue(key: string): any {
    return this.data?.[key];
  }

  setPriority(priority: NotificationPriority): void {
    this.priority = priority;
  }

  isType(type: NotificationType): boolean {
    return this.notification_type === type;
  }

  // Notification Delivery Methods
  canDeliverToChannel(channel: NotificationDelivery): boolean {
    return this.delivery_method === channel;
  }

  isHighPriority(): boolean {
    return this.priority === NotificationPriority.HIGH || this.priority === NotificationPriority.URGENT;
  }

  shouldRetry(): boolean {
    return this.delivery_status === DeliveryStatus.FAILED && this.can_be_retried;
  }

  getRetryDelay(): number {
    // Exponential backoff for retries
    const baseDelay = 1000; // 1 second
    const maxDelay = 300000; // 5 minutes
    const attemptCount = this.retry_count || 0;
    return Math.min(baseDelay * Math.pow(2, attemptCount), maxDelay);
  }

  incrementRetryCount(): void {
    this.retry_count = (this.retry_count || 0) + 1;
  }

  resetRetryCount(): void {
    this.retry_count = 0;
  }
} 