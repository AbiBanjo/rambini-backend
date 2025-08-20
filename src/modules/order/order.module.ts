import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order, OrderItem, MenuItem, Vendor, User, Address } from 'src/entities';
import { CartModule } from 'src/modules/cart/cart.module';
import { MenuModule } from 'src/modules/menu/menu.module';
import { UserModule } from 'src/modules/user/user.module';

// Controllers
import { OrderController } from './controllers/order.controller';
import { VendorOrderController } from './controllers/vendor-order.controller';

// Services
import { OrderService } from './services/order.service';

// Repositories
import { OrderRepository } from './repositories/order.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, MenuItem, Vendor, User, Address]),
    CartModule,
    MenuModule,
    UserModule,
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