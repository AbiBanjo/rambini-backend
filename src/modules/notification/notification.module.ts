// src/modules/notification/notification.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from '../auth/auth.module';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { EmailNotificationService } from './services/email-notification.service';
import { PushNotificationService } from './services/push-notification.service';
import { InAppNotificationService } from './services/in-app-notification.service';
import { NotificationTemplateService } from './services/notification-template.service';
import { NotificationDeliveryService } from './services/notification-delivery.service';
import { NotificationQueueService } from './services/notification-queue.service';
import { NotificationSSEService } from './services/notification-sse.service';
import { NotificationSSEController } from './controllers/notification-sse.controller';
import { OrderEmailTemplatesService } from './services/order-email-templates.service';
import { OrderEmailNotificationService } from './services/order-email-notification.service';
import {
  Notification,
  DeviceToken,
  UserNotificationPreference,
  User,
} from '../../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      DeviceToken,
      UserNotificationPreference,
      User,
    ]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    forwardRef(() => AuthModule),
  ],
  controllers: [NotificationController, NotificationSSEController],
  providers: [
    NotificationService,
    EmailNotificationService,
    PushNotificationService,
    InAppNotificationService,
    NotificationTemplateService,
    NotificationDeliveryService,
    NotificationQueueService,
    NotificationSSEService,
    OrderEmailTemplatesService,
    OrderEmailNotificationService,
  ],
  exports: [
    NotificationService,
    EmailNotificationService,
    PushNotificationService,
    InAppNotificationService,
    NotificationTemplateService,
    NotificationDeliveryService,
    NotificationQueueService,
    NotificationSSEService,
    OrderEmailTemplatesService,
    OrderEmailNotificationService,
  ],
})
export class NotificationModule {}