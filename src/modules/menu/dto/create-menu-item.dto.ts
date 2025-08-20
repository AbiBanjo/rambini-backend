import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, IsUrl, Min, Max, IsEnum, IsJSON } from 'class-validator';
import { Transform } from 'class-transformer';
import { DietaryInfo } from 'src/entities';

export class CreateMenuItemDto {
  @ApiProperty({ description: 'Category ID this item belongs to' })
  @IsString()
  category_id: string;

  @ApiProperty({ description: 'Name of the menu item' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the menu item' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Price of the menu item', minimum: 0 })
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  price: number;

  @ApiPropertyOptional({ description: 'Cost price of the menu item', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  cost_price?: number;

  @ApiPropertyOptional({ description: 'Preparation time in minutes', minimum: 1, maximum: 480, default: 15 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(480)
  @Transform(({ value }) => parseInt(value))
  preparation_time_minutes?: number;

  @ApiPropertyOptional({ description: 'Main image URL for the menu item' })
  @IsOptional()
  @IsUrl()
  image_url?: string;

  @ApiPropertyOptional({ description: 'Array of additional image URLs' })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Whether the item is available for ordering', default: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  is_available?: boolean;

  @ApiPropertyOptional({ description: 'Whether the item should be featured', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  is_featured?: boolean;

  @ApiPropertyOptional({ description: 'Dietary information tags' })
  @IsOptional()
  @IsArray()
  @IsEnum(DietaryInfo, { each: true })
  dietary_info?: DietaryInfo[];

  @ApiPropertyOptional({ description: 'List of ingredients' })
  @IsOptional()
  @IsString()
  ingredients?: string;

  @ApiPropertyOptional({ description: 'Nutritional information as JSON' })
  @IsOptional()
  @IsJSON()
  nutritional_info?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Allergen information' })
  @IsOptional()
  @IsString()
  allergen_info?: string;

  @ApiPropertyOptional({ description: 'Portion size description' })
  @IsOptional()
  @IsString()
  portion_size?: string;

  @ApiPropertyOptional({ description: 'Sort order for display', default: 0 })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  sort_order?: number;
} 