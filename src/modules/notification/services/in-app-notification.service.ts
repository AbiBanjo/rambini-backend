import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, User, NotificationType, NotificationPriority } from '../../../entities';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface InAppNotificationData {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: NotificationPriority;
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
  actionUrl?: string;
  imageUrl?: string;
  category?: string;
}

export interface NotificationPreferences {
  userId: string;
  inAppEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  showBadge: boolean;
  categories: {
    [key in NotificationType]?: {
      enabled: boolean;
      sound: boolean;
      vibration: boolean;
    };
  };
}

@Injectable()
export class InAppNotificationService {
  private readonly logger = new Logger(InAppNotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createInAppNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      data?: Record<string, any>;
      priority?: NotificationPriority;
      actionUrl?: string;
      imageUrl?: string;
      category?: string;
      scheduledFor?: Date;
      expiresAt?: Date;
    }
  ): Promise<InAppNotificationData> {
    try {
      const notification = this.notificationRepository.create({
        user_id: userId,
        notification_type: type,
        title,
        message,
        data: options?.data,
        priority: options?.priority || NotificationPriority.NORMAL,
        delivery_method: 'IN_APP' as any,
        scheduled_for: options?.scheduledFor,
        expires_at: options?.expiresAt,
        delivery_status: 'PENDING' as any,
      });

      const savedNotification = await this.notificationRepository.save(notification);

      // Emit real-time event for WebSocket/SSE
      this.emitNotificationEvent(userId, savedNotification);

      // Get user preferences to determine if we should show additional effects
      const preferences = await this.getUserNotificationPreferences(userId);
      if (preferences.inAppEnabled) {
        this.emitNotificationEffects(userId, savedNotification, preferences);
      }

      return this.mapToInAppData(savedNotification);
    } catch (error) {
      this.logger.error(`Failed to create in-app notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUserNotifications(
    userId: string,
    options?: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
      type?: NotificationType;
      priority?: NotificationPriority;
      category?: string;
    }
  ): Promise<InAppNotificationData[]> {
    try {
      const query = this.notificationRepository.createQueryBuilder('notification')
        .where('notification.user_id = :userId', { userId })
        .andWhere('notification.delivery_method = :method', { method: 'IN_APP' })
        .orderBy('notification.created_at', 'DESC');

      if (options?.unreadOnly) {
        query.andWhere('notification.is_read = :isRead', { isRead: false });
      }

      if (options?.type) {
        query.andWhere('notification.notification_type = :type', { type: options.type });
      }

      if (options?.priority) {
        query.andWhere('notification.priority = :priority', { priority: options.priority });
      }

      if (options?.category) {
        query.andWhere('notification.data->>:category IS NOT NULL', { category: 'category' });
        query.andWhere('notification.data->>:category = :categoryValue', { 
          category: 'category', 
          categoryValue: options.category 
        });
      }

      if (options?.limit) {
        query.limit(options.limit);
      }

      if (options?.offset) {
        query.offset(options.offset);
      }

      const notifications = await query.getMany();
      return notifications.map(notification => this.mapToInAppData(notification));
    } catch (error) {
      this.logger.error(`Failed to get user notifications: ${error.message}`, error.stack);
      throw error;
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const result = await this.notificationRepository.update(
        { id: notificationId, user_id: userId },
        {
          is_read: true,
          read_at: new Date(),
        }
      );

      if (result.affected === 0) {
        throw new Error('Notification not found or already read');
      }

      // Emit read event for real-time updates
      this.eventEmitter.emit('notification.read', {
        notificationId,
        userId,
        readAt: new Date(),
      });

      this.logger.log(`Notification ${notificationId} marked as read by user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to mark notification as read: ${error.message}`, error.stack);
      throw error;
    }
  }

  async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await this.notificationRepository.update(
        { 
          user_id: userId, 
          is_read: false,
          delivery_method: 'IN_APP' as any,
        },
        {
          is_read: true,
          read_at: new Date(),
        }
      );

      const affectedCount = result.affected || 0;

      // Emit bulk read event
      this.eventEmitter.emit('notifications.bulk.read', {
        userId,
        count: affectedCount,
        readAt: new Date(),
      });

      this.logger.log(`Marked ${affectedCount} notifications as read for user ${userId}`);
      return affectedCount;
    } catch (error) {
      this.logger.error(`Failed to mark all notifications as read: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await this.notificationRepository.count({
        where: {
          user_id: userId,
          is_read: false,
          delivery_method: 'IN_APP' as any,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to get unread count: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      const result = await this.notificationRepository.delete({
        id: notificationId,
        user_id: userId,
        delivery_method: 'IN_APP' as any,
      });

      if (result.affected === 0) {
        throw new Error('Notification not found');
      }

      // Emit delete event
      this.eventEmitter.emit('notification.deleted', {
        notificationId,
        userId,
        deletedAt: new Date(),
      });

      this.logger.log(`Notification ${notificationId} deleted by user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to delete notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteAllNotifications(userId: string, olderThan?: Date): Promise<number> {
    try {
      const query = this.notificationRepository.createQueryBuilder()
        .delete()
        .where('user_id = :userId', { userId })
        .andWhere('delivery_method = :method', { method: 'IN_APP' });

      if (olderThan) {
        query.andWhere('created_at < :olderThan', { olderThan });
      }

      const result = await query.execute();
      const affectedCount = result.affected || 0;

      // Emit bulk delete event
      this.eventEmitter.emit('notifications.bulk.deleted', {
        userId,
        count: affectedCount,
        deletedAt: new Date(),
      });

      this.logger.log(`Deleted ${affectedCount} notifications for user ${userId}`);
      return affectedCount;
    } catch (error) {
      this.logger.error(`Failed to delete notifications: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      // This would typically come from a user preferences table
      // For now, return default preferences
      return {
        userId,
        inAppEnabled: true,
        soundEnabled: true,
        vibrationEnabled: true,
        showBadge: true,
        categories: {
          [NotificationType.ORDER_UPDATE]: {
            enabled: true,
            sound: true,
            vibration: true,
          },
          [NotificationType.PAYMENT]: {
            enabled: true,
            sound: true,
            vibration: true,
          },
          [NotificationType.PROMOTION]: {
            enabled: true,
            sound: false,
            vibration: false,
          },
          [NotificationType.SYSTEM]: {
            enabled: true,
            sound: false,
            vibration: false,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get user preferences: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      // This would typically update a user preferences table
      this.logger.log(`Updated notification preferences for user ${userId}`);
      
      // Emit preferences update event
      this.eventEmitter.emit('notification.preferences.updated', {
        userId,
        preferences,
        updatedAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to update preferences: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getNotificationStats(userId: string, days: number = 30): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    readRate: number;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const notifications = await this.notificationRepository.find({
        where: {
          user_id: userId,
          delivery_method: 'IN_APP' as any,
          created_at: { $gte: startDate } as any,
        },
      });

      const total = notifications.length;
      const unread = notifications.filter(n => !n.is_read).length;
      const readRate = total > 0 ? ((total - unread) / total) * 100 : 0;

      const byType = notifications.reduce((acc, n) => {
        acc[n.notification_type] = (acc[n.notification_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const byPriority = notifications.reduce((acc, n) => {
        acc[n.priority] = (acc[n.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total,
        unread,
        byType,
        byPriority,
        readRate: Math.round(readRate * 100) / 100,
      };
    } catch (error) {
      this.logger.error(`Failed to get notification stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  private mapToInAppData(notification: Notification): InAppNotificationData {
    return {
      id: notification.id,
      userId: notification.user_id,
      type: notification.notification_type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      priority: notification.priority,
      isRead: notification.is_read,
      createdAt: notification.created_at,
      readAt: notification.read_at,
      actionUrl: notification.data?.actionUrl,
      imageUrl: notification.data?.imageUrl,
      category: notification.data?.category,
    };
  }

  private emitNotificationEvent(userId: string, notification: Notification): void {
    this.eventEmitter.emit('notification.created', {
      userId,
      notification: this.mapToInAppData(notification),
      timestamp: new Date(),
    });
  }

  private emitNotificationEffects(
    userId: string,
    notification: Notification,
    preferences: NotificationPreferences
  ): void {
    const categoryPrefs = preferences.categories[notification.notification_type];
    
    if (categoryPrefs?.enabled) {
      this.eventEmitter.emit('notification.effects', {
        userId,
        notificationId: notification.id,
        type: notification.notification_type,
        priority: notification.priority,
        sound: categoryPrefs.sound && preferences.soundEnabled,
        vibration: categoryPrefs.vibration && preferences.vibrationEnabled,
        showBadge: preferences.showBadge,
      });
    }
  }

  // Method to get real-time notification stream for WebSocket/SSE
  async getNotificationStream(userId: string): Promise<AsyncIterable<InAppNotificationData>> {
    // This would typically be implemented with WebSocket or Server-Sent Events
    // For now, return an empty async iterator
    return {
      [Symbol.asyncIterator]: async function* () {
        // Implementation would go here
        yield;
      }
    };
  }

  // Method to batch create notifications for multiple users
  async createBulkNotifications(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      data?: Record<string, any>;
      priority?: NotificationPriority;
      actionUrl?: string;
      imageUrl?: string;
      category?: string;
    }
  ): Promise<InAppNotificationData[]> {
    try {
      const notifications = userIds.map(userId => 
        this.notificationRepository.create({
          user_id: userId,
          notification_type: type,
          title,
          message,
          data: options?.data,
          priority: options?.priority || NotificationPriority.NORMAL,
          delivery_method: 'IN_APP' as any,
          delivery_status: 'PENDING' as any,
        })
      );

      const savedNotifications = await this.notificationRepository.save(notifications);

      // Emit bulk notification event
      this.eventEmitter.emit('notifications.bulk.created', {
        userIds,
        count: savedNotifications.length,
        type,
        timestamp: new Date(),
      });

      return savedNotifications.map(notification => this.mapToInAppData(notification));
    } catch (error) {
      this.logger.error(`Failed to create bulk notifications: ${error.message}`, error.stack);
      throw error;
    }
  }
}
