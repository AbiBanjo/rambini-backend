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

  // ✅ NEW: Include inactive vendors (for admin only)
  @ApiPropertyOptional({ 
    description: 'Include inactive vendors in results. When false or not set, only active vendors are returned. Typically used by admin endpoints.',
    default: false,
    example: true
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  include_inactive?: boolean;

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
    description: 'Customer latitude for proximity-based sorting and filtering. When provided with longitude, results will be sorted by distance from this location. This can be from a saved address or newly entered address.',
    example: 6.5244
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  latitude?: number;

  @ApiPropertyOptional({ 
    description: 'Customer longitude for proximity-based sorting and filtering. When provided with latitude, results will be sorted by distance from this location. This can be from a saved address or newly entered address.',
    example: 3.3792
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  longitude?: number;

  @ApiPropertyOptional({ 
    description: 'Address ID to use for proximity-based search. When provided, the coordinates from this saved address will be used for distance calculation. Alternative to providing latitude/longitude directly.',
    example: 'address-123'
  })
  @IsOptional()
  @IsString()
  address_id?: string;

  @ApiPropertyOptional({ 
    description: 'Maximum delivery distance in kilometers. Only vendors within this distance will be included in results. Default is 10km for most food delivery scenarios.',
    default: 10,
    minimum: 0.5,
    maximum: 50,
    example: 5
  })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(50)
  @Transform(({ value }) => parseFloat(value))
  max_distance?: number;

  @ApiPropertyOptional({ 
    description: 'Whether to prioritize distance-based sorting over other sort criteria when coordinates are provided. When true, results are always sorted from closest to farthest.',
    default: true,
    example: true
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  prioritize_distance?: boolean;

  @ApiPropertyOptional({ 
    description: 'Include only vendors that offer delivery to the specified location. When true, filters out vendors that may be too far or don\'t deliver to the area.',
    default: true,
    example: true
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  delivery_only?: boolean;
}