import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItem, MenuItem, Order } from 'src/entities';
import { MenuModule } from 'src/modules/menu/menu.module';
import { AuthModule } from 'src/modules/auth/auth.module';

// Controllers
import { CartController } from './controllers/cart.controller';

// Services
import { CartService } from './services/cart.service';

// Repositories
import { CartRepository } from './repositories/cart.repository';
import { OrderRepository } from '../order/repositories/order.repository';
import { VendorModule } from '../vendor/vendor.module';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CartItem, MenuItem, Order]),
    MenuModule,
    AuthModule, // Import AuthModule to get access to JWTService and JwtAuthGuard
    VendorModule, // Import VendorModule to get access to VendorService
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