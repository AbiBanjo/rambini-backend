import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendor, User, Address, Order, Wallet, Payment } from '@/entities';

// Services
import { AdminService } from './service/admin.service';
import { OtpMonitoringService } from './service/otp-monitoring.service';
import { AdminProfileService } from './service/admin-profile.service';
import { AdminOrderService } from './service/admin-order.service';
import { FixCustomerRefundsService } from './service/fix-customer-refunds.service';
import { RevertCancellationService } from './service/revert-cancellation.service'; // NEW

// Controllers
import { AdminOrderController } from './controllers/admin-order.controller';
import { AdminMenuController } from './controllers/admin-menu.controller';
import { AdminCategoryController } from './controllers/admin-category.controller';
import { AdminVendorController } from './controllers/admin-vendor.controller';
import { AdminUserController } from './controllers/admin-user.controller';
import { AdminWithdrawalController } from './controllers/admin-withdrawal.controller';
import { AdminNotificationController } from './controllers/admin-notification.controller';
import { AdminOtpController } from './controllers/admin-otp.controller';
import { AdminUserProfileController } from './controllers/admin-user-profile.controller';
import { AdminVendorProfileController } from './controllers/admin-vendor-profile.controller';
import { AdminRefundFixController } from './controllers/admin-refund-fix.controller';
import { AdminRevertCancellationController } from './controllers/admin-revert-cancellation.controller'; // NEW

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
      Address,
      Order,   // Required for AdminOrderService, FixCustomerRefundsService, and RevertCancellationService
      Wallet,  // Required for AdminOrderService, FixCustomerRefundsService, and RevertCancellationService
      Payment, // Required for AdminOrderService, FixCustomerRefundsService, and RevertCancellationService
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
    AdminOtpController,
    AdminUserProfileController,
    AdminVendorProfileController,
    AdminRefundFixController, // Fix customer refunds
    AdminRevertCancellationController, // NEW - Revert cancellations
  ],
  providers: [
    AdminService,
    OtpMonitoringService,
    AdminProfileService,
    AdminOrderService, // Admin order operations (cancellation, refunds)
    FixCustomerRefundsService, // Fix missing customer refunds
    RevertCancellationService, // NEW - Revert cancelled orders
    RedisService,
  ],
  exports: [
    AdminService,
    OtpMonitoringService,
    AdminProfileService,
    AdminOrderService,
    FixCustomerRefundsService, // Export for potential use elsewhere
    RevertCancellationService, // NEW - Export for potential use elsewhere
  ],
})
export class AdminModule {}