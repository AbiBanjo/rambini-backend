// src/modules/coupon/dto/create-coupon.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsNumber, IsOptional, Min, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { CouponType } from 'src/entities/coupon.entity';

export class CreateCouponDto {
  @ApiProperty({ example: 'SAVE20', description: 'Unique coupon code' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: 'Get 20% off your order', description: 'Coupon description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CouponType, example: CouponType.PERCENTAGE, description: 'Type of discount' })
  @IsEnum(CouponType)
  type: CouponType;

  @ApiProperty({ example: 20, description: 'Discount value (percentage or fixed amount)' })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiPropertyOptional({ example: 1000, description: 'Minimum order amount to apply coupon' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_order_amount?: number;

  @ApiPropertyOptional({ example: 500, description: 'Maximum discount amount for percentage coupons' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_discount_amount?: number;

  @ApiPropertyOptional({ example: 100, description: 'Total usage limit' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usage_limit?: number;

  @ApiPropertyOptional({ example: 1, description: 'Usage limit per user', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usage_limit_per_user?: number;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'Start date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  start_date?: Date;

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59Z', description: 'End date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  end_date?: Date;

  @ApiPropertyOptional({ example: 'vendor-uuid', description: 'Vendor ID (null for platform-wide)' })
  @IsOptional()
  @IsString()
  vendor_id?: string;
}