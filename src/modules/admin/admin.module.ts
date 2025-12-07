import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendor, User } from '@/entities';

// Services
import { AdminService } from './service/admin.service';
import { OtpMonitoringService } from './service/otp-monitoring.service';

// Controllers
import { AdminOrderController } from './controllers/admin-order.controller';
import { AdminMenuController } from './controllers/admin-menu.controller';
import { AdminCategoryController } from './controllers/admin-category.controller';
import { AdminVendorController } from './controllers/admin-vendor.controller';
import { AdminUserController } from './controllers/admin-user.controller';
import { AdminWithdrawalController } from './controllers/admin-withdrawal.controller';
import { AdminNotificationController } from './controllers/admin-notification.controller';
import { AdminOtpController } from './controllers/admin-otp.controller'; 

// Modules
import { OrderModule } from '../order/order.module';
import { MenuModule } from '../menu/menu.module';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { PaymentModule } from '../payment/payment.module';
import { UserModule } from '../user/user.module';
import { VendorModule } from '../vendor/vendor.module';

// Database
import { RedisService } from '../../database/redis.service'; 

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vendor,
      User, 
    ]),
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
    AdminOtpController, // NEW - Add OTP monitoring controller
  ],
  providers: [
    AdminService,
    OtpMonitoringService, // NEW - Add OTP monitoring service
    RedisService, // NEW - Required for Redis operations
  ],
  exports: [
    AdminService,
    OtpMonitoringService, // NEW - Export for other modules if needed
  ],
})
export class AdminModule {}