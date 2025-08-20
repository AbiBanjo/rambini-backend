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
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import {
  Notification,
  NotificationType,
  NotificationDelivery,
  DeviceToken,
  UserNotificationPreference,
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
} 