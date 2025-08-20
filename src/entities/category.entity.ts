import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { IsEnum, IsOptional, IsBoolean, IsNumber, IsString, IsUrl, Min } from 'class-validator';
import { BaseEntity } from './base.entity';

@Entity('categories')
@Index(['name'], { unique: true })
@Index(['is_active'])
@Index(['sort_order'])
export class Category extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  @IsString()
  name: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsUrl()
  image_url?: string;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsUrl()
  icon_url?: string;

  @Column({ type: 'int', default: 0 })
  @IsNumber()
  @Min(0)
  sort_order: number;

  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  is_active: boolean;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  parent_category_id?: string;

  // Relationships
  @ManyToOne('Category', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_category_id' })
  parent_category?: Category;

  @OneToMany('Category', 'parent_category')
  sub_categories: Category[];

  @OneToMany('MenuItem', 'category')
  menu_items: any[];

  // Virtual properties
  get is_parent(): boolean {
    return !this.parent_category_id;
  }

  get is_child(): boolean {
    return !!this.parent_category_id;
  }

  get has_sub_categories(): boolean {
    return this.sub_categories && this.sub_categories.length > 0;
  }

  get has_menu_items(): boolean {
    return this.menu_items && this.menu_items.length > 0;
  }

  // Methods
  activate(): void {
    this.is_active = true;
  }

  deactivate(): void {
    this.is_active = false;
  }

  setParentCategory(parentId: string): void {
    this.parent_category_id = parentId;
  }

  removeParentCategory(): void {
    this.parent_category_id = null;
  }

  updateSortOrder(newOrder: number): void {
    this.sort_order = newOrder;
  }
} 