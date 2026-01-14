import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { DeliveryService } from './services/delivery.service';
import { ShipbubbleDeliveryService } from './services/shipbubble-delivery.service';
import { UberDeliveryService } from './services/uber-delivery.service';
import { DeliveryProviderFactoryService } from './services/delivery-provider-factory.service';
import { DeliveryProviderSelectorService } from './services/delivery-provider-selector.service';
import { DeliveryQuoteService } from './services/delivery-quote.service';
import { DeliveryController } from './controllers/delivery.controller';
import { DeliveryWebhookController } from './controllers/delivery-webhook.controller';
import { DeliveryRepository } from './repositories/delivery.repository';
import { Delivery, DeliveryTracking, Address, Order } from 'src/entities';
import { DeliveryQuote } from 'src/entities/delivery-quote.entity';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from 'src/modules/auth/auth.module';
import { UserModule } from 'src/modules/user/user.module';
import { CartModule } from 'src/modules/cart/cart.module';
import { VendorModule } from '@/modules/vendors/vendor/vendor.module';
import { NotificationModule } from 'src/modules/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Delivery,
      DeliveryTracking,
      Address,
      DeliveryQuote,
      Order,
    ]),
    HttpModule.register({
      timeout: 30000, // 30 seconds timeout
      maxRedirects: 5,
      validateStatus: status => status < 500, // Resolve only if status < 500
    }),
    ConfigModule,
    AuthModule, // Import AuthModule to get access to JWTService and JwtAuthGuard
    UserModule, // Import UserModule to get access to AddressService
    forwardRef(() => CartModule), // Import CartModule to get access to CartService
    forwardRef(() => VendorModule), // Import VendorModule to get access to VendorService
    NotificationModule, // Import NotificationModule to get access to NotificationService and NotificationSSEService
  ],
  controllers: [DeliveryController, DeliveryWebhookController],
  providers: [
    DeliveryService,
    ShipbubbleDeliveryService,
    UberDeliveryService,
    DeliveryProviderFactoryService,
    DeliveryProviderSelectorService,
    DeliveryQuoteService,
    DeliveryRepository,
  ],
  exports: [
    DeliveryService,
    DeliveryProviderFactoryService,
    DeliveryProviderSelectorService,
    ShipbubbleDeliveryService,
    UberDeliveryService,
    DeliveryQuoteService,
  ],
})
export class DeliveryModule {}
