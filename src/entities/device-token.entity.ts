import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsEnum, IsOptional, IsBoolean, IsString, IsUrl } from 'class-validator';
import { BaseEntity } from './base.entity';

export enum DevicePlatform {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
  WEB = 'WEB',
  DESKTOP = 'DESKTOP',
}

export enum TokenStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

@Entity('device_tokens')
@Index(['user_id', 'is_active'])
@Index(['token'], { unique: true })
@Index(['platform', 'is_active'])
export class DeviceToken extends BaseEntity {
  @Column({ type: 'varchar' })
  @IsString()
  user_id: string;

  @Column({ type: 'varchar', length: 500 })
  @IsString()
  token: string;

  @Column({ type: 'enum', enum: DevicePlatform })
  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString()
  device_id?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString()
  device_model?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @IsOptional()
  @IsString()
  app_version?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @IsOptional()
  @IsString()
  os_version?: string;

  @Column({ type: 'enum', enum: TokenStatus, default: TokenStatus.ACTIVE })
  @IsEnum(TokenStatus)
  token_status: TokenStatus;

  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  is_active: boolean;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  last_used_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  expires_at?: Date;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: any;

  // Virtual properties
  get is_expired(): boolean {
    if (!this.expires_at) return false;
    return new Date() > this.expires_at;
  }

  get is_valid(): boolean {
    return this.is_active && this.token_status === TokenStatus.ACTIVE && !this.is_expired;
  }

  // Methods
  markAsUsed(): void {
    this.last_used_at = new Date();
  }

  deactivate(): void {
    this.is_active = false;
    this.token_status = TokenStatus.REVOKED;
  }

  refreshToken(newToken: string): void {
    this.token = newToken;
    this.token_status = TokenStatus.ACTIVE;
    this.is_active = true;
    this.last_used_at = new Date();
  }

  setExpiration(expiresAt: Date): void {
    this.expires_at = expiresAt;
  }

  // Device Management Methods
  isPlatform(platform: DevicePlatform): boolean {
    return this.platform === platform;
  }

  isMobile(): boolean {
    return this.platform === DevicePlatform.ANDROID || this.platform === DevicePlatform.IOS;
  }

  isWeb(): boolean {
    return this.platform === DevicePlatform.WEB || this.platform === DevicePlatform.DESKTOP;
  }

  needsRefresh(): boolean {
    if (!this.expires_at) return false;
    const now = new Date();
    const timeUntilExpiry = this.expires_at.getTime() - now.getTime();
    return timeUntilExpiry < 24 * 60 * 60 * 1000; // Less than 24 hours
  }

  getDaysUntilExpiry(): number {
    if (!this.expires_at) return Infinity;
    const now = new Date();
    const timeUntilExpiry = this.expires_at.getTime() - now.getTime();
    return Math.ceil(timeUntilExpiry / (24 * 60 * 60 * 1000));
  }
} 