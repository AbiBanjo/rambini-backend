import {
  Entity,
  Column,
  OneToMany,
  OneToOne,
  Index,
} from 'typeorm';
import { IsEmail, IsPhoneNumber, IsEnum, IsOptional, IsBoolean, IsDateString, IsString } from 'class-validator';
import { BaseEntity } from './base.entity';
import { Address } from './address.entity';
import { Vendor } from './vendor.entity';
import { Wallet } from './wallet.entity';
import { Notification, NotificationDelivery } from './notification.entity';
import { DeviceToken, DevicePlatform } from './device-token.entity';
import { UserNotificationPreference } from './user-notification-preference.entity';

export enum UserType {
  CUSTOMER = 'CUSTOMER',
  VENDOR = 'VENDOR',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

@Entity('users')
@Index(['phone_number'], { unique: true })
@Index(['email'], { unique: true })
@Index(['user_type', 'status'])
@Index(['created_at'])
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 20, unique: true, comment: 'E.164 format' })
  @IsPhoneNumber('NG')
  phone_number: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  first_name?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  last_name?: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Column({ type: 'varchar', length: 2, nullable: true, comment: 'ISO 3166-1 alpha-2 country code' })
  @IsOptional()
  @IsString()
  country?: string;

  @Column({ type: 'enum', enum: UserType, default: UserType.CUSTOMER })
  @IsEnum(UserType)
  user_type: UserType;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  @IsEnum(UserStatus)
  status: UserStatus;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  is_phone_verified: boolean;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  profile_completed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  email_verified_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  phone_verified_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  last_active_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  deletion_requested_at?: Date;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  image_url?: string;

  // Timestamps are inherited from BaseEntity

  // Relationships
  @OneToMany(() => Address, (address) => address.user)
  addresses: Address[];

  @OneToOne(() => Vendor, (vendor) => vendor.user)
  vendor_profile?: Vendor;

  @OneToOne(() => Wallet, (wallet) => wallet.user)
  wallet?: Wallet;

  // Notification System Relationships
  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => DeviceToken, (deviceToken) => deviceToken.user)
  device_tokens: DeviceToken[];

  @OneToMany(() => UserNotificationPreference, (preference) => preference.user)
  notification_preferences: UserNotificationPreference[];

  // Virtual properties
  get full_name(): string {
    if (this.first_name && this.last_name) {
      return `${this.first_name} ${this.last_name}`;
    }
    return this.first_name || this.last_name || 'Unknown User';
  }

  get is_verified(): boolean {
    return this.is_phone_verified;
  }

  get is_active(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  get is_customer(): boolean {
    return this.user_type === UserType.CUSTOMER;
  }

  get is_vendor(): boolean {
    return this.user_type === UserType.VENDOR;
  }

  get is_admin(): boolean {
    return this.user_type === UserType.ADMIN;
  }

  // Methods
  markPhoneVerified(): void {
    this.is_phone_verified = true;
    this.phone_verified_at = new Date();
  }

  markEmailVerified(): void {
    this.email_verified_at = new Date();
  }

  updateLastActive(): void {
    this.last_active_at = new Date();
  }

  completeProfile(): void {
    this.profile_completed = true;
  }

  suspend(): void {
    this.status = UserStatus.SUSPENDED;
  }

  activate(): void {
    this.status = UserStatus.ACTIVE;
  }

  delete(): void {
    this.status = UserStatus.DELETED;
  }

  requestDeletion(): void {
    this.status = UserStatus.DELETED;
    this.deletion_requested_at = new Date();
  }

  canBeReactivated(): boolean {
    if (!this.deletion_requested_at || this.status !== UserStatus.DELETED) {
      return false;
    }
    
    const daysSinceDeletion = Math.floor(
      (new Date().getTime() - new Date(this.deletion_requested_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return daysSinceDeletion <= 30;
  }

  reactivate(): void {
    if (this.canBeReactivated()) {
      this.status = UserStatus.ACTIVE;
      this.deletion_requested_at = null;
    }
  }

  isPermanentlyDeletable(): boolean {
    if (!this.deletion_requested_at || this.status !== UserStatus.DELETED) {
      return false;
    }
    
    const daysSinceDeletion = Math.floor(
      (new Date().getTime() - new Date(this.deletion_requested_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return daysSinceDeletion > 30;
  }

  // Notification System Methods
  getActiveDeviceTokens(): DeviceToken[] {
    return this.device_tokens?.filter(token => token.is_valid) || [];
  }

  getPushEnabledDeviceTokens(): DeviceToken[] {
    return this.device_tokens?.filter(token => 
      token.is_valid && token.platform !== DevicePlatform.WEB
    ) || [];
  }

  getNotificationPreference(type: string): UserNotificationPreference | undefined {
    return this.notification_preferences?.find(pref => pref.notification_type === type);
  }

  canReceiveNotification(type: string, channel: NotificationDelivery): boolean {
    const preference = this.getNotificationPreference(type);
    if (!preference) return true; // Default to enabled if no preference set
    
    switch (channel) {
      case NotificationDelivery.IN_APP:
        return preference.in_app_enabled;
      case NotificationDelivery.PUSH:
        return preference.push_enabled;
      case NotificationDelivery.SMS:
        return preference.sms_enabled;
      case NotificationDelivery.EMAIL:
        return preference.email_enabled;
      default:
        return false;
    }
  }

  getUnreadNotificationCount(): number {
    return this.notifications?.filter(notification => !notification.is_read).length || 0;
  }

  getRecentNotifications(limit: number = 10): Notification[] {
    return this.notifications
      ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit) || [];
  }
} 