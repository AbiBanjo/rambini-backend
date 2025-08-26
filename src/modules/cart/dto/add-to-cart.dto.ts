import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsJSON, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class AddToCartDto {
  @ApiProperty({ description: 'Menu item ID to add to cart' })
  @IsString()
  menu_item_id: string;

  @ApiProperty({ description: 'Quantity to add', minimum: 1, maximum: 99, default: 1 })
  @IsNumber()
  @Min(1)
  @Max(99)
  @Transform(({ value }) => parseInt(value))
  quantity: number;

} 