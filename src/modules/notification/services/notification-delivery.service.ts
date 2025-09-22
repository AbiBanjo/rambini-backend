import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, User, DeviceToken, NotificationType, NotificationDelivery, DeliveryStatus, NotificationPriority } from '../../../entities';
import { EmailNotificationService } from './email-notification.service';
import { PushNotificationService } from './push-notification.service';
import { InAppNotificationService } from './in-app-notification.service';
import { NotificationTemplateService } from './notification-template.service';

export interface DeliveryOptions {
  channels: NotificationDelivery[];
  priority?: NotificationPriority;
  scheduledFor?: Date;
  expiresAt?: Date;
  retryAttempts?: number;
  retryDelay?: number;
  customData?: Record<string, any>;
}

export interface DeliveryResult {
  notificationId: string;
  userId: string;
  channels: {
    [key in NotificationDelivery]?: {
      success: boolean;
      messageId?: string;
      error?: string;
      deliveredAt?: Date;
    };
  };
  overallSuccess: boolean;
  totalChannels: number;
  successfulChannels: number;
  failedChannels: number;
}

export interface BulkDeliveryResult {
  totalNotifications: number;
  successfulNotifications: number;
  failedNotifications: number;
  results: DeliveryResult[];
}

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepository: Repository<DeviceToken>,
    private readonly emailService: EmailNotificationService,
    private readonly pushService: PushNotificationService,
    private readonly inAppService: InAppNotificationService,
    private readonly templateService: NotificationTemplateService,
  ) {}

  async deliverNotification(
    notification: Notification,
    user: User,
    options: DeliveryOptions
  ): Promise<DeliveryResult> {
    const result: DeliveryResult = {
      notificationId: notification.id,
      userId: user.id,
      channels: {},
      overallSuccess: false,
      totalChannels: options.channels.length,
      successfulChannels: 0,
      failedChannels: 0,
    };

    this.logger.log(`Delivering notification ${notification.id} to user ${user.id} via ${options.channels.join(', ')}`);

    // Process each channel
    for (const channel of options.channels) {
      try {
        const channelResult = await this.deliverToChannel(notification, user, channel, options);
        result.channels[channel] = channelResult;
        
        if (channelResult.success) {
          result.successfulChannels++;
        } else {
          result.failedChannels++;
        }
      } catch (error) {
        this.logger.error(`Failed to deliver to ${channel} channel: ${error.message}`, error.stack);
        result.channels[channel] = {
          success: false,
          error: error.message,
        };
        result.failedChannels++;
      }
    }

    result.overallSuccess = result.successfulChannels > 0;
    
    // Update notification status
    await this.updateNotificationStatus(notification.id, result);

    this.logger.log(`Delivery completed for notification ${notification.id}: ${result.successfulChannels}/${result.totalChannels} channels successful`);
    
    return result;
  }

  async deliverToChannel(
    notification: Notification,
    user: User,
    channel: NotificationDelivery,
    options: DeliveryOptions
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    deliveredAt?: Date;
  }> {
    try {
      switch (channel) {
        case NotificationDelivery.IN_APP:
          return await this.deliverInApp(notification, user, options);
        case NotificationDelivery.PUSH:
          return await this.deliverPush(notification, user, options);
        case NotificationDelivery.EMAIL:
          return await this.deliverEmail(notification, user, options);
        case NotificationDelivery.SMS:
          return await this.deliverSMS(notification, user, options);
        default:
          throw new Error(`Unsupported delivery channel: ${channel}`);
      }
    } catch (error) {
      this.logger.error(`Channel delivery failed for ${channel}: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async deliverInApp(
    notification: Notification,
    user: User,
    options: DeliveryOptions
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    deliveredAt?: Date;
  }> {
    try {
      // For in-app notifications, we just need to ensure the notification is properly stored
      // The in-app service handles the real-time delivery
      await this.inAppService.createInAppNotification(
        user.id,
        notification.notification_type,
        notification.title,
        notification.message,
        {
          data: { ...notification.data, ...options.customData },
          priority: notification.priority as any,
          actionUrl: notification.data?.actionUrl,
          imageUrl: notification.data?.imageUrl,
          category: notification.data?.category,
        }
      );

      return {
        success: true,
        messageId: notification.id,
        deliveredAt: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async deliverPush(
    notification: Notification,
    user: User,
    options: DeliveryOptions
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    deliveredAt?: Date;
  }> {
    try {
      // Get user's device tokens
      const deviceTokens = await this.deviceTokenRepository.find({
        where: { user_id: user.id, is_active: true },
      });

      if (deviceTokens.length === 0) {
        return {
          success: false,
          error: 'No active device tokens found',
        };
      }

      // Send push notification
      const pushResult = await this.pushService.sendPushNotification(
        notification,
        user,
        deviceTokens,
        options.customData
      );

      if (pushResult.success > 0) {
        return {
          success: true,
          messageId: `push_${notification.id}`,
          deliveredAt: new Date(),
        };
      } else {
        return {
          success: false,
          error: 'All push notifications failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async deliverEmail(
    notification: Notification,
    user: User,
    options: DeliveryOptions
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    deliveredAt?: Date;
  }> {
    try {
      if (!user.email) {
        return {
          success: false,
          error: 'User email not available',
        };
      }

      const success = await this.emailService.sendEmailNotification(
        notification,
        user,
        options.customData
      );

      return {
        success,
        messageId: success ? `email_${notification.id}` : undefined,
        error: success ? undefined : 'Email delivery failed',
        deliveredAt: success ? new Date() : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async deliverSMS(
    notification: Notification,
    user: User,
    options: DeliveryOptions
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    deliveredAt?: Date;
  }> {
    try {
      if (!user.phone_number) {
        return {
          success: false,
          error: 'User phone number not available',
        };
      }

      // SMS service would be implemented here
      // For now, return a placeholder response
      this.logger.log(`SMS notification would be sent to ${user.phone_number}: ${notification.message}`);
      
      return {
        success: true,
        messageId: `sms_${notification.id}`,
        deliveredAt: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async deliverBulkNotifications(
    notifications: Array<{ notification: Notification; user: User; options: DeliveryOptions }>
  ): Promise<BulkDeliveryResult> {
    const results: DeliveryResult[] = [];
    let successfulNotifications = 0;
    let failedNotifications = 0;

    this.logger.log(`Starting bulk delivery for ${notifications.length} notifications`);

    // Process notifications in parallel (with concurrency limit)
    const concurrencyLimit = 10;
    const chunks = this.chunkArray(notifications, concurrencyLimit);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async ({ notification, user, options }) => {
        try {
          const result = await this.deliverNotification(notification, user, options);
          results.push(result);
          
          if (result.overallSuccess) {
            successfulNotifications++;
          } else {
            failedNotifications++;
          }
        } catch (error) {
          this.logger.error(`Bulk delivery failed for notification ${notification.id}: ${error.message}`);
          failedNotifications++;
          results.push({
            notificationId: notification.id,
            userId: user.id,
            channels: {},
            overallSuccess: false,
            totalChannels: options.channels.length,
            successfulChannels: 0,
            failedChannels: options.channels.length,
          });
        }
      });

      await Promise.allSettled(chunkPromises);
    }

    this.logger.log(`Bulk delivery completed: ${successfulNotifications} successful, ${failedNotifications} failed`);

    return {
      totalNotifications: notifications.length,
      successfulNotifications,
      failedNotifications,
      results,
    };
  }

  async createAndDeliverNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    options: DeliveryOptions & {
      data?: Record<string, any>;
      priority?: any;
    }
  ): Promise<DeliveryResult> {
    try {
      // Get user
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Create notification
      const notification = this.notificationRepository.create({
        user_id: userId,
        notification_type: type,
        title,
        message,
        data: options.data,
        priority: options.priority || 'NORMAL',
        delivery_method: options.channels[0] || NotificationDelivery.IN_APP,
        scheduled_for: options.scheduledFor,
        expires_at: options.expiresAt,
        delivery_status: DeliveryStatus.PENDING,
      });

      const savedNotification = await this.notificationRepository.save(notification);

      // Deliver notification
      return await this.deliverNotification(savedNotification, user, options);
    } catch (error) {
      this.logger.error(`Failed to create and deliver notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  async createAndDeliverFromTemplate(
    userId: string,
    templateType: NotificationType,
    variables: Record<string, any>,
    options: DeliveryOptions
  ): Promise<DeliveryResult> {
    try {
      // Get template
      const template = this.templateService.getTemplate(templateType);
      if (!template) {
        throw new Error(`Template not found for type: ${templateType}`);
      }

      // Validate variables
      const validation = this.templateService.validateVariables(template, variables);
      if (!validation.valid) {
        throw new Error(`Invalid variables: missing=${validation.missing.join(',')}, invalid=${validation.invalid.join(',')}`);
      }

      // Get user
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Render templates for each channel
      const renderedTemplates = {
        inApp: this.templateService.renderTemplate(template, 'inApp', variables),
        push: this.templateService.renderTemplate(template, 'push', variables),
        email: this.templateService.renderTemplate(template, 'email', variables),
      };

      // Create notification with rendered content
      const notification = this.notificationRepository.create({
        user_id: userId,
        notification_type: templateType,
        title: template.channels.inApp.title,
        message: template.channels.inApp.message,
        data: {
          ...variables,
          renderedTemplates,
          templateId: template.id,
        },
        priority: template.priority,
        delivery_method: options.channels[0] || NotificationDelivery.IN_APP,
        scheduled_for: options.scheduledFor,
        expires_at: options.expiresAt,
        delivery_status: DeliveryStatus.PENDING,
      });

      const savedNotification = await this.notificationRepository.save(notification);

      // Deliver notification
      return await this.deliverNotification(savedNotification, user, options);
    } catch (error) {
      this.logger.error(`Failed to create and deliver from template: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async updateNotificationStatus(notificationId: string, result: DeliveryResult): Promise<void> {
    try {
      const status = result.overallSuccess ? DeliveryStatus.SENT : DeliveryStatus.FAILED;
      
      await this.notificationRepository.update(
        { id: notificationId },
        {
          delivery_status: status,
          sent_at: result.overallSuccess ? new Date() : undefined,
        }
      );
    } catch (error) {
      this.logger.error(`Failed to update notification status: ${error.message}`, error.stack);
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Method to get delivery statistics
  async getDeliveryStatistics(
    userId?: string,
    days: number = 7
  ): Promise<{
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    successRate: number;
    byChannel: Record<string, { total: number; successful: number; failed: number; successRate: number }>;
    byType: Record<string, { total: number; successful: number; failed: number; successRate: number }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const query = this.notificationRepository.createQueryBuilder('notification')
        .where('notification.created_at >= :startDate', { startDate });

      if (userId) {
        query.andWhere('notification.user_id = :userId', { userId });
      }

      const notifications = await query.getMany();

      const stats = {
        totalDeliveries: notifications.length,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        successRate: 0,
        byChannel: {} as Record<string, { total: number; successful: number; failed: number; successRate: number }>,
        byType: {} as Record<string, { total: number; successful: number; failed: number; successRate: number }>,
      };

      // Process notifications
      notifications.forEach(notification => {
        const isSuccessful = notification.delivery_status === DeliveryStatus.SENT || 
                           notification.delivery_status === DeliveryStatus.DELIVERED;
        
        if (isSuccessful) {
          stats.successfulDeliveries++;
        } else {
          stats.failedDeliveries++;
        }

        // By channel
        const channel = notification.delivery_method;
        if (!stats.byChannel[channel]) {
          stats.byChannel[channel] = { total: 0, successful: 0, failed: 0, successRate: 0 };
        }
        stats.byChannel[channel].total++;
        if (isSuccessful) {
          stats.byChannel[channel].successful++;
        } else {
          stats.byChannel[channel].failed++;
        }

        // By type
        const type = notification.notification_type;
        if (!stats.byType[type]) {
          stats.byType[type] = { total: 0, successful: 0, failed: 0, successRate: 0 };
        }
        stats.byType[type].total++;
        if (isSuccessful) {
          stats.byType[type].successful++;
        } else {
          stats.byType[type].failed++;
        }
      });

      // Calculate success rates
      stats.successRate = stats.totalDeliveries > 0 ? 
        (stats.successfulDeliveries / stats.totalDeliveries) * 100 : 0;

      Object.keys(stats.byChannel).forEach(channel => {
        const channelStats = stats.byChannel[channel];
        channelStats.successRate = channelStats.total > 0 ? 
          (channelStats.successful / channelStats.total) * 100 : 0;
      });

      Object.keys(stats.byType).forEach(type => {
        const typeStats = stats.byType[type];
        typeStats.successRate = typeStats.total > 0 ? 
          (typeStats.successful / typeStats.total) * 100 : 0;
      });

      return stats;
    } catch (error) {
      this.logger.error(`Failed to get delivery statistics: ${error.message}`, error.stack);
      throw error;
    }
  }
}
