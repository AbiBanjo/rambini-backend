import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItem, MenuItem, Order, Coupon, CouponUsage } from 'src/entities';
import { MenuModule } from 'src/modules/menu/menu.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { VendorModule } from '../vendor/vendor.module';
import { OrderModule } from '../order/order.module';
import { CouponModule } from '../coupon/coupon.module';

// Controllers
import { CartController } from './controllers/cart.controller';

// Services
import { CartService } from './services/cart.service';

// Repositories
import { CartRepository } from './repositories/cart.repository';
import { OrderRepository } from '../order/repositories/order.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([CartItem, MenuItem, Order, Coupon, CouponUsage]),
    MenuModule,
    AuthModule,
    VendorModule,
    CouponModule, // Import CouponModule to access CouponService
    forwardRef(() => OrderModule),
  ],
  controllers: [
    CartController,
  ],
  providers: [
    CartService,
    CartRepository,
  ],
  exports: [
    CartService,
    CartRepository,
  ],
})
export class CartModule {}