import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { 
  Payment, 
  Wallet, 
  Transaction, 
  Order, 
  User, 
  Vendor 
} from 'src/entities';
import { AuthModule } from 'src/modules/auth/auth.module';

// Controllers
import { PaymentController } from './controllers/payment.controller';
import { PaymentWebhookController } from './controllers/payment-webhook.controller';

// Services
import { PaymentService } from './services/payment.service';
import { WalletPaymentService } from './services/wallet-payment.service';
import { StripePaymentService } from './services/stripe-payment.service';
import { PaystackPaymentService } from './services/paystack-payment.service';
import { MercuryPaymentService } from './services/mercury-payment.service';

// Repositories
import { PaymentRepository } from './repositories/payment.repository';
import { CartModule } from '../cart/cart.module';
import { OrderModule } from '../order/order.module';
import { VendorModule } from '../vendor/vendor.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Wallet,
      Transaction,
      Order,
      User,
      Vendor,
    ]),
    AuthModule, // Import AuthModule to get access to JWTService and JwtAuthGuard
    CartModule,
    forwardRef(() => OrderModule),
    forwardRef(() => VendorModule),
  ],
  controllers: [
    PaymentController,
    PaymentWebhookController,
  ],
  providers: [
    // Services
    PaymentService,
    WalletPaymentService,
    StripePaymentService,
    PaystackPaymentService,
    MercuryPaymentService,
    
    // Repositories
    PaymentRepository,
  ],
  exports: [
    PaymentService,
    WalletPaymentService,
    PaymentRepository,
  ],
})
export class PaymentModule {}
