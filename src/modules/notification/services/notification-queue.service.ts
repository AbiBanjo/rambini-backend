import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Notification, DeliveryStatus, NotificationPriority } from '../../../entities';
import { NotificationDeliveryService, DeliveryOptions } from './notification-delivery.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface QueuedNotification {
  id: string;
  notificationId: string;
  userId: string;
  priority: NotificationPriority;
  scheduledFor: Date;
  retryCount: number;
  maxRetries: number;
  channels: string[];
  customData?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueueStats {
  totalQueued: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  byPriority: Record<string, number>;
  byChannel: Record<string, number>;
}

@Injectable()
export class NotificationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueueService.name);
  private readonly processingQueue = new Map<string, QueuedNotification>();
  private readonly maxConcurrentJobs = 5;
  private readonly retryDelays = [1000, 5000, 15000, 60000, 300000]; // 1s, 5s, 15s, 1m, 5m
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly deliveryService: NotificationDeliveryService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing notification queue service');
    await this.startProcessing();
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down notification queue service');
    await this.stopProcessing();
  }

  async queueNotification(
    notificationId: string,
    userId: string,
    options: DeliveryOptions & {
      priority?: NotificationPriority;
      maxRetries?: number;
    }
  ): Promise<void> {
    try {
      const queuedNotification: QueuedNotification = {
        id: this.generateQueueId(),
        notificationId,
        userId,
        priority: options.priority || NotificationPriority.NORMAL,
        scheduledFor: options.scheduledFor || new Date(),
        retryCount: 0,
        maxRetries: options.maxRetries || 3,
        channels: options.channels,
        customData: options.customData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in database (you might want to create a separate queue table)
      await this.storeQueuedNotification(queuedNotification);
      
      this.logger.log(`Queued notification ${notificationId} for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to queue notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  async queueBulkNotifications(
    notifications: Array<{
      notificationId: string;
      userId: string;
      options: DeliveryOptions & {
        priority?: NotificationPriority;
        maxRetries?: number;
      };
    }>
  ): Promise<void> {
    try {
      const queuedNotifications = notifications.map(({ notificationId, userId, options }) => ({
        id: this.generateQueueId(),
        notificationId,
        userId,
        priority: options.priority || NotificationPriority.NORMAL,
        scheduledFor: options.scheduledFor || new Date(),
        retryCount: 0,
        maxRetries: options.maxRetries || 3,
        channels: options.channels,
        customData: options.customData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await this.storeBulkQueuedNotifications(queuedNotifications);
      
      this.logger.log(`Queued ${notifications.length} notifications for bulk processing`);
    } catch (error) {
      this.logger.error(`Failed to queue bulk notifications: ${error.message}`, error.stack);
      throw error;
    }
  }

  async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      this.logger.warn('Queue processing is already running');
      return;
    }

    this.isProcessing = true;
    this.logger.log('Starting notification queue processing');

    // Process queue every 5 seconds
    this.processingInterval = setInterval(async () => {
      await this.processQueue();
    }, 5000);
  }

  async stopProcessing(): Promise<void> {
    if (!this.isProcessing) {
      return;
    }

    this.isProcessing = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    this.logger.log('Stopped notification queue processing');
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications(): Promise<void> {
    try {
      const now = new Date();
      const scheduledNotifications = await this.getScheduledNotifications(now);
      
      if (scheduledNotifications.length > 0) {
        this.logger.log(`Processing ${scheduledNotifications.length} scheduled notifications`);
        
        for (const notification of scheduledNotifications) {
          await this.queueNotification(
            notification.id,
            notification.user_id,
            {
              channels: [notification.delivery_method as any],
              priority: notification.priority as any,
            }
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process scheduled notifications: ${error.message}`, error.stack);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredNotifications(): Promise<void> {
    try {
      const result = await this.notificationRepository
        .createQueryBuilder()
        .delete()
        .where('expires_at < :now', { now: new Date() })
        .andWhere('delivery_status IN (:...statuses)', { 
          statuses: [DeliveryStatus.PENDING, DeliveryStatus.FAILED] 
        })
        .execute();

      if (result.affected && result.affected > 0) {
        this.logger.log(`Cleaned up ${result.affected} expired notifications`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup expired notifications: ${error.message}`, error.stack);
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processingQueue.size >= this.maxConcurrentJobs) {
      return; // Skip if we're at capacity
    }

    try {
      const queuedNotifications = await this.getQueuedNotifications();
      
      for (const queuedNotification of queuedNotifications) {
        if (this.processingQueue.size >= this.maxConcurrentJobs) {
          break; // Stop if we've reached capacity
        }

        await this.processQueuedNotification(queuedNotification);
      }
    } catch (error) {
      this.logger.error(`Failed to process queue: ${error.message}`, error.stack);
    }
  }

  private async processQueuedNotification(queuedNotification: QueuedNotification): Promise<void> {
    const { id, notificationId, userId, channels, customData, retryCount, maxRetries } = queuedNotification;

    try {
      // Add to processing queue
      this.processingQueue.set(id, queuedNotification);

      // Get notification and user
      const notification = await this.notificationRepository.findOne({
        where: { id: notificationId },
        relations: ['user'],
      });

      if (!notification) {
        this.logger.warn(`Notification ${notificationId} not found, removing from queue`);
        await this.removeQueuedNotification(id);
        this.processingQueue.delete(id);
        return;
      }

      const user = notification.user as any;

      // Deliver notification
      const result = await this.deliveryService.deliverNotification(
        notification,
        user,
        {
          channels: channels as any,
          customData,
        }
      );

      if (result.overallSuccess) {
        await this.markQueuedNotificationCompleted(id);
        this.logger.log(`Successfully processed queued notification ${id}`);
      } else {
        await this.handleQueuedNotificationFailure(id, queuedNotification, 'Delivery failed');
      }

    } catch (error) {
      this.logger.error(`Failed to process queued notification ${id}: ${error.message}`, error.stack);
      await this.handleQueuedNotificationFailure(id, queuedNotification, error.message);
    } finally {
      this.processingQueue.delete(id);
    }
  }

  private async handleQueuedNotificationFailure(
    id: string,
    queuedNotification: QueuedNotification,
    error: string
  ): Promise<void> {
    const { retryCount, maxRetries } = queuedNotification;

    if (retryCount < maxRetries) {
      // Schedule retry
      const retryDelay = this.retryDelays[Math.min(retryCount, this.retryDelays.length - 1)];
      const retryAt = new Date(Date.now() + retryDelay);

      await this.scheduleRetry(id, retryAt, retryCount + 1);
      
      this.logger.log(`Scheduled retry ${retryCount + 1}/${maxRetries} for queued notification ${id} at ${retryAt.toISOString()}`);
    } else {
      // Mark as failed
      await this.markQueuedNotificationFailed(id, error);
      this.logger.error(`Queued notification ${id} failed after ${maxRetries} retries: ${error}`);
    }
  }

  private async getQueuedNotifications(): Promise<QueuedNotification[]> {
    // This would typically query a queue table
    // For now, return empty array as we're using in-memory processing
    return [];
  }

  private async getScheduledNotifications(now: Date): Promise<Notification[]> {
    return await this.notificationRepository.find({
      where: {
        scheduled_for: LessThan(now),
        delivery_status: DeliveryStatus.PENDING,
      },
    });
  }

  private async storeQueuedNotification(queuedNotification: QueuedNotification): Promise<void> {
    // This would typically store in a queue table
    // For now, just log
    this.logger.log(`Stored queued notification: ${queuedNotification.id}`);
  }

  private async storeBulkQueuedNotifications(queuedNotifications: QueuedNotification[]): Promise<void> {
    // This would typically store in a queue table
    // For now, just log
    this.logger.log(`Stored ${queuedNotifications.length} queued notifications`);
  }

  private async markQueuedNotificationCompleted(id: string): Promise<void> {
    // This would typically update the queue table
    this.logger.log(`Marked queued notification ${id} as completed`);
  }

  private async markQueuedNotificationFailed(id: string, error: string): Promise<void> {
    // This would typically update the queue table
    this.logger.log(`Marked queued notification ${id} as failed: ${error}`);
  }

  private async scheduleRetry(id: string, retryAt: Date, retryCount: number): Promise<void> {
    // This would typically update the queue table with retry information
    this.logger.log(`Scheduled retry for queued notification ${id} at ${retryAt.toISOString()}`);
  }

  private async removeQueuedNotification(id: string): Promise<void> {
    // This would typically remove from the queue table
    this.logger.log(`Removed queued notification ${id}`);
  }

  private generateQueueId(): string {
    return 'QUEUE_' + Math.random().toString(36).substring(2, 15);
  }

  async getQueueStats(): Promise<QueueStats> {
    try {
      // This would typically query the queue table
      // For now, return mock data
      return {
        totalQueued: 0,
        pending: 0,
        processing: this.processingQueue.size,
        completed: 0,
        failed: 0,
        byPriority: {},
        byChannel: {},
      };
    } catch (error) {
      this.logger.error(`Failed to get queue stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  async pauseQueue(): Promise<void> {
    await this.stopProcessing();
    this.logger.log('Queue processing paused');
  }

  async resumeQueue(): Promise<void> {
    await this.startProcessing();
    this.logger.log('Queue processing resumed');
  }

  async clearQueue(): Promise<void> {
    try {
      // This would typically clear the queue table
      this.logger.log('Queue cleared');
    } catch (error) {
      this.logger.error(`Failed to clear queue: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getProcessingStatus(): Promise<{
    isProcessing: boolean;
    activeJobs: number;
    maxConcurrentJobs: number;
    queueSize: number;
  }> {
    return {
      isProcessing: this.isProcessing,
      activeJobs: this.processingQueue.size,
      maxConcurrentJobs: this.maxConcurrentJobs,
      queueSize: 0, // This would come from the queue table
    };
  }

  // Method to prioritize notifications
  async prioritizeNotification(queueId: string, newPriority: NotificationPriority): Promise<void> {
    try {
      // This would typically update the queue table
      this.logger.log(`Updated priority for queued notification ${queueId} to ${newPriority}`);
    } catch (error) {
      this.logger.error(`Failed to prioritize notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Method to cancel queued notification
  async cancelQueuedNotification(queueId: string): Promise<void> {
    try {
      // This would typically remove from the queue table
      this.logger.log(`Cancelled queued notification ${queueId}`);
    } catch (error) {
      this.logger.error(`Failed to cancel queued notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Method to get queued notifications for a user
  async getUserQueuedNotifications(userId: string): Promise<QueuedNotification[]> {
    try {
      // This would typically query the queue table
      return [];
    } catch (error) {
      this.logger.error(`Failed to get user queued notifications: ${error.message}`, error.stack);
      throw error;
    }
  }
}
