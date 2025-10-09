# Firebase Cloud Messaging (FCM) Setup Guide

## Overview
This guide will help you set up Firebase Cloud Messaging (FCM) for push notifications in the Rambini backend application.

## Prerequisites
- A Google account
- Access to Firebase Console (https://console.firebase.google.com)
- Node.js application with firebase-admin SDK installed (already done ✓)

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add Project** or select an existing project
3. Enter your project name (e.g., "Rambini")
4. Accept the terms and click **Continue**
5. Configure Google Analytics (optional) and click **Create Project**
6. Wait for the project to be created and click **Continue**

## Step 2: Generate Service Account Key

1. In your Firebase project, click the **gear icon** ⚙️ next to "Project Overview"
2. Select **Project Settings**
3. Navigate to the **Service Accounts** tab
4. Click **Generate New Private Key**
5. A dialog will appear - click **Generate Key**
6. A JSON file will be downloaded - this is your service account key
7. **IMPORTANT**: Keep this file secure and never commit it to version control

## Step 3: Configure Your Backend

### 3.1 Place the Service Account File

1. Create a `credentials` folder in your project root (or any secure location):
   ```bash
   mkdir credentials
   ```

2. Move the downloaded JSON file to this folder and rename it:
   ```bash
   mv ~/Downloads/your-project-firebase-adminsdk-xxxxx.json ./credentials/firebase-service-account.json
   ```

3. Add `credentials/` to your `.gitignore` file:
   ```
   # Firebase credentials
   credentials/
   firebase-service-account.json
   ```

### 3.2 Update Environment Variables

Update your `.env` file with the following:

```env
# Firebase Cloud Messaging (FCM) Configuration
FIREBASE_CREDENTIAL_JSON=./credentials/firebase-service-account.json
FCM_SERVER_KEY=your_fcm_server_key
FCM_PROJECT_ID=your_firebase_project_id

# Notification Settings
PUSH_NOTIFICATIONS_ENABLED=true
SMS_NOTIFICATIONS_ENABLED=false
EMAIL_NOTIFICATIONS_ENABLED=true
```

**Getting your FCM Server Key:**
1. In Firebase Console, go to **Project Settings** > **Cloud Messaging** tab
2. Under "Cloud Messaging API (Legacy)", find your **Server key**
3. Copy and paste it into your `.env` file

**Getting your Project ID:**
1. In Firebase Console, go to **Project Settings** > **General** tab
2. Find your **Project ID**
3. Copy and paste it into your `.env` file

## Step 4: Enable Cloud Messaging API

1. In Firebase Console, go to **Project Settings** > **Cloud Messaging** tab
2. If prompted, enable **Cloud Messaging API**
3. Click the link to enable it in Google Cloud Console
4. Click **Enable** on the Cloud Messaging API page

## Step 5: Test Your Implementation

### 5.1 Register a Device Token

Use the following endpoint to register a device token for a user:

```http
POST /api/v1/notifications/device-tokens
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "token": "YOUR_FCM_DEVICE_TOKEN",
  "platform": "ANDROID",  // or "IOS", "WEB", "DESKTOP"
  "deviceInfo": {
    "deviceId": "device-123",
    "deviceModel": "Samsung Galaxy S21",
    "appVersion": "1.0.0",
    "osVersion": "Android 12"
  }
}
```

### 5.2 Send a Test Push Notification

Use the following endpoint to send a test notification:

```http
POST /api/v1/notifications/push
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "userId": "user-uuid-here",
  "type": "ORDER_UPDATE",
  "title": "Test Notification",
  "message": "This is a test push notification",
  "customData": {
    "orderId": "order-123",
    "status": "preparing"
  }
}
```

### 5.3 Get FCM Device Token from Client

#### For Android (React Native):
```javascript
import messaging from '@react-native-firebase/messaging';

async function getFCMToken() {
  const token = await messaging().getToken();
  console.log('FCM Token:', token);
  return token;
}

// Request permission (iOS)
async function requestPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Authorization status:', authStatus);
  }
}
```

#### For Web (React):
```javascript
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

async function getFCMToken() {
  try {
    const token = await getToken(messaging, {
      vapidKey: 'YOUR_VAPID_KEY'
    });
    console.log('FCM Token:', token);
    return token;
  } catch (error) {
    console.error('Error getting token:', error);
  }
}
```

## Step 6: Production Deployment

### For Docker Deployment

Update your `docker-compose.yml` to mount the credentials file:

```yaml
services:
  backend:
    volumes:
      - ./credentials:/app/credentials:ro
    environment:
      - FIREBASE_CREDENTIAL_JSON=/app/credentials/firebase-service-account.json
```

### For AWS/Server Deployment

1. **Option 1: Use AWS Secrets Manager**
   - Store the service account JSON as a secret
   - Retrieve it at runtime

2. **Option 2: Environment Variable**
   - Base64 encode the JSON file:
     ```bash
     cat firebase-service-account.json | base64
     ```
   - Store the encoded string as an environment variable
   - Decode at runtime in your application

3. **Option 3: Secure File Upload**
   - Upload the file to your server via SCP/SFTP
   - Set proper file permissions (600)
   - Reference the file path in your environment variables

## How It Works

### Architecture

1. **Client App** → Registers FCM token with backend
2. **Backend** → Stores token in database (DeviceToken entity)
3. **Event Occurs** (e.g., order update) → Backend creates notification
4. **NotificationService** → Calls `sendPushNotificationInternal()`
5. **PushNotificationService** → Uses Firebase Admin SDK to send to FCM
6. **FCM** → Delivers notification to user's device(s)

### Key Features

- ✅ Multi-device support (user can have multiple devices)
- ✅ Platform-specific payloads (Android, iOS, Web)
- ✅ Automatic token validation and cleanup
- ✅ Failed token deactivation
- ✅ Topic-based messaging support
- ✅ Rich notifications with custom data
- ✅ Priority handling (high/normal)
- ✅ Delivery tracking and statistics

### Implementation Details

The `sendPushNotificationInternal()` method:
1. Retrieves user's active device tokens
2. Sends notification via FCM using `PushNotificationService`
3. Processes results and handles failures
4. Automatically deactivates invalid tokens
5. Marks notification as sent/failed in database
6. Logs detailed statistics

## Notification Payload Structure

### Standard Notification
```json
{
  "notification": {
    "title": "Order Update",
    "body": "Your order #12345 is being prepared"
  },
  "data": {
    "type": "ORDER_UPDATE",
    "notificationId": "notification-uuid",
    "orderId": "order-uuid",
    "status": "preparing",
    "customField": "customValue"
  },
  "android": {
    "priority": "high",
    "notification": {
      "sound": "default",
      "color": "#790001"
    }
  },
  "apns": {
    "headers": {
      "apns-priority": "10"
    },
    "payload": {
      "aps": {
        "sound": "default",
        "badge": 1
      }
    }
  }
}
```

## Troubleshooting

### Issue: "Firebase Admin SDK not initialized"
**Solution**: Ensure `FIREBASE_CREDENTIAL_JSON` points to a valid service account file

### Issue: "Invalid registration token"
**Solution**: 
- Token might have expired or been revoked by the client
- Backend automatically deactivates invalid tokens
- User needs to register a new token

### Issue: "Permission denied"
**Solution**: 
- Enable Cloud Messaging API in Google Cloud Console
- Check service account has necessary permissions

### Issue: Notifications not received on iOS
**Solution**:
- Ensure APNs certificate is configured in Firebase Console
- Check app has notification permissions
- Verify APNs authentication key is uploaded

### Issue: "File not found" error
**Solution**:
- Check the path in `FIREBASE_CREDENTIAL_JSON` is correct
- Use absolute path if relative path doesn't work
- Ensure file has proper read permissions

## Best Practices

1. **Security**
   - Never commit service account JSON to version control
   - Use environment variables for all sensitive data
   - Rotate service account keys periodically

2. **Token Management**
   - Clean up expired tokens regularly (automated in the service)
   - Handle token refresh on the client side
   - Validate tokens before sending notifications

3. **Error Handling**
   - Monitor failed notifications
   - Implement retry logic for transient failures
   - Log errors for debugging

4. **Performance**
   - Use topic messaging for broadcasting to many users
   - Batch notifications when possible
   - Set appropriate TTL for notifications

5. **User Experience**
   - Allow users to manage notification preferences
   - Respect quiet hours if implemented
   - Provide clear notification content

## API Reference

### Register Device Token
```http
POST /api/v1/notifications/device-tokens
```

### Send Push Notification
```http
POST /api/v1/notifications/push
```

### Subscribe to Topic
```http
POST /api/v1/notifications/topics/subscribe
```

### Send to Topic
```http
POST /api/v1/notifications/topics/send
```

### Get Notification Preferences
```http
GET /api/v1/notifications/preferences
```

### Update Notification Preferences
```http
PUT /api/v1/notifications/preferences
```

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [FCM HTTP v1 API Reference](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages)

## Support

For issues or questions, please refer to:
- Firebase Support: https://firebase.google.com/support
- Project Issues: [Your GitHub Issues Link]

---

**Last Updated**: October 2025
**Version**: 1.0.0

