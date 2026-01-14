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
  import { FixDuplicatesController } from './controllers/fix-duplicates.controller';
  import { FixCompletedWithdrawalsController } from './controllers/fix-completed-withdrawals.controller'; // NEW

  // Payment Services
  import { PaymentService } from './services/payment.service';
  import { WalletPaymentService } from './services/wallet-payment.service';
  import { StripePaymentService } from './services/stripe-payment.service';
  import { PaystackPaymentService } from './services/paystack-payment.service';
  import { MercuryPaymentService } from './services/mercury-payment.service';

  // Withdrawal Services - Refactored
  import { WithdrawalService } from './services/withdrawal/withdrawal.service';
  import { WithdrawalOtpService } from './services/withdrawal/withdrawal-otp.service';
  import { WithdrawalAdminService } from './services/withdrawal/withdrawal-admin.service';
  import { WithdrawalBankService } from './services/withdrawal/withdrawal-bank.service';

  // Fix Services
  import { FixDuplicateCreditsService } from './services/fix-duplicate-credits.service';
  import { FixCompletedWithdrawalsService } from './services/withdrawal/fix-completed-withdrawals.service';

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
      AuthModule,
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
      FixDuplicatesController,
      FixCompletedWithdrawalsController, // NEW
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
      
      // Withdrawal Services - Refactored into specialized services
      WithdrawalService,
      WithdrawalOtpService,
      WithdrawalAdminService,
      WithdrawalBankService,
      
      // Fix Services
      FixDuplicateCreditsService,
      FixCompletedWithdrawalsService, // NEW
      
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
      WithdrawalOtpService,
      WithdrawalAdminService,
      WithdrawalBankService,
      
      // Fix Services
      FixDuplicateCreditsService,
      FixCompletedWithdrawalsService, // NEW
      
      // Repositories
      PaymentRepository,
      WithdrawalRepository,
      BankRepository,
    ],
  })
  export class PaymentModule {}