import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { 
  Payment, 
  Wallet, 
  Transaction, 
  Order, 
  User, 
  Vendor,
  Withdrawal
} from 'src/entities';
import { AuthModule } from 'src/modules/auth/auth.module';

// Controllers
import { PaymentController } from './controllers/payment.controller';
import { PaymentWebhookController } from './controllers/payment-webhook.controller';
import { WithdrawalController, AdminWithdrawalController } from './controllers/withdrawal.controller';

// Services
import { PaymentService } from './services/payment.service';
import { WalletPaymentService } from './services/wallet-payment.service';
import { StripePaymentService } from './services/stripe-payment.service';
import { PaystackPaymentService } from './services/paystack-payment.service';
import { MercuryPaymentService } from './services/mercury-payment.service';
import { WithdrawalService } from './services/withdrawal.service';

// Repositories
import { PaymentRepository } from './repositories/payment.repository';
import { WithdrawalRepository } from './repositories/withdrawal.repository';
import { CartModule } from '../cart/cart.module';
import { OrderModule } from '../order/order.module';
import { VendorModule } from '../vendor/vendor.module';
import { NotificationModule } from '../notification/notification.module';
import { RedisService } from '../../database/redis.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Wallet,
      Transaction,
      Order,
      User,
      Vendor,
      Withdrawal,
    ]),
    AuthModule, // Import AuthModule to get access to JWTService and JwtAuthGuard
    forwardRef(() => CartModule),
    forwardRef(() => OrderModule),
    forwardRef(() => VendorModule),
    forwardRef(() => NotificationModule),
  ],
  controllers: [
    PaymentController,
    PaymentWebhookController,
    WithdrawalController,
    AdminWithdrawalController,
  ],
  providers: [
    // Services
    PaymentService,
    WalletPaymentService,
    StripePaymentService,
    PaystackPaymentService,
    MercuryPaymentService,
    WithdrawalService,
    RedisService,
    
    // Repositories
    PaymentRepository,
    WithdrawalRepository,
  ],
  exports: [
    PaymentService,
    WalletPaymentService,
    PaymentRepository,
    WithdrawalService,
    WithdrawalRepository,
  ],
})
export class PaymentModule {}
