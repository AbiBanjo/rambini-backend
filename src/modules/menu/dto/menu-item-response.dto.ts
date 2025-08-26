import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Category } from 'src/entities/category.entity';
import { Vendor } from 'src/entities/vendor.entity';

export class MenuItemResponseDto {
  @ApiProperty({ description: 'Unique identifier for the menu item' })
  id: string;

  @ApiProperty({ description: 'Name of the menu item' })
  name: string;

  @ApiProperty({ description: 'Description of the menu item' })
  description: string;

  @ApiProperty({ description: 'Price of the menu item' })
  price: number;

  @ApiPropertyOptional({ description: 'Preparation time in minutes' })
  preparation_time_minutes?: number;

  @ApiPropertyOptional({ description: 'Image URL for the menu item' })
  image_url?: string;

  @ApiProperty({ description: 'Whether the menu item is currently available' })
  is_available: boolean;

  @ApiProperty({ description: 'Category ID of the menu item' })
  category_id: string;

  @ApiProperty({ description: 'Vendor ID of the menu item' })
  vendor_id: string;

  @ApiProperty({ description: 'Category information' })
  category: Category;

  @ApiProperty({ description: 'Vendor information' })
  vendor: Vendor;

  @ApiProperty({ description: 'When the menu item was created' })
  created_at: Date;

  @ApiProperty({ description: 'When the menu item was last updated' })
  updated_at: Date;

  @ApiPropertyOptional({ 
    description: 'Distance from customer location in kilometers (only included when coordinates are provided in search)',
    example: 2.5
  })
  distance?: number;

  @ApiPropertyOptional({ description: 'Vendor business name' })
  vendor_name?: string;

  @ApiPropertyOptional({ description: 'Vendor business logo' })
  vendor_logo?: string;

  @ApiPropertyOptional({ description: 'Category name' })
  category_name?: string;
} 