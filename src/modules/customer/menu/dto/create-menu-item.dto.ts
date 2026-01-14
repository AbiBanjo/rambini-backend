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

  @IsString()
  @IsOptional()
  prep_time: string

  @ApiPropertyOptional({ description: 'Whether the item is available for ordering', default: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  is_available?: boolean;

  // is_preOrder has boolean default false
  @ApiPropertyOptional({ description: 'Whether the item is a pre-order', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  is_preOrder?: boolean;
} 