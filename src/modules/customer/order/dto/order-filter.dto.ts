import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { OrderStatus, OrderType, PaymentStatus } from 'src/entities';

export class OrderFilterDto {
  @ApiPropertyOptional({ description: 'Filter by order status', enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  order_status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Filter by order type', enum: OrderType })
  @IsOptional()
  @IsEnum(OrderType)
  order_type?: OrderType;

  @ApiPropertyOptional({ description: 'Filter by payment status', enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  payment_status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Filter by vendor ID' })
  @IsOptional()
  @IsString()
  vendor_id?: string;

  @ApiPropertyOptional({ description: 'Filter by customer ID' })
  @IsOptional()
  @IsString()
  customer_id?: string;

  @ApiPropertyOptional({ description: 'Search by order number' })
  @IsOptional()
  @IsString()
  order_number?: string;

  @ApiPropertyOptional({ description: 'Filter orders from this date' })
  @IsOptional()
  @IsDateString()
  from_date?: string;

  @ApiPropertyOptional({ description: 'Filter orders until this date' })
  @IsOptional()
  @IsDateString()
  to_date?: string;

  @ApiPropertyOptional({ description: 'Minimum order amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  min_amount?: number;

  @ApiPropertyOptional({ description: 'Maximum order amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  max_amount?: number;

  @ApiPropertyOptional({ description: 'Sort by field', enum: ['created_at', 'total_amount', 'order_number'] })
  @IsOptional()
  @IsString()
  sort_by?: 'created_at' | 'total_amount' | 'order_number';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsString()
  sort_order?: 'ASC' | 'DESC';

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
} 