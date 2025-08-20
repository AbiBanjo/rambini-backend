import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsEnum, IsOptional, IsBoolean, IsNumber, IsString, Min, Max } from 'class-validator';
import { BaseEntity } from './base.entity';

export enum AddressType {
  HOME = 'HOME',
  WORK = 'WORK',
  OTHER = 'OTHER',
  VENDOR = 'VENDOR',
}

@Entity('addresses')
@Index(['user_id'])
@Index(['user_id', 'is_default'], { unique: true })
@Index(['latitude', 'longitude'])
export class Address extends BaseEntity {
  @Column({ type: 'varchar' })
  @IsString()
  user_id: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  address_line_1: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  address_line_2?: string;

  @Column({ type: 'varchar', length: 100 })
  @IsString()
  city: string;

  @Column({ type: 'varchar', length: 100 })
  @IsString()
  state: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  @IsOptional()
  @IsString()
  postal_code?: string;

  @Column({ type: 'varchar', length: 2, default: 'NG' })
  @IsString()
  country: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  is_default: boolean;

  @Column({ type: 'enum', enum: AddressType, default: AddressType.HOME })
  @IsEnum(AddressType)
  address_type: AddressType;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  delivery_instructions?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  landmark?: string;

  // Relationships
  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: any;

  // Virtual properties
  get full_address(): string {
    const parts = [
      this.address_line_1,
      this.address_line_2,
      this.city,
      this.state,
      this.postal_code,
      this.country
    ].filter(Boolean);
    return parts.join(', ');
  }

  // Methods
  setAsDefault(): void {
    this.is_default = true;
  }

  getCoordinates(): { latitude: number; longitude: number } | null {
    if (this.latitude && this.longitude) {
      return { latitude: this.latitude, longitude: this.longitude };
    }
    return null;
  }
} 