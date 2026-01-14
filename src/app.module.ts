import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { AppController } from 'src/app.controller';
import { AppService } from 'src/app.service';

// Import feature modules
import { UserModule } from 'src/modules/user/user.module';
import { VendorModule } from './modules/vendors/vendor/vendor.module';
import { FileStorageModule } from './modules/file-storage/file-storage.module';
import { MenuModule } from './modules/menu/menu.module';
import { CartModule } from './modules/cart/cart.module';
import { OrderModule } from './modules/order/order.module';
import { PaymentModule } from './modules/payment/payment.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { CouponModule } from './modules/vendors/coupon/coupon.module';
// import { NotificationModule } from './modules/notification/notification.module';
// import { AdminModule } from './modules/admin/admin.module';

// Import common modules
import { DatabaseModule } from 'src/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { CommonModule } from './common/common.module';
import { AdminModule } from './modules/admin/admin.module';

// Load environment file based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = `.env.${nodeEnv}`;
const envPath = path.resolve(process.cwd(), envFile);

// Load the environment file
dotenv.config({ path: envPath });

// Fallback to .env if environment-specific file doesn't exist
if (nodeEnv !== 'development') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [envPath, '.env'],
      ignoreEnvFile: false,
    }),

    // Common modules (global)
    CommonModule,

    // Database
    DatabaseModule,

    // Queue system
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB) || 0,
      },
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL) || 60000,
        limit: parseInt(process.env.RATE_LIMIT_LIMIT) || 100,
      },
    ]),

    // Feature modules
    UserModule,
    VendorModule,
    FileStorageModule,
    MenuModule,
    CartModule,
    OrderModule,
    PaymentModule,
    DeliveryModule,
    CouponModule,
    // NotificationModule,
    // AdminModule,

    // Common modules
    AuthModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
