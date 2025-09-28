import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order, OrderItem, MenuItem, Vendor, User, Address } from 'src/entities';
import { DeliveryQuote } from 'src/entities/delivery-quote.entity';
import { CartModule } from 'src/modules/cart/cart.module';
import { MenuModule } from 'src/modules/menu/menu.module';
import { UserModule } from 'src/modules/user/user.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { PaymentModule } from 'src/modules/payment/payment.module';
import { DeliveryModule } from 'src/modules/delivery/delivery.module';
import { VendorModule } from 'src/modules/vendor/vendor.module';

// Controllers
import { OrderController } from './controllers/order.controller';
import { VendorOrderController } from './controllers/vendor-order.controller';

// Services
import { OrderService } from './services/order.service';

// Repositories
import { OrderRepository } from './repositories/order.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, MenuItem, Vendor, User, Address, DeliveryQuote]),
    forwardRef(() => CartModule),
    MenuModule,
    UserModule,
    AuthModule, // Import AuthModule to get access to JWTService and JwtAuthGuard
    forwardRef(() => PaymentModule), // Import PaymentModule to get access to PaymentService
    DeliveryModule, // Import DeliveryModule to get access to DeliveryService
    VendorModule, // Import VendorModule to get access to VendorService
  ],
  controllers: [
    OrderController,
    VendorOrderController,
  ],
  providers: [
    OrderService,
    OrderRepository,
  ],
  exports: [
    OrderService,
    OrderRepository,
  ],
})
export class OrderModule {} 