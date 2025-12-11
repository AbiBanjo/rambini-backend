// src/modules/notification/notification.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';

// Controllers
import { NotificationController } from './notification.controller';
import { NotificationSSEController } from './controllers/notification-sse.controller';

// Main Services
import { NotificationService } from './notification.service';

// Notification Services
import { EmailNotificationService } from './services/email-notification.service';
import { PushNotificationService } from './services/push-notification.service';
import { InAppNotificationService } from './services/in-app-notification.service';
import { NotificationTemplateService } from './services/notification-template.service';
import { NotificationDeliveryService } from './services/notification-delivery.service';
import { NotificationQueueService } from './services/notification-queue.service';
import { NotificationSSEService } from './services/notification-sse.service';

// Order Email Services
import { OrderEmailTemplatesService } from './services/order-email-templates.service';
import { OrderEmailNotificationService } from './services/order-email-notification.service';

// Withdrawal Email Services
import { WithdrawalEmailTemplatesService } from './services/withdrawal-email-templates.service';
import { WithdrawalEmailNotificationService } from './services/withdrawal-email-notification.service';

// Entities
import {
  Notification,
  DeviceToken,
  UserNotificationPreference,
  User,
} from '../../entities';
import { AdminOrderEmailTemplatesService } from './services/admin-order-email-templates.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      DeviceToken,
      UserNotificationPreference,
      User,
    ]),
    ConfigModule, // For accessing environment variables
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    forwardRef(() => AuthModule),
  ],
  controllers: [
    NotificationController,
    NotificationSSEController,
  ],
  providers: [
    // Main Service
    NotificationService,
    
    // Core Notification Services
    EmailNotificationService,
    PushNotificationService,
    InAppNotificationService,
    NotificationTemplateService,
    NotificationDeliveryService,
    AdminOrderEmailTemplatesService, 
    NotificationQueueService,
    NotificationSSEService,
    
    // Order Email Services
    OrderEmailTemplatesService,
    OrderEmailNotificationService,
    
    // Withdrawal Email Services
    WithdrawalEmailTemplatesService,
    WithdrawalEmailNotificationService,
  ],
  exports: [
    // Main Service
    NotificationService,
    
    // Core Notification Services
    EmailNotificationService,
    PushNotificationService,
    InAppNotificationService,
    NotificationTemplateService,
     AdminOrderEmailTemplatesService,
    NotificationDeliveryService,
    NotificationQueueService,
    NotificationSSEService,
    
    // Order Email Services
    OrderEmailTemplatesService,
    OrderEmailNotificationService,
    
    // Withdrawal Email Services
    WithdrawalEmailTemplatesService,
    WithdrawalEmailNotificationService,
  ],
})
export class NotificationModule {}