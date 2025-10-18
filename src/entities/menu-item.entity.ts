import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
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

  // add is preOrder has boolean default false
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  is_preOrder: boolean;

  // add prep time in string which can be 15m, 30m, 45m, 1h, 1h30m, 2h, 2h30m, 3h 
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  prep_time?: string;

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

//  convert prep time string to preparation time in minutes on save or update
@BeforeInsert()
@BeforeUpdate()
convertPrepTimeToPreparationAmount(): void {
  if (this.prep_time) {
    this.preparation_time_minutes = this.convertPrepTimeToNumber(this.prep_time);
  }
}


convertPrepTimeToNumber(prepTimeString: string): number {
  let totalMinutes = 0;
  
  if (prepTimeString.includes('h')) {
    const hoursPart = prepTimeString.split('h')[0];
    totalMinutes += parseInt(hoursPart) * 60;
    
    if (prepTimeString.includes('m')) {
      const minutesPart = prepTimeString.split('h')[1].split('m')[0];
      totalMinutes += parseInt(minutesPart);
    }
  } else if (prepTimeString.includes('m')) {

    const minutesPart = prepTimeString.split('m')[0];
    totalMinutes += parseInt(minutesPart);
  }
  
  return totalMinutes;
}

} 