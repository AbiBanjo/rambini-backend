import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiProperty({ description: 'Preparation time in minutes' })
  preparation_time_minutes: number;

  @ApiPropertyOptional({ description: 'Image URL for the menu item' })
  image_url?: string;

  @ApiProperty({ description: 'Whether the item is available for ordering' })
  is_available: boolean;

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