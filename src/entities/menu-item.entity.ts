import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { IsEnum, IsOptional, IsBoolean, IsNumber, IsString, Min, Max, IsUrl, IsJSON } from 'class-validator';
import { BaseEntity } from './base.entity';

export enum DietaryInfo {
  VEGETARIAN = 'VEGETARIAN',
  VEGAN = 'VEGAN',
  GLUTEN_FREE = 'GLUTEN_FREE',
  DAIRY_FREE = 'DAIRY_FREE',
  NUT_FREE = 'NUT_FREE',
  HALAL = 'HALAL',
  KOSHER = 'KOSHER',
}

@Entity('menu_items')
@Index(['vendor_id', 'is_available'])
@Index(['category_id', 'is_available'])
@Index(['is_featured', 'is_available'])
// @Index(['rating_average'], { order: 'DESC' })
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

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @IsNumber()
  @Min(0)
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost_price?: number;

  @Column({ type: 'int', default: 15 })
  @IsNumber()
  @Min(1)
  @Max(480)
  preparation_time_minutes: number;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsUrl()
  image_url?: string;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @IsJSON()
  images?: string[];

  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  is_available: boolean;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  is_featured: boolean;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @IsJSON()
  dietary_info?: DietaryInfo[];

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  ingredients?: string;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @IsJSON()
  nutritional_info?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  allergen_info?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString()
  portion_size?: string;

  @Column({ type: 'int', default: 0 })
  @IsNumber()
  sort_order: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  @IsNumber()
  @Min(0)
  @Max(5)
  rating_average: number;

  @Column({ type: 'int', default: 0 })
  @IsNumber()
  @Min(0)
  total_ratings: number;

  @Column({ type: 'int', default: 0 })
  @IsNumber()
  @Min(0)
  total_orders: number;

  // Relationships
  @ManyToOne('Vendor', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: any;

  @ManyToOne('Category', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: any;

  // Virtual properties
  get is_popular(): boolean {
    return this.total_orders > 10;
  }

  get is_highly_rated(): boolean {
    return this.rating_average >= 4.0;
  }

  // Methods
  updateRating(newRating: number): void {
    const totalRating = this.rating_average * this.total_ratings + newRating;
    this.total_ratings += 1;
    this.rating_average = totalRating / this.total_ratings;
  }

  incrementOrderCount(): void {
    this.total_orders += 1;
  }

  toggleAvailability(): void {
    this.is_available = !this.is_available;
  }

  toggleFeatured(): void {
    this.is_featured = !this.is_featured;
  }
} 