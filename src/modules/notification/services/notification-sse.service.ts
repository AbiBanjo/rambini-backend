import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface SSEEvent {
  type: string;
  data: any;
  id?: string;
  retry?: number;
}

export interface UserSSEConnection {
  userId: string;
  subject: Subject<SSEEvent>;
  lastEventId?: string;
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
}

@Injectable()
export class NotificationSSEService {
  private readonly logger = new Logger(NotificationSSEService.name);
  private readonly userConnections = new Map<string, UserSSEConnection>();
  private readonly eventHistory = new Map<string, SSEEvent[]>(); // Store last 100 events per user
  private readonly maxHistorySize = 100;

  constructor() {
    // Cleanup inactive connections every 5 minutes
    setInterval(() => {
      this.cleanupInactiveConnections();
    }, 5 * 60 * 1000);
  }

  /**
   * Create a new SSE connection for a user
   */
  createUserConnection(userId: string): Observable<SSEEvent> {
    // Close existing connection if any
    this.closeUserConnection(userId);

    const subject = new Subject<SSEEvent>();
    const connection: UserSSEConnection = {
      userId,
      subject,
      isActive: true,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.userConnections.set(userId, connection);
    this.logger.log(`SSE connection created for user ${userId}`);

    // Send any missed events if user reconnects
    this.sendMissedEvents(userId, subject);

    return subject.asObservable();
  }

  /**
   * Close SSE connection for a user
   */
  closeUserConnection(userId: string): void {
    const connection = this.userConnections.get(userId);
    if (connection) {
      connection.subject.complete();
      this.userConnections.delete(userId);
      this.logger.log(`SSE connection closed for user ${userId}`);
    }
  }

  /**
   * Send event to specific user
   */
  sendToUser(userId: string, event: SSEEvent): void {
    const connection = this.userConnections.get(userId);
    if (connection && connection.isActive) {
      connection.subject.next(event);
      connection.lastActivity = new Date();
      this.logger.log(`SSE event sent to user ${userId}: ${event.type}`);
    }
  }

  /**
   * Send event to multiple users
   */
  sendToUsers(userIds: string[], event: SSEEvent): void {
    userIds.forEach(userId => {
      this.sendToUser(userId, event);
    });
  }

  /**
   * Broadcast event to all connected users
   */
  broadcast(event: SSEEvent): void {
    this.userConnections.forEach((connection, userId) => {
      if (connection.isActive) {
        connection.subject.next(event);
        connection.lastActivity = new Date();
      }
    });
    this.logger.log(`SSE event broadcasted to ${this.userConnections.size} users: ${event.type}`);
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalConnections: number;
    activeConnections: number;
    users: string[];
  } {
    const activeConnections = Array.from(this.userConnections.values())
      .filter(conn => conn.isActive).length;

    return {
      totalConnections: this.userConnections.size,
      activeConnections,
      users: Array.from(this.userConnections.keys()),
    };
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    const connection = this.userConnections.get(userId);
    return connection ? connection.isActive : false;
  }

  // Event Listeners for Notification Events

  @OnEvent('notification.created')
  handleNotificationCreated(payload: { userId: string; notification: any; timestamp: Date }): void {
    const event: SSEEvent = {
      type: 'notification.created',
      data: {
        notification: payload.notification,
        timestamp: payload.timestamp,
      },
      id: this.generateEventId(),
    };

    this.sendToUser(payload.userId, event);
    this.storeEvent(payload.userId, event);
  }

  @OnEvent('notification.read')
  handleNotificationRead(payload: { notificationId: string; userId: string; readAt: Date }): void {
    const event: SSEEvent = {
      type: 'notification.read',
      data: {
        notificationId: payload.notificationId,
        readAt: payload.readAt,
      },
      id: this.generateEventId(),
    };

    this.sendToUser(payload.userId, event);
    this.storeEvent(payload.userId, event);
  }

  @OnEvent('notifications.bulk.read')
  handleBulkNotificationsRead(payload: { userId: string; count: number; readAt: Date }): void {
    const event: SSEEvent = {
      type: 'notifications.bulk.read',
      data: {
        count: payload.count,
        readAt: payload.readAt,
      },
      id: this.generateEventId(),
    };

    this.sendToUser(payload.userId, event);
    this.storeEvent(payload.userId, event);
  }

  @OnEvent('notification.deleted')
  handleNotificationDeleted(payload: { notificationId: string; userId: string; deletedAt: Date }): void {
    const event: SSEEvent = {
      type: 'notification.deleted',
      data: {
        notificationId: payload.notificationId,
        deletedAt: payload.deletedAt,
      },
      id: this.generateEventId(),
    };

    this.sendToUser(payload.userId, event);
    this.storeEvent(payload.userId, event);
  }

  @OnEvent('notifications.bulk.deleted')
  handleBulkNotificationsDeleted(payload: { userId: string; count: number; deletedAt: Date }): void {
    const event: SSEEvent = {
      type: 'notifications.bulk.deleted',
      data: {
        count: payload.count,
        deletedAt: payload.deletedAt,
      },
      id: this.generateEventId(),
    };

    this.sendToUser(payload.userId, event);
    this.storeEvent(payload.userId, event);
  }

  @OnEvent('notification.preferences.updated')
  handlePreferencesUpdated(payload: { userId: string; preferences: any; updatedAt: Date }): void {
    const event: SSEEvent = {
      type: 'notification.preferences.updated',
      data: {
        preferences: payload.preferences,
        updatedAt: payload.updatedAt,
      },
      id: this.generateEventId(),
    };

    this.sendToUser(payload.userId, event);
    this.storeEvent(payload.userId, event);
  }

  @OnEvent('notification.effects')
  handleNotificationEffects(payload: {
    userId: string;
    notificationId: string;
    type: string;
    priority: string;
    sound: boolean;
    vibration: boolean;
    showBadge: boolean;
  }): void {
    const event: SSEEvent = {
      type: 'notification.effects',
      data: {
        notificationId: payload.notificationId,
        type: payload.type,
        priority: payload.priority,
        sound: payload.sound,
        vibration: payload.vibration,
        showBadge: payload.showBadge,
      },
      id: this.generateEventId(),
    };

    this.sendToUser(payload.userId, event);
    this.storeEvent(payload.userId, event);
  }

  @OnEvent('notifications.bulk.created')
  handleBulkNotificationsCreated(payload: {
    userIds: string[];
    count: number;
    type: string;
    timestamp: Date;
  }): void {
    const event: SSEEvent = {
      type: 'notifications.bulk.created',
      data: {
        count: payload.count,
        type: payload.type,
        timestamp: payload.timestamp,
      },
      id: this.generateEventId(),
    };

    // Send to all affected users
    payload.userIds.forEach(userId => {
      this.sendToUser(userId, event);
      this.storeEvent(userId, event);
    });
  }

  sendCustomEvent(userId: string, eventType: string, data: any): void {
    const event: SSEEvent = {
      type: eventType,
      data,
      id: this.generateEventId(),
    };

    this.sendToUser(userId, event);
    this.storeEvent(userId, event);
  }

 
  sendSystemAnnouncement(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    const event: SSEEvent = {
      type: 'system.announcement',
      data: {
        message,
        type,
        timestamp: new Date(),
      },
      id: this.generateEventId(),
    };

    this.broadcast(event);
  }


  sendOrderUpdate(userId: string, orderId: string, status: string, message: string): void {
    const event: SSEEvent = {
      type: 'order.update',
      data: {
        orderId,
        status,
        message,
        timestamp: new Date(),
      },
      id: this.generateEventId(),
    };

    this.sendToUser(userId, event);
    this.storeEvent(userId, event);
  }


  sendPaymentUpdate(userId: string, paymentId: string, status: string, amount: number): void {
    const event: SSEEvent = {
      type: 'payment.update',
      data: {
        paymentId,
        status,
        amount,
        timestamp: new Date(),
      },
      id: this.generateEventId(),
    };

    this.sendToUser(userId, event);
    this.storeEvent(userId, event);
  }


  sendPromotion(userId: string, promotionId: string, title: string, message: string, discountCode?: string): void {
    const event: SSEEvent = {
      type: 'promotion.new',
      data: {
        promotionId,
        title,
        message,
        discountCode,
        timestamp: new Date(),
      },
      id: this.generateEventId(),
    };

    this.sendToUser(userId, event);
    this.storeEvent(userId, event);
  }


  private storeEvent(userId: string, event: SSEEvent): void {
    if (!this.eventHistory.has(userId)) {
      this.eventHistory.set(userId, []);
    }

    const userEvents = this.eventHistory.get(userId)!;
    userEvents.push(event);

    // Keep only the last N events
    if (userEvents.length > this.maxHistorySize) {
      userEvents.splice(0, userEvents.length - this.maxHistorySize);
    }
  }

  private sendMissedEvents(userId: string, subject: Subject<SSEEvent>): void {
    const userEvents = this.eventHistory.get(userId);
    if (userEvents && userEvents.length > 0) {
      // Send last 10 events to catch up
      const recentEvents = userEvents.slice(-10);
      recentEvents.forEach(event => {
        subject.next(event);
      });
      this.logger.log(`Sent ${recentEvents.length} missed events to user ${userId}`);
    }
  }

  private cleanupInactiveConnections(): void {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    this.userConnections.forEach((connection, userId) => {
      const timeSinceLastActivity = now.getTime() - connection.lastActivity.getTime();
      
      if (timeSinceLastActivity > inactiveThreshold) {
        this.logger.log(`Cleaning up inactive SSE connection for user ${userId}`);
        this.closeUserConnection(userId);
      }
    });
  }

  private generateEventId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}
