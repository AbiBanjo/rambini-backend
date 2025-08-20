import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationType,
  NotificationDelivery,
  DeliveryStatus,
  NotificationPriority,
  DeviceToken,
  UserNotificationPreference,
  User,
} from '../../entities';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepository: Repository<DeviceToken>,
    @InjectRepository(UserNotificationPreference)
    private readonly preferenceRepository: Repository<UserNotificationPreference>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // Notification Creation Methods
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      data?: Record<string, any>;
      priority?: NotificationPriority;
      deliveryMethod?: NotificationDelivery;
      scheduledFor?: Date;
      expiresAt?: Date;
    },
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      user_id: userId,
      notification_type: type,
      title,
      message,
      data: options?.data,
      priority: options?.priority || NotificationPriority.NORMAL,
      delivery_method: options?.deliveryMethod || NotificationDelivery.IN_APP,
      scheduled_for: options?.scheduledFor,
      expires_at: options?.expiresAt,
      delivery_status: DeliveryStatus.PENDING,
    });

    return this.notificationRepository.save(notification);
  }

  async createOrderUpdateNotification(
    userId: string,
    orderId: string,
    status: string,
    message: string,
  ): Promise<Notification> {
    return this.createNotification(
      userId,
      NotificationType.ORDER_UPDATE,
      `Order Update: ${status}`,
      message,
      {
        data: { order_id: orderId, status },
        priority: NotificationPriority.HIGH,
        deliveryMethod: NotificationDelivery.PUSH,
      },
    );
  }

  async createPaymentNotification(
    userId: string,
    amount: number,
    status: string,
    message: string,
  ): Promise<Notification> {
    return this.createNotification(
      userId,
      NotificationType.PAYMENT,
      `Payment ${status}`,
      message,
      {
        data: { amount, status },
        priority: NotificationPriority.HIGH,
        deliveryMethod: NotificationDelivery.PUSH,
      },
    );
  }

  // Device Token Management
  async registerDeviceToken(
    userId: string,
    token: string,
    platform: string,
    deviceInfo?: {
      deviceId?: string;
      deviceModel?: string;
      appVersion?: string;
      osVersion?: string;
    },
  ): Promise<DeviceToken> {
    // Check if token already exists
    const existingToken = await this.deviceTokenRepository.findOne({
      where: { token },
    });

    if (existingToken) {
      // Update existing token
      existingToken.user_id = userId;
      existingToken.platform = platform as any;
      existingToken.is_active = true;
      existingToken.token_status = 'ACTIVE' as any;
      existingToken.last_used_at = new Date();
      
      if (deviceInfo) {
        existingToken.device_id = deviceInfo.deviceId;
        existingToken.device_model = deviceInfo.deviceModel;
        existingToken.app_version = deviceInfo.appVersion;
        existingToken.os_version = deviceInfo.osVersion;
      }

      return this.deviceTokenRepository.save(existingToken);
    }

    // Create new token
    const deviceToken = this.deviceTokenRepository.create({
      user_id: userId,
      token,
      platform: platform as any,
      device_id: deviceInfo?.deviceId,
      device_model: deviceInfo?.deviceModel,
      app_version: deviceInfo?.appVersion,
      os_version: deviceInfo?.osVersion,
      is_active: true,
      token_status: 'ACTIVE' as any,
    });

    return this.deviceTokenRepository.save(deviceToken);
  }

  async deactivateDeviceToken(token: string): Promise<void> {
    await this.deviceTokenRepository.update(
      { token },
      { is_active: false, token_status: 'REVOKED' as any },
    );
  }

  async getUserDeviceTokens(userId: string): Promise<DeviceToken[]> {
    return this.deviceTokenRepository.find({
      where: { user_id: userId, is_active: true },
    });
  }

  // User Preference Management
  async getUserNotificationPreferences(userId: string): Promise<UserNotificationPreference[]> {
    return this.preferenceRepository.find({
      where: { user_id: userId },
    });
  }

  async updateNotificationPreference(
    userId: string,
    notificationType: NotificationType,
    preferences: {
      in_app_enabled?: boolean;
      push_enabled?: boolean;
      sms_enabled?: boolean;
      email_enabled?: boolean;
    },
  ): Promise<UserNotificationPreference> {
    let preference = await this.preferenceRepository.findOne({
      where: { user_id: userId, notification_type: notificationType },
    });

    if (!preference) {
      preference = this.preferenceRepository.create({
        user_id: userId,
        notification_type: notificationType,
        in_app_enabled: true,
        push_enabled: true,
        sms_enabled: false,
        email_enabled: false,
      });
    }

    // Update preferences
    Object.assign(preference, preferences);

    return this.preferenceRepository.save(preference);
  }

  async setDefaultPreferences(userId: string): Promise<void> {
    const notificationTypes = Object.values(NotificationType);
    
    for (const type of notificationTypes) {
      await this.updateNotificationPreference(userId, type, {
        in_app_enabled: true,
        push_enabled: true,
        sms_enabled: false,
        email_enabled: false,
      });
    }
  }

  // Notification Delivery Methods
  async sendNotification(
    notificationId: string,
    deliveryMethod: NotificationDelivery,
  ): Promise<boolean> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
      relations: ['user'],
    });

    if (!notification) {
      this.logger.error(`Notification ${notificationId} not found`);
      return false;
    }

    const user = notification.user as User;
    
    // Check if user can receive this type of notification
    if (!user.canReceiveNotification(notification.notification_type, deliveryMethod as NotificationDelivery)) {
      this.logger.log(`User ${user.id} has disabled ${deliveryMethod} for ${notification.notification_type}`);
      return false;
    }

    try {
      switch (deliveryMethod) {
        case NotificationDelivery.PUSH:
          return await this.sendPushNotification(notification, user);
        case NotificationDelivery.EMAIL:
          return await this.sendEmailNotification(notification, user);
        case NotificationDelivery.SMS:
          return await this.sendSMSNotification(notification, user);
        case NotificationDelivery.IN_APP:
          return await this.sendInAppNotification(notification, user);
        default:
          this.logger.error(`Unknown delivery method: ${deliveryMethod}`);
          return false;
      }
    } catch (error) {
      this.logger.error(`Failed to send ${deliveryMethod} notification:`, error);
      await this.markNotificationFailed(notification.id, error.message);
      return false;
    }
  }

  private async sendPushNotification(notification: Notification, user: User): Promise<boolean> {
    const deviceTokens = user.getPushEnabledDeviceTokens();
    
    if (deviceTokens.length === 0) {
      this.logger.log(`No active device tokens for user ${user.id}`);
      return false;
    }

    // Here you would integrate with FCM, APNS, or other push services
    this.logger.log(`Sending push notification to ${deviceTokens.length} devices for user ${user.id}`);
    
    // Mark as sent
    await this.markNotificationSent(notification.id);
    return true;
  }

  private async sendEmailNotification(notification: Notification, user: User): Promise<boolean> {
    // Here you would integrate with email service (SendGrid, AWS SES, etc.)
    this.logger.log(`Sending email notification to user ${user.id}`);
    
    await this.markNotificationSent(notification.id);
    return true;
  }

  private async sendSMSNotification(notification: Notification, user: User): Promise<boolean> {
    // Here you would integrate with SMS service (Twilio, AWS SNS, etc.)
    this.logger.log(`Sending SMS notification to user ${user.id}`);
    
    await this.markNotificationSent(notification.id);
    return true;
  }

  private async sendInAppNotification(notification: Notification, user: User): Promise<boolean> {
    // In-app notifications are stored in the database and retrieved by the client
    this.logger.log(`Storing in-app notification for user ${user.id}`);
    
    await this.markNotificationSent(notification.id);
    return true;
  }

  // Notification Status Updates
  private async markNotificationSent(notificationId: string): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId },
      {
        sent_at: new Date(),
        delivery_status: DeliveryStatus.SENT,
      },
    );
  }

  private async markNotificationDelivered(notificationId: string): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId },
      {
        delivery_status: DeliveryStatus.DELIVERED,
      },
    );
  }

  private async markNotificationFailed(notificationId: string, reason: string): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId },
      {
        delivery_status: DeliveryStatus.FAILED,
        failure_reason: reason,
      },
    );
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId },
      {
        is_read: true,
        read_at: new Date(),
      },
    );
  }

  // Query Methods
  async getUserNotifications(
    userId: string,
    options?: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
      type?: NotificationType;
    },
  ): Promise<Notification[]> {
    const query = this.notificationRepository.createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId })
      .orderBy('notification.created_at', 'DESC');

    if (options?.unreadOnly) {
      query.andWhere('notification.is_read = :isRead', { isRead: false });
    }

    if (options?.type) {
      query.andWhere('notification.notification_type = :type', { type: options.type });
    }

    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.offset(options.offset);
    }

    return query.getMany();
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { user_id: userId, is_read: false },
    });
  }

  // Cleanup Methods
  async cleanupExpiredNotifications(): Promise<number> {
    const result = await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now', { now: new Date() })
      .execute();

    return result.affected || 0;
  }

  async cleanupInactiveDeviceTokens(): Promise<number> {
    const result = await this.deviceTokenRepository
      .createQueryBuilder()
      .delete()
      .where('is_active = :isActive', { isActive: false })
      .andWhere('updated_at < :cutoff', { 
        cutoff: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      })
      .execute();

    return result.affected || 0;
  }
} 