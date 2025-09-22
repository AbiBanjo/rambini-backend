import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { Notification, User, DeviceToken, DevicePlatform } from '../../../entities';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
  sound?: string;
  badge?: number;
  priority?: 'high' | 'normal';
  ttl?: number; // Time to live in seconds
}

export interface PushNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deviceToken?: string;
}

export interface BulkPushResult {
  success: number;
  failed: number;
  results: PushNotificationResult[];
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    try {
      const pathToJson = process.env.FIREBASE_CREDENTIAL_JSON;
      
      if (!pathToJson) {
        this.logger.warn('FIREBASE_CREDENTIAL_JSON not set, FCM will not work');
        return;
      }

      const serviceAccount = readFileSync(pathToJson, 'utf8');
      const serviceAccountObject = JSON.parse(serviceAccount);

      // Only initialize if not already initialized
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountObject),
        });
        this.logger.log('Firebase Admin SDK initialized successfully');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK:', error);
    }
  }

  async sendPushNotification(
    notification: Notification,
    user: User,
    deviceTokens: DeviceToken[],
    customData?: Record<string, any>
  ): Promise<BulkPushResult> {
    if (deviceTokens.length === 0) {
      this.logger.log(`No device tokens found for user ${user.id}`);
      return { success: 0, failed: 0, results: [] };
    }

    if (!admin.apps.length) {
      this.logger.error('Firebase Admin SDK not initialized');
      return { 
        success: 0, 
        failed: deviceTokens.length, 
        results: deviceTokens.map(token => ({
          success: false,
          error: 'Firebase not initialized',
          deviceToken: token.token,
        }))
      };
    }

    const results: PushNotificationResult[] = [];
    const tokens = deviceTokens.map(token => token.token);

    try {
      const message: admin.messaging.MulticastMessage = {
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            priority: 'max',
            visibility: 'public',
            defaultSound: true,
            defaultVibrateTimings: true,
            color: '#790001',
          },
        },
        apns: {
          headers: {
            'apns-priority': '10',
            'apns-push-type': 'alert',
          },
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true,
              mutableContent: true,
              alert: {
                title: notification.title,
                body: notification.message,
              },
            },
          },
        },
        notification: {
          title: notification.title,
          body: notification.message,
        },
        data: {
          type: notification.notification_type,
          notificationId: notification.id,
          ...notification.data,
          ...customData,
        },
        tokens: tokens,
      };

      const messaging = admin.messaging();
      const response = await messaging.sendEachForMulticast(message);

      // Process results
      response.responses.forEach((resp, index) => {
        results.push({
          success: resp.success,
          messageId: resp.messageId,
          error: resp.error?.message,
          deviceToken: tokens[index],
        });
      });

      const success = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      this.logger.log(`Push notification sent: ${success} successful, ${failed} failed for user ${user.id}`);
      
      return { success, failed, results };

    } catch (error) {
      this.logger.error(`Failed to send push notifications: ${error.message}`, error.stack);
      
      // Mark all tokens as failed
      deviceTokens.forEach(token => {
        results.push({
          success: false,
          error: error.message,
          deviceToken: token.token,
        });
      });

      return { 
        success: 0, 
        failed: deviceTokens.length, 
        results 
      };
    }
  }

  // Additional utility methods for topic management
  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    if (!admin.apps.length) {
      this.logger.error('Firebase Admin SDK not initialized');
      return;
    }

    try {
      const messaging = admin.messaging();
      await messaging.subscribeToTopic(tokens, topic);
      this.logger.log(`Successfully subscribed ${tokens.length} tokens to topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Error subscribing to topic ${topic}:`, error);
    }
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    if (!admin.apps.length) {
      this.logger.error('Firebase Admin SDK not initialized');
      return;
    }

    try {
      const messaging = admin.messaging();
      await messaging.unsubscribeFromTopic(tokens, topic);
      this.logger.log(`Successfully unsubscribed ${tokens.length} tokens from topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Error unsubscribing from topic ${topic}:`, error);
    }
  }

  async sendToTopic(topic: string, notification: Notification, customData?: Record<string, any>): Promise<void> {
    if (!admin.apps.length) {
      this.logger.error('Firebase Admin SDK not initialized');
      return;
    }

    try {
      const message: admin.messaging.Message = {
        topic: topic,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            priority: 'max',
            visibility: 'public',
            defaultSound: true,
            defaultVibrateTimings: true,
            color: '#790001',
          },
        },
        apns: {
          headers: {
            'apns-priority': '10',
            'apns-push-type': 'alert',
          },
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true,
              mutableContent: true,
              alert: {
                title: notification.title,
                body: notification.message,
              },
            },
          },
        },
        notification: {
          title: notification.title,
          body: notification.message,
        },
        data: {
          type: notification.notification_type,
          notificationId: notification.id,
          ...notification.data,
          ...customData,
        },
      };

      const messaging = admin.messaging();
      await messaging.send(message);
      this.logger.log(`Successfully sent notification to topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Error sending to topic ${topic}:`, error);
    }
  }

  // Method to validate device tokens
  async validateDeviceTokens(tokens: DeviceToken[]): Promise<DeviceToken[]> {
    const validTokens: DeviceToken[] = [];
    
    for (const token of tokens) {
      if (this.isValidTokenFormat(token)) {
        validTokens.push(token);
      } else {
        this.logger.warn(`Invalid token format detected: ${token.token.substring(0, 20)}...`);
      }
    }

    return validTokens;
  }

  private isValidTokenFormat(token: DeviceToken): boolean {
    // Basic validation for FCM tokens (works for all platforms)
    return token.token.length > 50 && token.token.length < 200;
  }
}
