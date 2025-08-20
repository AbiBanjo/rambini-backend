import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DietaryInfo } from 'src/entities';

export class MenuItemResponseDto {
  @ApiProperty({ description: 'Unique identifier for the menu item' })
  id: string;

  @ApiProperty({ description: 'Vendor ID who owns this menu item' })
  vendor_id: string;

  @ApiProperty({ description: 'Category ID this item belongs to' })
  category_id: string;

  @ApiProperty({ description: 'Name of the menu item' })
  name: string;

  @ApiPropertyOptional({ description: 'Description of the menu item' })
  description?: string;

  @ApiProperty({ description: 'Price of the menu item' })
  price: number;

  @ApiPropertyOptional({ description: 'Cost price of the menu item' })
  cost_price?: number;

  @ApiProperty({ description: 'Preparation time in minutes' })
  preparation_time_minutes: number;

  @ApiPropertyOptional({ description: 'Main image URL for the menu item' })
  image_url?: string;

  @ApiPropertyOptional({ description: 'Array of additional image URLs' })
  images?: string[];

  @ApiProperty({ description: 'Whether the item is available for ordering' })
  is_available: boolean;

  @ApiProperty({ description: 'Whether the item should be featured' })
  is_featured: boolean;

  @ApiPropertyOptional({ description: 'Dietary information tags' })
  dietary_info?: DietaryInfo[];

  @ApiPropertyOptional({ description: 'List of ingredients' })
  ingredients?: string;

  @ApiPropertyOptional({ description: 'Nutritional information' })
  nutritional_info?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Allergen information' })
  allergen_info?: string;

  @ApiPropertyOptional({ description: 'Portion size description' })
  portion_size?: string;

  @ApiProperty({ description: 'Sort order for display' })
  sort_order: number;

  @ApiProperty({ description: 'Average rating of the menu item' })
  rating_average: number;

  @ApiProperty({ description: 'Total number of ratings' })
  total_ratings: number;

  @ApiProperty({ description: 'Total number of orders' })
  total_orders: number;

  @ApiProperty({ description: 'When the item was created' })
  created_at: Date;

  @ApiProperty({ description: 'When the item was last updated' })
  updated_at: Date;

  // Vendor information
  @ApiPropertyOptional({ description: 'Vendor business name' })
  vendor_name?: string;

  @ApiPropertyOptional({ description: 'Vendor business logo' })
  vendor_logo?: string;

  // Category information
  @ApiPropertyOptional({ description: 'Category name' })
  category_name?: string;
} 