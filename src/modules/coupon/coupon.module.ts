// src/modules/coupon/coupon.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon, CouponUsage } from 'src/entities';

// Import the Auth Module
import { AuthModule } from '../auth/auth.module';

// Controllers
import { CouponController } from './controllers/coupon.controller';

// Services
import { CouponService } from './services/coupon.service';

// Repositories
import { CouponRepository } from './repositories/coupon.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Coupon, CouponUsage]),
    AuthModule, // Add this line to import JWT authentication
  ],
  controllers: [
    CouponController,
  ],
  providers: [
    CouponService,
    CouponRepository,
  ],
  exports: [
    CouponService,
    CouponRepository,
  ],
})
export class CouponModule {}