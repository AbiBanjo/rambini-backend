// src/modules/coupon/services/coupon.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { CouponRepository } from '../repositories/coupon.repository';
import { CreateCouponDto, CouponResponseDto } from '../dto';
import { Coupon, CouponType, CouponStatus } from 'src/entities/coupon.entity';

@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name);

  constructor(
    private readonly couponRepository: CouponRepository,
  ) {}

  async createCoupon(createDto: CreateCouponDto): Promise<CouponResponseDto> {
    this.logger.log(`Creating coupon with code: ${createDto.code}`);

    // Check if coupon code already exists
    const existing = await this.couponRepository.findByCode(createDto.code);
    if (existing) {
      throw new BadRequestException('Coupon code already exists');
    }

    // Validate percentage value
    if (createDto.type === CouponType.PERCENTAGE && createDto.value > 100) {
      throw new BadRequestException('Percentage value cannot exceed 100');
    }

    const coupon = await this.couponRepository.create({
      ...createDto,
      code: createDto.code.toUpperCase(),
    } as Partial<Coupon>);

    return this.mapToResponse(coupon);
  }

  async validateCoupon(
    code: string,
    userId: string,
    subtotal: number,
    vendorId?: string
  ): Promise<{
    valid: boolean;
    coupon?: Coupon;
    discount_amount?: number;
    error?: string;
  }> {
    this.logger.log(`Validating coupon ${code} for user ${userId}`);

    const coupon = await this.couponRepository.findByCode(code);
    
    if (!coupon) {
      return { valid: false, error: 'Coupon not found' };
    }

    if (!coupon.isValid()) {
      return { valid: false, error: 'Coupon is not valid or has expired' };
    }

    // Check vendor-specific coupon
    if (coupon.vendor_id && coupon.vendor_id !== vendorId) {
      return { valid: false, error: 'This coupon is not valid for this vendor' };
    }

    // Check minimum order amount
    if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
      return { 
        valid: false, 
        error: `Minimum order amount of ₦${coupon.min_order_amount} required` 
      };
    }

    // Check user usage limit
    const userUsageCount = await this.couponRepository.getUserUsageCount(
      coupon.id,
      userId
    );

    if (!coupon.canBeUsedBy(userId, userUsageCount)) {
      return { valid: false, error: 'You have reached the usage limit for this coupon' };
    }

    const discountAmount = coupon.calculateDiscount(subtotal);

    return {
      valid: true,
      coupon,
      discount_amount: discountAmount,
    };
  }

  async getCouponById(id: string): Promise<CouponResponseDto> {
    const coupon = await this.couponRepository.findById(id);
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return this.mapToResponse(coupon);
  }

  async getAllCoupons(vendorId?: string): Promise<CouponResponseDto[]> {
    const coupons = await this.couponRepository.findAll(vendorId);
    return coupons.map(c => this.mapToResponse(c));
  }

  async updateCoupon(id: string, updateDto: Partial<CreateCouponDto>): Promise<CouponResponseDto> {
    const coupon = await this.couponRepository.findById(id);
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    if (updateDto.code && updateDto.code !== coupon.code) {
      const existing = await this.couponRepository.findByCode(updateDto.code);
      if (existing) {
        throw new BadRequestException('Coupon code already exists');
      }
    }

    const updateData: Partial<Coupon> = {
      ...updateDto,
      code: updateDto.code ? updateDto.code.toUpperCase() : undefined,
    } as Partial<Coupon>;

    const updated = await this.couponRepository.update(id, updateData);

    return this.mapToResponse(updated);
  }

  async deactivateCoupon(id: string): Promise<void> {
    const coupon = await this.couponRepository.findById(id);
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    await this.couponRepository.update(id, { status: CouponStatus.INACTIVE });
  }

  private mapToResponse(coupon: Coupon): CouponResponseDto {
    return {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      type: coupon.type,
      value: Number(coupon.value),
      min_order_amount: coupon.min_order_amount ? Number(coupon.min_order_amount) : undefined,
      max_discount_amount: coupon.max_discount_amount ? Number(coupon.max_discount_amount) : undefined,
      usage_limit: coupon.usage_limit,
      usage_count: coupon.usage_count,
      usage_limit_per_user: coupon.usage_limit_per_user,
      start_date: coupon.start_date,
      end_date: coupon.end_date,
      status: coupon.status,
      vendor_id: coupon.vendor_id,
      created_at: coupon.created_at,
    };
  }
}