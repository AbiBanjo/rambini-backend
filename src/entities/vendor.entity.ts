import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { BaseEntity } from './base.entity';
import { Address } from './address.entity';
import { User } from './user.entity';
import { MenuItem } from './menu-item.entity';

@Entity('vendors')
export class Vendor extends BaseEntity {
  @Column({ type: 'varchar' })
  @IsString()
  user_id: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  business_name: string;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  address_id?: string;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  certificate_number?: string;

  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  is_active: boolean;

  // Relationships
  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => MenuItem, menu => menu.vendor)
  menu: MenuItem[];

  @ManyToOne(() => Address, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'address_id' })
  address?: Address;

  // ✅ Virtual properties to expose user contact info
  get phone_number(): string | null {
    return this.user?.phone_number || null;
  }

  get email(): string | null {
    return this.user?.email || null;
  }

  get profile_image_url(): string | null {
    return this.user?.image_url || null;  
  }

  get full_name(): string | null {
    return this.user?.full_name || null;
  }

  // Methods
  approve(): void {
    this.is_active = true;
  }

  reject(): void {
    this.is_active = false;
  }

  activate(): void {
    this.is_active = true;
  }
}