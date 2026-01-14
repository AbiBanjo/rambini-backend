// src/modules/coupon/repositories/coupon.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon, CouponUsage } from 'src/entities';

@Injectable()
export class CouponRepository {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(CouponUsage)
    private readonly usageRepo: Repository<CouponUsage>,
  ) {}

  async create(data: Partial<Coupon>): Promise<Coupon> {
    const coupon = this.couponRepo.create(data);
    return await this.couponRepo.save(coupon);
  }

  async findByCode(code: string): Promise<Coupon | null> {
    return await this.couponRepo.findOne({ 
      where: { code: code.toUpperCase() },
      relations: ['vendor']
    });
  }

  async findById(id: string): Promise<Coupon | null> {
    return await this.couponRepo.findOne({ 
      where: { id },
      relations: ['vendor']
    });
  }

  async getUserUsageCount(couponId: string, userId: string): Promise<number> {
    return await this.usageRepo.count({
      where: { coupon_id: couponId, user_id: userId }
    });
  }

  async recordUsage(
    couponId: string,
    userId: string,
    discountAmount: number,
    orderId?: string
  ): Promise<CouponUsage> {
    const usage = this.usageRepo.create({
      coupon_id: couponId,
      user_id: userId,
      order_id: orderId,
      discount_amount: discountAmount,
    });
    return await this.usageRepo.save(usage);
  }

  async incrementUsageCount(couponId: string): Promise<void> {
    await this.couponRepo.increment({ id: couponId }, 'usage_count', 1);
  }

  async update(id: string, data: Partial<Coupon>): Promise<Coupon> {
    await this.couponRepo.update(id, data);
    return await this.findById(id);
  }

  async findAll(vendorId?: string): Promise<Coupon[]> {
    const query = this.couponRepo.createQueryBuilder('coupon');
    
    if (vendorId) {
      query.where('coupon.vendor_id = :vendorId', { vendorId });
    }
    
    return await query.getMany();
  }
}