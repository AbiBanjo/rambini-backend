import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { OrderStatus } from 'src/entities';

export class UpdateOrderStatusDto {
  @ApiProperty({ description: 'New order status', enum: OrderStatus })
  @IsEnum(OrderStatus)
  order_status: OrderStatus;

  @ApiPropertyOptional({ description: 'Reason for status change (especially for cancellations)' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Estimated preparation time in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(480)
  estimated_prep_time_minutes?: number;

  @ApiPropertyOptional({ description: 'Estimated delivery time' })
  @IsOptional()
  @IsDateString()
  estimated_delivery_time?: Date;

  @ApiPropertyOptional({ description: 'Vendor notes about the status change' })
  @IsOptional()
  @IsString()
  vendor_notes?: string;

  @ApiPropertyOptional({ description: 'Customer rating (1-5)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  customer_rating?: number;

  @ApiPropertyOptional({ description: 'Customer review' })
  @IsOptional()
  @IsString()
  customer_review?: string;
} 