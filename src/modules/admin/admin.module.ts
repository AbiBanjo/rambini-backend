import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendor } from '@/entities';

// Services
import { AdminService } from './admin.service';

// Controllers
import { AdminOrderController } from './controllers/admin-order.controller';
import { AdminMenuController } from './controllers/admin-menu.controller';
import { AdminCategoryController } from './controllers/admin-category.controller';
import { AdminVendorController } from './controllers/admin-vendor.controller';
import { AdminUserController } from './controllers/admin-user.controller';
import { AdminWithdrawalController } from './controllers/admin-withdrawal.controller';
import { AdminNotificationController } from './controllers/admin-notification.controller';

// Modules
import { OrderModule } from '../order/order.module';
import { MenuModule } from '../menu/menu.module';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { PaymentModule } from '../payment/payment.module';
import { UserModule } from '../user/user.module';
import { VendorModule } from '../vendor/vendor.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Vendor]),
    OrderModule,
    MenuModule,
    FileStorageModule,
    AuthModule,
    NotificationModule,
    PaymentModule,
    UserModule,
    VendorModule,
  ],
  controllers: [
    AdminOrderController,
    AdminMenuController,
    AdminCategoryController,
    AdminVendorController,
    AdminUserController,
    AdminWithdrawalController,
    AdminNotificationController,
  ],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}