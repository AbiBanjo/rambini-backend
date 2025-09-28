import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsString, IsOptional, IsBoolean, IsNumber, IsUrl, Min, Max } from 'class-validator';
import { BaseEntity } from './base.entity';

@Entity('menu_items')
@Index(['vendor_id', 'is_available'])
@Index(['category_id', 'is_available'])
export class MenuItem extends BaseEntity {
  @Column({ type: 'varchar' })
  @IsString()
  vendor_id: string;

  @Column({ type: 'varchar' })
  @IsString()
  category_id: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  name: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  @IsNumber()
  @Min(0)
  price: number;

  @Column({ type: 'int', default: 15 })
  @IsNumber()
  @Min(1)
  @Max(480)
  preparation_time_minutes: number;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsUrl()
  image_url?: string;

  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  is_available: boolean;

  // Relationships
  @ManyToOne('Vendor', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: any;

  @ManyToOne('Category', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: any;

  // Methods
  toggleAvailability(): void {
    this.is_available = !this.is_available;
  }
} 