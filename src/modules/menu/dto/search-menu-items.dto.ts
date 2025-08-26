import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsBoolean, Min, Max, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export enum SortBy {
  NAME = 'name',
  PRICE = 'price',
  CREATED_AT = 'created_at',
  DISTANCE = 'distance'
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC'
}

export class SearchMenuItemsDto {
  @ApiPropertyOptional({ description: 'Search query for menu item name or description' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Category ID to filter by' })
  @IsOptional()
  @IsString()
  category_id?: string;

  @ApiPropertyOptional({ description: 'Vendor ID to filter by' })
  @IsOptional()
  @IsString()
  vendor_id?: string;

  @ApiPropertyOptional({ description: 'Minimum price filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  min_price?: number;

  @ApiPropertyOptional({ description: 'Maximum price filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  max_price?: number;

  @ApiPropertyOptional({ description: 'Filter by availability status' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  is_available?: boolean;

  @ApiPropertyOptional({ 
    description: 'Sort by field. Note: When coordinates are provided, distance sorting takes priority',
    enum: SortBy
  })
  @IsOptional()
  @IsEnum(SortBy)
  sort_by?: SortBy;

  @ApiPropertyOptional({ 
    description: 'Sort order. Note: Distance sorting is always ASC (nearest first)',
    enum: SortOrder,
    default: SortOrder.DESC
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sort_order?: SortOrder;

  @ApiPropertyOptional({ description: 'Page number for pagination', minimum: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @ApiPropertyOptional({ description: 'Number of items per page', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @ApiPropertyOptional({ 
    description: 'Customer latitude for proximity-based sorting and filtering. When provided with longitude, results will be sorted by distance from this location.',
    example: 6.5244
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  latitude?: number;

  @ApiPropertyOptional({ 
    description: 'Customer longitude for proximity-based sorting and filtering. When provided with latitude, results will be sorted by distance from this location.',
    example: 3.3792
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  longitude?: number;

  @ApiPropertyOptional({ 
    description: 'Maximum delivery distance in kilometers. Only vendors within this distance will be included in results.',
    default: 10,
    minimum: 0,
    maximum: 50,
    example: 5
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  @Transform(({ value }) => parseFloat(value))
  max_distance?: number;

  @ApiPropertyOptional({ 
    description: 'Whether to prioritize distance-based sorting over other sort criteria when coordinates are provided',
    default: true,
    example: true
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  prioritize_distance?: boolean;
} 