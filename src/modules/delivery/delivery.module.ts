import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { DeliveryService } from './services/delivery.service';
import { ShipbubbleDeliveryService } from './services/shipbubble-delivery.service';
import { UberDeliveryService } from './services/uber-delivery.service';
import { DeliveryProviderFactoryService } from './services/delivery-provider-factory.service';
import { DeliveryProviderSelectorService } from './services/delivery-provider-selector.service';
import { DeliveryController } from './controllers/delivery.controller';
import { DeliveryWebhookController } from './controllers/delivery-webhook.controller';
import { DeliveryRepository } from './repositories/delivery.repository';
import { Delivery, DeliveryTracking, Address } from 'src/entities';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from 'src/modules/auth/auth.module';
import { UserModule } from 'src/modules/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Delivery, DeliveryTracking, Address]),
    HttpModule,
    ConfigModule,
     AuthModule, // Import AuthModule to get access to JWTService and JwtAuthGuard
     UserModule, // Import UserModule to get access to AddressService
  ],
  controllers: [DeliveryController, DeliveryWebhookController],
  providers: [
    DeliveryService,
    ShipbubbleDeliveryService,
    UberDeliveryService,
    DeliveryProviderFactoryService,
    DeliveryProviderSelectorService,
    DeliveryRepository,
  ],
  exports: [DeliveryService, DeliveryProviderFactoryService, DeliveryProviderSelectorService, ShipbubbleDeliveryService],
})
export class DeliveryModule {}
