// src/modules/coupon/dto/coupon-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponType, CouponStatus } from 'src/entities/coupon.entity';

export class CouponResponseDto {
  @ApiProperty({ description: 'Coupon ID' })
  id: string;

  @ApiProperty({ description: 'Coupon code' })
  code: string;

  @ApiProperty({ description: 'Coupon description' })
  description: string;

  @ApiProperty({ enum: CouponType, description: 'Coupon type (percentage or fixed_amount)' })
  type: CouponType;

  @ApiProperty({ description: 'Discount value' })
  value: number;

  @ApiPropertyOptional({ description: 'Minimum order amount required' })
  min_order_amount?: number;

  @ApiPropertyOptional({ description: 'Maximum discount amount (for percentage coupons)' })
  max_discount_amount?: number;

  @ApiPropertyOptional({ description: 'Total usage limit' })
  usage_limit?: number;

  @ApiProperty({ description: 'Current usage count' })
  usage_count: number;

  @ApiProperty({ description: 'Usage limit per user' })
  usage_limit_per_user: number;

  @ApiPropertyOptional({ description: 'Coupon start date' })
  start_date?: Date;

  @ApiPropertyOptional({ description: 'Coupon end date' })
  end_date?: Date;

  @ApiProperty({ enum: CouponStatus, description: 'Coupon status (active/inactive/expired)' })
  status: CouponStatus;

  @ApiPropertyOptional({ description: 'Vendor ID (null for platform-wide coupons)' })
  vendor_id?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  created_at: Date;
}