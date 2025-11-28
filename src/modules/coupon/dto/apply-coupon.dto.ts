// src/modules/coupon/dto/apply-coupon.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ApplyCouponDto {
  @ApiProperty({ example: 'SAVE20', description: 'Coupon code to apply' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: 'vendor-uuid', description: 'Vendor ID for vendor-specific coupons' })
  @IsOptional()
  @IsString()
  vendor_id?: string;
}