import {
  Controller,
  Get,
  Param,
  Request,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { NotificationSSEService } from '../services/notification-sse.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'; // Adjust path as needed
import { GetUser } from '@/common/decorators/get-user.decorator';
import { User } from '@/entities';

@Controller('notifications/sse')
@UseGuards(JwtAuthGuard)
export class NotificationSSEController {
  private readonly logger = new Logger(NotificationSSEController.name);

  constructor(private readonly sseService: NotificationSSEService) {}


  @Get('connect')
  @HttpCode(HttpStatus.OK)
  async connect(
    @Request() req,
    @GetUser() user: User,
    @Res() res: Response,
    @Query('lastEventId') lastEventId?: string,
  ): Promise<void> {
    const userId = user.id;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    // Send initial connection event
    const initialEvent = {
      type: 'connection.established',
      data: {
        userId,
        timestamp: new Date(),
        message: 'SSE connection established',
      },
      id: this.sseService['generateEventId'](),
    };

    this.writeSSEEvent(res, initialEvent);

    // Create SSE connection
    const eventStream = this.sseService.createUserConnection(userId);

    // Handle client disconnect
    req.on('close', () => {
      this.logger.log(`SSE connection closed for user ${userId}`);
      this.sseService.closeUserConnection(userId);
    });

    req.on('error', (error) => {
      this.logger.error(`SSE connection error for user ${userId}:`, error);
      this.sseService.closeUserConnection(userId);
    });

    // Subscribe to events
    eventStream.subscribe({
      next: (event) => {
        this.writeSSEEvent(res, event);
      },
      error: (error) => {
        this.logger.error(`SSE stream error for user ${userId}:`, error);
        this.writeSSEEvent(res, {
          type: 'error',
          data: { message: 'Stream error occurred' },
          id: this.sseService['generateEventId'](),
        });
      },
      complete: () => {
        this.logger.log(`SSE stream completed for user ${userId}`);
        this.writeSSEEvent(res, {
          type: 'connection.closed',
          data: { message: 'Connection closed' },
          id: this.sseService['generateEventId'](),
        });
      },
    });

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      if (res.destroyed) {
        clearInterval(heartbeat);
        return;
      }

      this.writeSSEEvent(res, {
        type: 'heartbeat',
        data: { timestamp: new Date() },
        id: this.sseService['generateEventId'](),
      });
    }, 30000); // Send heartbeat every 30 seconds

    // Cleanup heartbeat on disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
    });
  }


  @Get('test/:userId')
  @HttpCode(HttpStatus.OK)
  async sendTestEvent(
    @Param('userId') userId: string,
    @Query('message') message?: string,
  ): Promise<{ success: boolean; message: string }> {
    const testMessage = message || 'Test SSE event';
    
    this.sseService.sendCustomEvent(userId, 'test.event', {
      message: testMessage,
      timestamp: new Date(),
    });

    return {
      success: true,
      message: `Test event sent to user ${userId}`,
    };
  }

  /**
   * Send custom notification event
   */
  @Get('send/:userId/:eventType')
  @HttpCode(HttpStatus.OK)
  async sendCustomEvent(
    @Param('userId') userId: string,
    @Param('eventType') eventType: string,
    @Query('message') message?: string,
    @Query('data') data?: string,
  ): Promise<{ success: boolean; message: string }> {
    let eventData: any = { message: message || 'Custom event', timestamp: new Date() };
    
    if (data) {
      try {
        eventData = { ...eventData, ...JSON.parse(data) };
      } catch (error) {
        this.logger.warn(`Failed to parse data parameter: ${error.message}`);
      }
    }

    this.sseService.sendCustomEvent(userId, eventType, eventData);

    return {
      success: true,
      message: `Custom event '${eventType}' sent to user ${userId}`,
    };
  }

  /**
   * Send system announcement to all users
   */
  @Get('announce')
  @HttpCode(HttpStatus.OK)
  async sendAnnouncement(
    @Query('message') message: string,
    @Query('type') type: 'info' | 'warning' | 'error' = 'info',
  ): Promise<{ success: boolean; message: string }> {
    if (!message) {
      return {
        success: false,
        message: 'Message parameter is required',
      };
    }

    this.sseService.sendSystemAnnouncement(message, type);

    return {
      success: true,
      message: 'Announcement sent to all connected users',
    };
  }

  /**
   * Get connection statistics
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getConnectionStats(): Promise<any> {
    return this.sseService.getConnectionStats();
  }

  /**
   * Check if user is connected
   */
  @Get('status/:userId')
  @HttpCode(HttpStatus.OK)
  async getUserConnectionStatus(@Param('userId') userId: string): Promise<{
    connected: boolean;
    message: string;
  }> {
    const isConnected = this.sseService.isUserConnected(userId);
    
    return {
      connected: isConnected,
      message: isConnected ? 'User is connected' : 'User is not connected',
    };
  }

  /**
   * Send order update event
   */
  @Get('order-update/:userId')
  @HttpCode(HttpStatus.OK)
  async sendOrderUpdate(
    @Param('userId') userId: string,
    @Query('orderId') orderId: string,
    @Query('status') status: string,
    @Query('message') message?: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!orderId || !status) {
      return {
        success: false,
        message: 'orderId and status parameters are required',
      };
    }

    this.sseService.sendOrderUpdate(userId, orderId, status, message || `Order ${orderId} updated to ${status}`);

    return {
      success: true,
      message: `Order update sent to user ${userId}`,
    };
  }

  /**
   * Send payment update event
   */
  @Get('payment-update/:userId')
  @HttpCode(HttpStatus.OK)
  async sendPaymentUpdate(
    @Param('userId') userId: string,
    @Query('paymentId') paymentId: string,
    @Query('status') status: string,
    @Query('amount') amount?: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!paymentId || !status) {
      return {
        success: false,
        message: 'paymentId and status parameters are required',
      };
    }

    const amountNum = amount ? parseFloat(amount) : 0;
    this.sseService.sendPaymentUpdate(userId, paymentId, status, amountNum);

    return {
      success: true,
      message: `Payment update sent to user ${userId}`,
    };
  }

  /**
   * Send promotion event
   */
  @Get('promotion/:userId')
  @HttpCode(HttpStatus.OK)
  async sendPromotion(
    @Param('userId') userId: string,
    @Query('promotionId') promotionId: string,
    @Query('title') title: string,
    @Query('message') message: string,
    @Query('discountCode') discountCode?: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!promotionId || !title || !message) {
      return {
        success: false,
        message: 'promotionId, title, and message parameters are required',
      };
    }

    this.sseService.sendPromotion(userId, promotionId, title, message, discountCode);

    return {
      success: true,
      message: `Promotion sent to user ${userId}`,
    };
  }

  /**
   * Close user connection
   */
  @Get('disconnect/:userId')
  @HttpCode(HttpStatus.OK)
  async disconnectUser(@Param('userId') userId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    this.sseService.closeUserConnection(userId);

    return {
      success: true,
      message: `Connection closed for user ${userId}`,
    };
  }

  /**
   * Write SSE event to response stream
   */
  private writeSSEEvent(res: Response, event: any): void {
    try {
      const eventString = `id: ${event.id || ''}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
      res.write(eventString);
    } catch (error) {
      this.logger.error('Error writing SSE event:', error);
    }
  }
}
