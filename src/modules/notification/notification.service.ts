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
import { EmailNotificationService } from './services/email-notification.service';
import { PushNotificationService } from './services/push-notification.service';
import { InAppNotificationService } from './services/in-app-notification.service';
import { NotificationTemplateService } from './services/notification-template.service';
import { NotificationDeliveryService, DeliveryOptions, DeliveryResult } from './services/notification-delivery.service';
import { NotificationQueueService } from './services/notification-queue.service';

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
    private readonly emailService: EmailNotificationService,
    private readonly pushService: PushNotificationService,
    private readonly inAppService: InAppNotificationService,
    private readonly templateService: NotificationTemplateService,
    private readonly deliveryService: NotificationDeliveryService,
    private readonly queueService: NotificationQueueService,
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
    this.logger.log(`Registering device token for user ${userId} on platform ${platform}`);
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
          return await this.sendPushNotificationInternal(notification, user);
        case NotificationDelivery.EMAIL:
          return await this.sendEmailNotificationInternal(notification, user);
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

  private async sendPushNotificationInternal(notification: Notification, user: User): Promise<boolean> {
    const deviceTokens = user.getPushEnabledDeviceTokens();
    
    if (deviceTokens.length === 0) {
      this.logger.log(`No active device tokens for user ${user.id}`);
      return false;
    }

    try {
      // Send push notification using FCM via PushNotificationService
      this.logger.log(`Sending push notification to ${deviceTokens.length} devices for user ${user.id}`);
      
      const result = await this.pushService.sendPushNotification(
        notification,
        user,
        deviceTokens,
        notification.data
      );

      // Handle failed tokens - deactivate them
      if (result.failed > 0) {
        const failedTokens = result.results
          .filter(r => !r.success)
          .map(r => r.deviceToken);
        
        for (const token of failedTokens) {
          // Check if error is due to invalid token
          const failedResult = result.results.find(r => r.deviceToken === token);
          if (failedResult?.error && this.isInvalidTokenError(failedResult.error)) {
            this.logger.warn(`Deactivating invalid device token: ${token.substring(0, 20)}...`);
            await this.deactivateDeviceToken(token);
          }
        }
      }

      // Mark notification as sent if at least one device received it
      if (result.success > 0) {
        await this.markNotificationSent(notification.id);
        this.logger.log(
          `Push notification sent successfully to ${result.success}/${deviceTokens.length} devices for user ${user.id}`
        );
        return true;
      } else {
        // All devices failed
        await this.markNotificationFailed(
          notification.id,
          `Failed to send to all ${deviceTokens.length} devices`
        );
        this.logger.error(`Failed to send push notification to all devices for user ${user.id}`);
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Error sending push notification for user ${user.id}:`,
        error.message,
        error.stack
      );
      await this.markNotificationFailed(notification.id, error.message);
      return false;
    }
  }

  /**
   * Check if the error is due to an invalid or unregistered token
   */
  private isInvalidTokenError(error: string): boolean {
    const invalidTokenErrors = [
      'invalid-registration-token',
      'registration-token-not-registered',
      'invalid-argument',
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered',
    ];
    
    return invalidTokenErrors.some(errorType => 
      error.toLowerCase().includes(errorType.toLowerCase())
    );
  }

  private async sendEmailNotificationInternal(notification: Notification, user: User): Promise<boolean> {
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

  // Enhanced Notification Methods
  async sendNotificationToChannels(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    options: DeliveryOptions & {
      data?: Record<string, any>;
      priority?: NotificationPriority;
    }
  ): Promise<DeliveryResult> {
    try {
      return await this.deliveryService.createAndDeliverNotification(
        userId,
        type,
        title,
        message,
        options
      );
    } catch (error) {
      this.logger.error(`Failed to send notification to channels: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendNotificationFromTemplate(
    userId: string,
    templateType: NotificationType,
    variables: Record<string, any>,
    options: DeliveryOptions
  ): Promise<DeliveryResult> {
    try {
      return await this.deliveryService.createAndDeliverFromTemplate(
        userId,
        templateType,
        variables,
        options
      );
    } catch (error) {
      this.logger.error(`Failed to send notification from template: ${error.message}`, error.stack);
      throw error;
    }
  }

  async queueNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    options: DeliveryOptions & {
      data?: Record<string, any>;
      priority?: NotificationPriority;
      scheduledFor?: Date;
      maxRetries?: number;
    }
  ): Promise<void> {
    try {
      // Create notification first
      const notification = await this.createNotification(
        userId,
        type,
        title,
        message,
        {
          data: options.data,
          priority: options.priority,
          scheduledFor: options.scheduledFor,
        }
      );

      // Queue for delivery
      await this.queueService.queueNotification(
        notification.id,
        userId,
        {
          ...options,
          priority: options.priority || NotificationPriority.NORMAL,
        }
      );

      this.logger.log(`Queued notification ${notification.id} for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to queue notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendBulkNotifications(
    notifications: Array<{
      userId: string;
      type: NotificationType;
      title: string;
      message: string;
      options: DeliveryOptions & {
        data?: Record<string, any>;
        priority?: NotificationPriority;
      };
    }>
  ): Promise<DeliveryResult[]> {
    try {
      const results: DeliveryResult[] = [];

      for (const notificationData of notifications) {
        try {
          const result = await this.sendNotificationToChannels(
            notificationData.userId,
            notificationData.type,
            notificationData.title,
            notificationData.message,
            notificationData.options
          );
          results.push(result);
        } catch (error) {
          this.logger.error(`Failed to send bulk notification to user ${notificationData.userId}: ${error.message}`);
          results.push({
            notificationId: '',
            userId: notificationData.userId,
            channels: {},
            overallSuccess: false,
            totalChannels: notificationData.options.channels.length,
            successfulChannels: 0,
            failedChannels: notificationData.options.channels.length,
          });
        }
      }

      return results;
    } catch (error) {
      this.logger.error(`Failed to send bulk notifications: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Template Management
  async getNotificationTemplates(): Promise<any[]> {
    return this.templateService.getAllTemplates();
  }

  async getNotificationTemplate(type: NotificationType): Promise<any> {
    return this.templateService.getTemplate(type);
  }

  // In-App Notification Methods
  async getInAppNotifications(
    userId: string,
    options?: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
      type?: NotificationType;
      priority?: NotificationPriority;
      category?: string;
    }
  ): Promise<any[]> {
    return this.inAppService.getUserNotifications(userId, options);
  }

  async markInAppNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    return this.inAppService.markAsRead(notificationId, userId);
  }

  async markAllInAppNotificationsAsRead(userId: string): Promise<number> {
    return this.inAppService.markAllAsRead(userId);
  }

  async getInAppUnreadCount(userId: string): Promise<number> {
    return this.inAppService.getUnreadCount(userId);
  }

  async deleteInAppNotification(notificationId: string, userId: string): Promise<void> {
    return this.inAppService.deleteNotification(notificationId, userId);
  }

  async getInAppNotificationStats(userId: string, days: number = 30): Promise<any> {
    return this.inAppService.getNotificationStats(userId, days);
  }

  // Email Notification Methods
  async sendEmailNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    customData?: Record<string, any>
  ): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      const notification = await this.createNotification(
        userId,
        type,
        title,
        message,
        {
          deliveryMethod: NotificationDelivery.EMAIL,
          data: customData,
        }
      );

      return await this.emailService.sendEmailNotification(notification, user, customData);
    } catch (error) {
      this.logger.error(`Failed to send email notification: ${error.message}`, error.stack);
      return false;
    }
  }

  // Push Notification Methods
  async sendPushNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    customData?: Record<string, any>
  ): Promise<any> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      const deviceTokens = await this.getUserDeviceTokens(userId);
      if (deviceTokens.length === 0) {
        throw new Error(`No device tokens found for user ${userId}`);
      }

      const notification = await this.createNotification(
        userId,
        type,
        title,
        message,
        {
          deliveryMethod: NotificationDelivery.PUSH,
          data: customData,
        }
      );

      return await this.pushService.sendPushNotification(notification, user, deviceTokens, customData);
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Queue Management
  async getQueueStats(): Promise<any> {
    return this.queueService.getQueueStats();
  }

  async pauseQueue(): Promise<void> {
    return this.queueService.pauseQueue();
  }

  async resumeQueue(): Promise<void> {
    return this.queueService.resumeQueue();
  }

  async getProcessingStatus(): Promise<any> {
    return this.queueService.getProcessingStatus();
  }

  // FCM Topic Management
  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    return this.pushService.subscribeToTopic(tokens, topic);
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    return this.pushService.unsubscribeFromTopic(tokens, topic);
  }

  async sendToTopic(
    topic: string,
    type: NotificationType,
    title: string,
    message: string,
    customData?: Record<string, any>
  ): Promise<void> {
    const notification = await this.createNotification(
      'system', // System notification for topics
      type,
      title,
      message,
      {
        deliveryMethod: NotificationDelivery.PUSH,
        data: customData,
      }
    );

    return this.pushService.sendToTopic(topic, notification, customData);
  }

  // Delivery Statistics
  async getDeliveryStatistics(userId?: string, days: number = 7): Promise<any> {
    return this.deliveryService.getDeliveryStatistics(userId, days);
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