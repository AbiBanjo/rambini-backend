import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminAuthGuard } from '../../auth/guards/admin-auth-guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NotificationService } from '../../notification/notification.service';
import { Notification, NotificationType, NotificationDelivery } from '../../../entities';

@ApiTags('Admin - Notifications')
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, AdminAuthGuard)
@ApiBearerAuth()
export class AdminNotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('system')
  @ApiOperation({ summary: 'Create a system notification (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
  })
  async createSystemNotification(
    @Body()
    body: {
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
}