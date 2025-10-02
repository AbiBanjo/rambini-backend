import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsJSON, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateCartItemDto {
  @ApiPropertyOptional({ description: 'New quantity', minimum: 1, maximum: 99 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(99)
  @Transform(({ value }) => parseInt(value))
  quantity?: number;

  @ApiPropertyOptional({ description: 'Special instructions for this item' })
  @IsOptional()
  @IsString()
  special_instructions?: string;

  @ApiPropertyOptional({ description: 'Customizations as JSON object' })
  @IsOptional()
  @IsJSON()
  customizations?: Record<string, any>;


  @ApiPropertyOptional({ description: 'Order ID' })
  @IsOptional()
  @IsString()
  order_id?: string;
} 