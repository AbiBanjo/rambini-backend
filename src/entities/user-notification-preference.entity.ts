import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsEnum, IsBoolean, IsString } from 'class-validator';
import { BaseEntity } from './base.entity';
import { NotificationType } from './notification.entity';

@Entity('user_notification_preferences')
@Index(['user_id', 'notification_type'], { unique: true })
export class UserNotificationPreference extends BaseEntity {
  @Column({ type: 'varchar' })
  @IsString()
  user_id: string;

  @Column({ type: 'enum', enum: NotificationType })
  @IsEnum(NotificationType)
  notification_type: NotificationType;

  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  in_app_enabled: boolean;

  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  push_enabled: boolean;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  sms_enabled: boolean;

  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  email_enabled: boolean;

  // Relationships
  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: any;

  // Virtual properties
  get has_enabled_channels(): boolean {
    return this.in_app_enabled || this.push_enabled || this.sms_enabled || this.email_enabled;
  }

  get enabled_channels(): string[] {
    const channels: string[] = [];
    if (this.in_app_enabled) channels.push('in_app');
    if (this.push_enabled) channels.push('push');
    if (this.sms_enabled) channels.push('sms');
    if (this.email_enabled) channels.push('email');
    return channels;
  }

  get disabled_channels(): string[] {
    const channels: string[] = [];
    if (!this.in_app_enabled) channels.push('in_app');
    if (!this.push_enabled) channels.push('push');
    if (!this.sms_enabled) channels.push('sms');
    if (!this.email_enabled) channels.push('email');
    return channels;
  }

  // Methods
  enableChannel(channel: 'in_app' | 'push' | 'sms' | 'email'): void {
    switch (channel) {
      case 'in_app':
        this.in_app_enabled = true;
        break;
      case 'push':
        this.push_enabled = true;
        break;
      case 'sms':
        this.sms_enabled = true;
        break;
      case 'email':
        this.email_enabled = true;
        break;
    }
  }

  disableChannel(channel: 'in_app' | 'push' | 'sms' | 'email'): void {
    switch (channel) {
      case 'in_app':
        this.in_app_enabled = false;
        break;
      case 'push':
        this.push_enabled = false;
        break;
      case 'sms':
        this.sms_enabled = false;
        break;
      case 'email':
        this.email_enabled = false;
        break;
    }
  }

  enableAllChannels(): void {
    this.in_app_enabled = true;
    this.push_enabled = true;
    this.sms_enabled = true;
    this.email_enabled = true;
  }

  disableAllChannels(): void {
    this.in_app_enabled = false;
    this.push_enabled = false;
    this.sms_enabled = false;
    this.email_enabled = false;
  }

  isChannelEnabled(channel: 'in_app' | 'push' | 'sms' | 'email'): boolean {
    switch (channel) {
      case 'in_app':
        return this.in_app_enabled;
      case 'push':
        return this.push_enabled;
      case 'sms':
        return this.sms_enabled;
      case 'email':
        return this.email_enabled;
      default:
        return false;
    }
  }

  toggleChannel(channel: 'in_app' | 'push' | 'sms' | 'email'): void {
    if (this.isChannelEnabled(channel)) {
      this.disableChannel(channel);
    } else {
      this.enableChannel(channel);
    }
  }

  getPreferredChannels(): string[] {
    // Return channels in order of preference
    const channels: string[] = [];
    
    // Push notifications are most immediate
    if (this.push_enabled) channels.push('push');
    
    // In-app notifications for user engagement
    if (this.in_app_enabled) channels.push('in_app');
    
    // Email for important notifications
    if (this.email_enabled) channels.push('email');
    
    // SMS as fallback
    if (this.sms_enabled) channels.push('sms');
    
    return channels;
  }

  // Preference Management Methods
  hasAnyChannelEnabled(): boolean {
    return this.has_enabled_channels;
  }

  getChannelCount(): number {
    return this.enabled_channels.length;
  }

  isFullyEnabled(): boolean {
    return this.in_app_enabled && this.push_enabled && this.sms_enabled && this.email_enabled;
  }

  isFullyDisabled(): boolean {
    return !this.in_app_enabled && !this.push_enabled && !this.sms_enabled && !this.email_enabled;
  }

  getChannelStatus(channel: 'in_app' | 'push' | 'sms' | 'email'): { enabled: boolean; channel: string } {
    return {
      enabled: this.isChannelEnabled(channel),
      channel
    };
  }

  clone(): UserNotificationPreference {
    const clone = new UserNotificationPreference();
    clone.user_id = this.user_id;
    clone.notification_type = this.notification_type;
    clone.in_app_enabled = this.in_app_enabled;
    clone.push_enabled = this.push_enabled;
    clone.sms_enabled = this.sms_enabled;
    clone.email_enabled = this.email_enabled;
    return clone;
  }
} 