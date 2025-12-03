import { Global, Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { OrderModule } from '../order/order.module';
import { MenuModule } from '../menu/menu.module'; // Add this import
import { FileStorageModule } from '../file-storage/file-storage.module'; // Add this import
import { Vendor } from '@/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { PaymentModule } from '../payment/payment.module';

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
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
