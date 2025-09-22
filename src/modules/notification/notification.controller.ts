import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import {
  Notification,
  NotificationType,
  NotificationDelivery,
  DeviceToken,
  UserNotificationPreference,
  NotificationPriority,
} from '../../entities';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // Notification Management
  @Get()
  async getUserNotifications(
    @Request() req,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('type') type?: NotificationType,
  ): Promise<Notification[]> {
    return this.notificationService.getUserNotifications(req.user.id, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      type,
    });
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req): Promise<{ count: number }> {
    const count = await this.notificationService.getUnreadNotificationCount(req.user.id);
    return { count };
  }

  @Put(':id/read')
  async markAsRead(@Param('id') id: string): Promise<void> {
    await this.notificationService.markNotificationAsRead(id);
  }

  // Device Token Management
  @Post('device-tokens')
  async registerDeviceToken(
    @Request() req,
    @Body() body: {
      token: string;
      platform: string;
      deviceId?: string;
      deviceModel?: string;
      appVersion?: string;
      osVersion?: string;
    },
  ): Promise<DeviceToken> {
    return this.notificationService.registerDeviceToken(
      req.user.id,
      body.token,
      body.platform,
      {
        deviceId: body.deviceId,
        deviceModel: body.deviceModel,
        appVersion: body.appVersion,
        osVersion: body.osVersion,
      },
    );
  }

  @Delete('device-tokens/:token')
  async deactivateDeviceToken(@Param('token') token: string): Promise<void> {
    await this.notificationService.deactivateDeviceToken(token);
  }

  @Get('device-tokens')
  async getUserDeviceTokens(@Request() req): Promise<DeviceToken[]> {
    return this.notificationService.getUserDeviceTokens(req.user.id);
  }

  // User Preference Management
  @Get('preferences')
  async getUserPreferences(@Request() req): Promise<UserNotificationPreference[]> {
    return this.notificationService.getUserNotificationPreferences(req.user.id);
  }

  @Put('preferences/:type')
  async updatePreference(
    @Request() req,
    @Param('type') type: NotificationType,
    @Body() preferences: {
      in_app_enabled?: boolean;
      push_enabled?: boolean;
      sms_enabled?: boolean;
      email_enabled?: boolean;
    },
  ): Promise<UserNotificationPreference> {
    return this.notificationService.updateNotificationPreference(
      req.user.id,
      type,
      preferences,
    );
  }

  @Post('preferences/default')
  async setDefaultPreferences(@Request() req): Promise<void> {
    await this.notificationService.setDefaultPreferences(req.user.id);
  }

  // Admin/System Endpoints (would need proper admin guards)
  @Post('system')
  async createSystemNotification(
    @Body() body: {
      userId: string;
      title: string;
      message: string;
      priority?: string;
    },
  ): Promise<Notification> {
    return this.notificationService.createNotification(
      body.userId,
      NotificationType.SYSTEM,
      body.title,
      body.message,
      {
        priority: body.priority as any,
        deliveryMethod: NotificationDelivery.IN_APP,
      },
    );
  }

  @Post('broadcast')
  async createBroadcastNotification(
    @Body() body: {
      title: string;
      message: string;
      priority?: string;
      type?: NotificationType;
    },
  ): Promise<void> {
    // This would need to be implemented to send to multiple users
    // For now, just log the intent
    console.log('Broadcast notification requested:', body);
  }

  // Enhanced Notification Endpoints
  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendNotificationToChannels(
    @Request() req,
    @Body() body: {
      type: NotificationType;
      title: string;
      message: string;
      channels: NotificationDelivery[];
      data?: Record<string, any>;
      priority?: NotificationPriority;
      scheduledFor?: Date;
      expiresAt?: Date;
    },
  ): Promise<any> {
    return this.notificationService.sendNotificationToChannels(
      req.user.id,
      body.type,
      body.title,
      body.message,
      {
        channels: body.channels,
        data: body.data,
        priority: body.priority,
        scheduledFor: body.scheduledFor,
        expiresAt: body.expiresAt,
      }
    );
  }

  @Post('send-from-template')
  @HttpCode(HttpStatus.OK)
  async sendNotificationFromTemplate(
    @Request() req,
    @Body() body: {
      templateType: NotificationType;
      variables: Record<string, any>;
      channels: NotificationDelivery[];
      scheduledFor?: Date;
      expiresAt?: Date;
    },
  ): Promise<any> {
    return this.notificationService.sendNotificationFromTemplate(
      req.user.id,
      body.templateType,
      body.variables,
      {
        channels: body.channels,
        scheduledFor: body.scheduledFor,
        expiresAt: body.expiresAt,
      }
    );
  }

  @Post('queue')
  @HttpCode(HttpStatus.OK)
  async queueNotification(
    @Request() req,
    @Body() body: {
      type: NotificationType;
      title: string;
      message: string;
      channels: NotificationDelivery[];
      data?: Record<string, any>;
      priority?: NotificationPriority;
      scheduledFor?: Date;
      maxRetries?: number;
    },
  ): Promise<void> {
    return this.notificationService.queueNotification(
      req.user.id,
      body.type,
      body.title,
      body.message,
      {
        channels: body.channels,
        data: body.data,
        priority: body.priority,
        scheduledFor: body.scheduledFor,
        maxRetries: body.maxRetries,
      }
    );
  }

  @Post('bulk-send')
  @HttpCode(HttpStatus.OK)
  async sendBulkNotifications(
    @Body() body: {
      notifications: Array<{
        userId: string;
        type: NotificationType;
        title: string;
        message: string;
        options: {
          channels: NotificationDelivery[];
          data?: Record<string, any>;
          priority?: NotificationPriority;
        };
      }>;
    },
  ): Promise<any[]> {
    return this.notificationService.sendBulkNotifications(body.notifications);
  }

  // In-App Notification Endpoints
  @Get('in-app')
  async getInAppNotifications(
    @Request() req,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('type') type?: NotificationType,
    @Query('priority') priority?: NotificationPriority,
    @Query('category') category?: string,
  ): Promise<any[]> {
    return this.notificationService.getInAppNotifications(req.user.id, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      type,
      priority,
      category,
    });
  }

  @Get('in-app/unread-count')
  async getInAppUnreadCount(@Request() req): Promise<{ count: number }> {
    const count = await this.notificationService.getInAppUnreadCount(req.user.id);
    return { count };
  }

  @Put('in-app/:id/read')
  async markInAppNotificationAsRead(
    @Request() req,
    @Param('id') id: string,
  ): Promise<void> {
    return this.notificationService.markInAppNotificationAsRead(id, req.user.id);
  }

  @Put('in-app/mark-all-read')
  async markAllInAppNotificationsAsRead(@Request() req): Promise<{ count: number }> {
    const count = await this.notificationService.markAllInAppNotificationsAsRead(req.user.id);
    return { count };
  }

  @Delete('in-app/:id')
  async deleteInAppNotification(
    @Request() req,
    @Param('id') id: string,
  ): Promise<void> {
    return this.notificationService.deleteInAppNotification(id, req.user.id);
  }

  @Get('in-app/stats')
  async getInAppNotificationStats(
    @Request() req,
    @Query('days') days?: string,
  ): Promise<any> {
    return this.notificationService.getInAppNotificationStats(
      req.user.id,
      days ? parseInt(days) : 30
    );
  }

  // Email Notification Endpoints
  @Post('email')
  @HttpCode(HttpStatus.OK)
  async sendEmailNotification(
    @Request() req,
    @Body() body: {
      type: NotificationType;
      title: string;
      message: string;
      customData?: Record<string, any>;
    },
  ): Promise<{ success: boolean }> {
    const success = await this.notificationService.sendEmailNotification(
      req.user.id,
      body.type,
      body.title,
      body.message,
      body.customData
    );
    return { success };
  }

  // Push Notification Endpoints
  @Post('push')
  @HttpCode(HttpStatus.OK)
  async sendPushNotification(
    @Request() req,
    @Body() body: {
      type: NotificationType;
      title: string;
      message: string;
      customData?: Record<string, any>;
    },
  ): Promise<any> {
    return this.notificationService.sendPushNotification(
      req.user.id,
      body.type,
      body.title,
      body.message,
      body.customData
    );
  }

  // FCM Topic Management
  @Post('push/subscribe-topic')
  @HttpCode(HttpStatus.OK)
  async subscribeToTopic(
    @Request() req,
    @Body() body: { topic: string },
  ): Promise<{ message: string }> {
    const deviceTokens = await this.notificationService.getUserDeviceTokens(req.user.id);
    const tokens = deviceTokens.map(token => token.token);
    
    await this.notificationService.subscribeToTopic(tokens, body.topic);
    return { message: `Subscribed to topic: ${body.topic}` };
  }

  @Post('push/unsubscribe-topic')
  @HttpCode(HttpStatus.OK)
  async unsubscribeFromTopic(
    @Request() req,
    @Body() body: { topic: string },
  ): Promise<{ message: string }> {
    const deviceTokens = await this.notificationService.getUserDeviceTokens(req.user.id);
    const tokens = deviceTokens.map(token => token.token);
    
    await this.notificationService.unsubscribeFromTopic(tokens, body.topic);
    return { message: `Unsubscribed from topic: ${body.topic}` };
  }

  @Post('push/send-to-topic')
  @HttpCode(HttpStatus.OK)
  async sendToTopic(
    @Body() body: {
      topic: string;
      type: NotificationType;
      title: string;
      message: string;
      customData?: Record<string, any>;
    },
  ): Promise<{ message: string }> {
    await this.notificationService.sendToTopic(
      body.topic,
      body.type,
      body.title,
      body.message,
      body.customData
    );
    return { message: `Notification sent to topic: ${body.topic}` };
  }

  // Template Management Endpoints
  @Get('templates')
  async getNotificationTemplates(): Promise<any[]> {
    return this.notificationService.getNotificationTemplates();
  }

  @Get('templates/:type')
  async getNotificationTemplate(@Param('type') type: NotificationType): Promise<any> {
    return this.notificationService.getNotificationTemplate(type);
  }

  // Queue Management Endpoints
  @Get('queue/stats')
  async getQueueStats(): Promise<any> {
    return this.notificationService.getQueueStats();
  }

  @Post('queue/pause')
  @HttpCode(HttpStatus.OK)
  async pauseQueue(): Promise<void> {
    return this.notificationService.pauseQueue();
  }

  @Post('queue/resume')
  @HttpCode(HttpStatus.OK)
  async resumeQueue(): Promise<void> {
    return this.notificationService.resumeQueue();
  }

  @Get('queue/status')
  async getProcessingStatus(): Promise<any> {
    return this.notificationService.getProcessingStatus();
  }

  // Statistics Endpoints
  @Get('stats/delivery')
  async getDeliveryStatistics(
    @Query('userId') userId?: string,
    @Query('days') days?: string,
  ): Promise<any> {
    return this.notificationService.getDeliveryStatistics(
      userId,
      days ? parseInt(days) : 7
    );
  }

  // Admin Endpoints (would need proper admin guards)
  @Post('admin/broadcast')
  @HttpCode(HttpStatus.OK)
  async createAdminBroadcast(
    @Body() body: {
      userIds: string[];
      type: NotificationType;
      title: string;
      message: string;
      channels: NotificationDelivery[];
      priority?: NotificationPriority;
      data?: Record<string, any>;
    },
  ): Promise<any[]> {
    const notifications = body.userIds.map(userId => ({
      userId,
      type: body.type,
      title: body.title,
      message: body.message,
      options: {
        channels: body.channels,
        priority: body.priority,
        data: body.data,
      },
    }));

    return this.notificationService.sendBulkNotifications(notifications);
  }

  @Post('admin/send-to-all')
  @HttpCode(HttpStatus.OK)
  async sendToAllUsers(
    @Body() body: {
      type: NotificationType;
      title: string;
      message: string;
      channels: NotificationDelivery[];
      priority?: NotificationPriority;
      data?: Record<string, any>;
    },
  ): Promise<any> {
    // This would need to be implemented to get all users
    // For now, return a placeholder response
    return {
      message: 'Broadcast to all users would be implemented here',
      totalUsers: 0,
    };
  }
} 