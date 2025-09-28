import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
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
  ],
})
export class NotificationModule {} 