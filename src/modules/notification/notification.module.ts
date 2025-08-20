import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
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
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {} 