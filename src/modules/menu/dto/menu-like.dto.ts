import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { MenuItem } from 'src/entities';

export class LikeMenuItemDto {
  // No body needed - menu_item_id comes from route params
}

export class UnlikeMenuItemDto {
  // No body needed - menu_item_id comes from route params
}

// Use class instead of interface to ensure it exists at runtime for decorators
export class MenuItemWithLikeDto extends MenuItem {
  like_count: number;
  is_liked_by_user: boolean;
  distance?: number | null;
}

export class LikedMenuItemsQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number;
}

export class LikedMenuItemsResponseDto {
  @ApiProperty({
    description: 'Array of liked menu items',
    type: [MenuItemWithLikeDto],
  })
  items: MenuItemWithLikeDto[];

  @ApiProperty({
    description: 'Total number of liked menu items',
    example: 15,
  })
  total: number;

  @ApiProperty({
    description: 'Pagination metadata',
  })
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export class VendorMenuLikeStatsDto {
  @ApiProperty({
    description: 'Menu item ID',
    example: 'menu-item-123',
  })
  menu_item_id: string;

  @ApiProperty({
    description: 'Menu item name',
    example: 'Jollof Rice',
  })
  menu_item_name: string;

  @ApiProperty({
    description: 'Number of likes for this menu item',
    example: 42,
  })
  like_count: number;
}

export class VendorLikesSummaryDto {
  @ApiProperty({
    description: 'Total likes across all vendor menu items',
    example: 256,
  })
  total_likes: number;

  @ApiProperty({
    description: 'Detailed likes per menu item',
    type: [VendorMenuLikeStatsDto],
  })
  menu_items: VendorMenuLikeStatsDto[];

  @ApiProperty({
    description: 'Most liked menu items (top 10)',
    type: [VendorMenuLikeStatsDto],
  })
  most_liked: VendorMenuLikeStatsDto[];
}

export class ToggleLikeResponseDto {
  @ApiProperty({
    description: 'Whether the menu item is now liked',
    example: true,
  })
  is_liked: boolean;

  @ApiProperty({
    description: 'New like count for the menu item',
    example: 43,
  })
  like_count: number;

  @ApiProperty({
    description: 'Success message',
    example: 'Menu item liked successfully',
  })
  message: string;
}