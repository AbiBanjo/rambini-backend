import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { DeliveryService } from './services/delivery.service';
import { ShipbubbleDeliveryService } from './services/shipbubble-delivery.service';
import { UberDeliveryService } from './services/uber-delivery.service';
import { DeliveryProviderSelectorService } from './services/delivery-provider-selector.service';
import { DeliveryController } from './controllers/delivery.controller';
import { DeliveryWebhookController } from './controllers/delivery-webhook.controller';
import { DeliveryRepository } from './repositories/delivery.repository';
import { Delivery, DeliveryTracking } from 'src/entities';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Delivery, DeliveryTracking]),
    HttpModule,
    ConfigModule,
    AuthModule,
  ],
  controllers: [DeliveryController, DeliveryWebhookController],
  providers: [
    DeliveryService,
    ShipbubbleDeliveryService,
    UberDeliveryService,
    DeliveryProviderSelectorService,
    DeliveryRepository,
  ],
  exports: [DeliveryService, DeliveryProviderSelectorService],
})
export class DeliveryModule {}
