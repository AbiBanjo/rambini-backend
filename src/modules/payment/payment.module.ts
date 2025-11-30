import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { 
  Payment, 
  Wallet, 
  Transaction, 
  Order, 
  User, 
  Vendor,
  Withdrawal,
  Bank,
  SavedCard
} from 'src/entities';
import { AuthModule } from 'src/modules/auth/auth.module';

// Controllers
import { PaymentController } from './controllers/payment.controller';
import { PaymentWebhookController } from './controllers/payment-webhook.controller';
import { WithdrawalController, AdminWithdrawalController } from './controllers/withdrawal.controller';
import { FixDuplicatesController } from './controllers/fix-duplicates.controller'; // ✅ Added

// Services
import { PaymentService } from './services/payment.service';
import { WalletPaymentService } from './services/wallet-payment.service';
import { StripePaymentService } from './services/stripe-payment.service';
import { PaystackPaymentService } from './services/paystack-payment.service';
import { MercuryPaymentService } from './services/mercury-payment.service';
import { WithdrawalService } from './services/withdrawal.service';
import { FixDuplicateCreditsService } from './services/fix-duplicate-credits.service'; // ✅ Added

// Repositories
import { PaymentRepository } from './repositories/payment.repository';
import { WithdrawalRepository } from './repositories/withdrawal.repository';
import { BankRepository } from './repositories/bank.repository';

// Modules
import { CartModule } from '../cart/cart.module';
import { OrderModule } from '../order/order.module';
import { VendorModule } from '../vendor/vendor.module';
import { NotificationModule } from '../notification/notification.module';

// Database
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
      Bank,
      SavedCard,
    ]),
    AuthModule, // Import AuthModule to get access to JWTService and JwtAuthGuard
    forwardRef(() => CartModule),
    forwardRef(() => OrderModule),
    forwardRef(() => VendorModule),
    forwardRef(() => NotificationModule), // This provides access to withdrawal email services
  ],
  controllers: [
    PaymentController,
    PaymentWebhookController,
    WithdrawalController,
    AdminWithdrawalController,
    FixDuplicatesController, // ✅ Added
  ],
  providers: [
    // Payment Services
    PaymentService,
    WalletPaymentService,
    {
      provide: StripePaymentService,
      useFactory: (savedCardRepository) => {
        const service = new StripePaymentService(savedCardRepository);
        return service;
      },
      inject: [getRepositoryToken(SavedCard)],
    },
    {
      provide: PaystackPaymentService,
      useFactory: (savedCardRepository) => {
        const service = new PaystackPaymentService(savedCardRepository);
        return service;
      },
      inject: [getRepositoryToken(SavedCard)],
    },
    MercuryPaymentService,
    
    // Withdrawal Services
    WithdrawalService,
    
    // Fix Services
    FixDuplicateCreditsService, // ✅ Added
    
    // Database Services
    RedisService,
    
    // Repositories
    PaymentRepository,
    WithdrawalRepository,
    BankRepository,
  ],
  exports: [
    // Payment Services
    PaymentService,
    WalletPaymentService,
    
    // Withdrawal Services
    WithdrawalService,
    
    // Fix Services
    FixDuplicateCreditsService, // ✅ Added (optional, only if you need it in other modules)
    
    // Repositories
    PaymentRepository,
    WithdrawalRepository,
    BankRepository,
  ],
})
export class PaymentModule {}