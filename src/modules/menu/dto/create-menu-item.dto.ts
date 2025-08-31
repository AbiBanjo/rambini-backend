import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

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

  @ApiPropertyOptional({ description: 'Preparation time in minutes', minimum: 1, maximum: 480, default: 15 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(480)
  @Transform(({ value }) => parseInt(value))
  preparation_time_minutes?: number;

  @ApiPropertyOptional({ description: 'Whether the item is available for ordering', default: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  is_available?: boolean;
} 