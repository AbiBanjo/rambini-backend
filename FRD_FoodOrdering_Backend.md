# Functional Requirements Document (FRD)
## Food Ordering Platform Backend Service

### Document Information
- **Product Name**: Food Ordering Platform Backend API
- **Version**: 1.0
- **Date**: December 2024
- **Document Type**: Functional Requirements Document (FRD)

---

## 1. System Overview

### 1.1 Architecture
- **Type**: RESTful API Backend Service
- **Database**: Relational Database (PostgreSQL/MySQL)
- **Authentication**: JWT-based authentication
- **File Storage**: Cloud storage for images
- **Real-time**: WebSocket connections for order updates

### 1.2 Core Components
- Authentication Service
- User Management Service
- Menu Management Service
- Order Processing Service
- Payment Service
- Notification Service
- Location Service
- Admin Service

---

## 2. Database Schema Requirements

### 2.1 Core Entities

#### Users Table
```sql
- id (Primary Key)
- phone_number (Unique)
- first_name
- last_name
- email
- user_type (CUSTOMER, VENDOR, ADMIN)
- status (ACTIVE, SUSPENDED, DELETED)
- created_at
- updated_at
- last_active_at
```

#### Addresses Table
```sql
- id (Primary Key)
- user_id (Foreign Key)
- address_line_1
- address_line_2
- city
- state
- postal_code
- latitude
- longitude
- is_default (Boolean)
- created_at
```

#### Vendors Table
```sql
- id (Primary Key)
- user_id (Foreign Key)
- business_name
- business_address
- verification_status (PENDING, APPROVED, REJECTED)
- required_documents
- commission_rate
- is_active (Boolean)
- created_at
- updated_at
```

#### Categories Table
```sql
- id (Primary Key)
- name
- description
- is_active (Boolean)
- created_at
```

#### Menu_Items Table
```sql
- id (Primary Key)
- vendor_id (Foreign Key)
- category_id (Foreign Key)
- name
- description
- price
- preparation_time (minutes)
- image_url
- is_available (Boolean)
- created_at
- updated_at
```

#### Orders Table
```sql
- id (Primary Key)
- customer_id (Foreign Key)
- vendor_id (Foreign Key)
- delivery_address_id (Foreign Key)
- order_status (NEW, PREPARING, COMPLETED, CANCELLED)
- order_type (DELIVERY, PICKUP)
- subtotal
- delivery_fee
- commission_amount
- total_amount
- payment_method
- payment_status
- created_at
- updated_at
```

#### Order_Items Table
```sql
- id (Primary Key)
- order_id (Foreign Key)
- menu_item_id (Foreign Key)
- quantity
- unit_price
- total_price
```

#### Wallets Table
```sql
- id (Primary Key)
- user_id (Foreign Key)
- balance
- currency
- created_at
- updated_at
```

#### Transactions Table
```sql
- id (Primary Key)
- wallet_id (Foreign Key)
- transaction_type (CREDIT, DEBIT, COMMISSION, PAYOUT, REFUND)
- amount
- description
- reference_id
- status (PENDING, COMPLETED, FAILED)
- created_at
```

#### Notifications Table
```sql
- id (Primary Key)
- user_id (Foreign Key)
- notification_type (ORDER_UPDATE, PAYMENT, PROMOTION, SYSTEM, VENDOR_APPLICATION)
- title
- message
- data (JSON - additional notification data)
- is_read (Boolean)
- delivery_method (IN_APP, PUSH, SMS, EMAIL)
- scheduled_for (Timestamp)
- sent_at (Timestamp)
- created_at
```

#### Notification_Templates Table
```sql
- id (Primary Key)
- template_name
- notification_type
- title_template
- message_template
- target_audience (ALL_USERS, CUSTOMERS, VENDORS, ADMINS)
- is_active (Boolean)
- created_at
- updated_at
```

#### User_Notification_Preferences Table
```sql
- id (Primary Key)
- user_id (Foreign Key)
- notification_type
- in_app_enabled (Boolean)
- push_enabled (Boolean)
- sms_enabled (Boolean)
- email_enabled (Boolean)
- created_at
- updated_at
```

#### Device_Tokens Table
```sql
- id (Primary Key)
- user_id (Foreign Key)
- device_type (IOS, ANDROID, WEB)
- token
- is_active (Boolean)
- last_used_at
- created_at
```

---

## 3. API Endpoints Specification

### 3.1 Authentication APIs

#### POST /api/auth/register
**Description**: Register new user with phone number
**Request Body**:
```json
{
  "phone_number": "+1234567890"
}
```
**Response**:
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "otp_id": "uuid"
}
```

#### POST /api/auth/verify-otp
**Description**: Verify OTP and complete registration
**Request Body**:
```json
{
  "otp_id": "uuid",
  "otp_code": "123456"
}
```
**Response**:
```json
{
  "success": true,
  "access_token": "jwt_token",
  "refresh_token": "refresh_token",
  "user": {
    "id": "uuid",
    "phone_number": "+1234567890",
    "user_type": "CUSTOMER"
  }
}
```

#### POST /api/auth/complete-profile
**Description**: Complete user profile setup
**Request Body**:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "address": {
    "address_line_1": "123 Main St",
    "city": "City",
    "state": "State",
    "postal_code": "12345",
    "latitude": 40.7128,
    "longitude": -74.0060
  }
}
```

### 3.2 User Management APIs

#### GET /api/users/profile
**Description**: Get current user profile
**Headers**: Authorization: Bearer {token}

#### PUT /api/users/profile
**Description**: Update user profile
**Request Body**:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com"
}
```

#### DELETE /api/users/account
**Description**: Delete user account

### 3.3 Address Management APIs

#### GET /api/users/addresses
**Description**: Get user addresses

#### POST /api/users/addresses
**Description**: Add new address
**Request Body**:
```json
{
  "address_line_1": "123 Main St",
  "address_line_2": "Apt 4B",
  "city": "City",
  "state": "State",
  "postal_code": "12345",
  "is_default": false
}
```

#### PUT /api/users/addresses/{id}/default
**Description**: Set address as default

### 3.4 Food Search & Discovery APIs

#### GET /api/menu/search
**Description**: Search for food items with proximity-based results
**Query Parameters**:
- `q`: Search query (food name)
- `latitude`: User latitude
- `longitude`: User longitude
- `page`: Page number
- `limit`: Items per page

**Response**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "Grilled Chicken",
        "description": "Delicious grilled chicken",
        "price": 15.99,
        "image_url": "https://...",
        "preparation_time": 30,
        "category": "Main Dishes",
        "vendor": {
          "id": "uuid",
          "business_name": "Food Vendor",
          "distance": 2.5
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_items": 50
    }
  }
}
```

### 3.5 Cart Management APIs

#### GET /api/cart
**Description**: Get current cart

#### POST /api/cart/items
**Description**: Add item to cart
**Request Body**:
```json
{
  "menu_item_id": "uuid",
  "quantity": 2
}
```

#### PUT /api/cart/items/{id}
**Description**: Update cart item quantity

#### DELETE /api/cart/items/{id}
**Description**: Remove item from cart

#### DELETE /api/cart
**Description**: Clear entire cart

### 3.6 Order Management APIs

#### POST /api/orders
**Description**: Create new order
**Request Body**:
```json
{
  "delivery_address_id": "uuid",
  "order_type": "DELIVERY",
  "payment_method": "WALLET",
  "items": [
    {
      "menu_item_id": "uuid",
      "quantity": 2
    }
  ]
}
```

#### GET /api/orders
**Description**: Get user order history

#### GET /api/orders/{id}
**Description**: Get specific order details

### 3.7 Vendor APIs

#### POST /api/vendor/apply
**Description**: Apply to become vendor
**Request Body**:
```json
{
  "business_name": "My Restaurant",
  "business_address": "123 Business St",
  "required_documents": ["document_url_1", "document_url_2"]
}
```

#### GET /api/vendor/orders
**Description**: Get vendor orders
**Query Parameters**:
- `status`: Order status filter
- `page`: Page number
- `limit`: Items per page

#### PUT /api/vendor/orders/{id}/status
**Description**: Update order status
**Request Body**:
```json
{
  "status": "PREPARING"
}
```

#### GET /api/vendor/menu
**Description**: Get vendor menu items

#### POST /api/vendor/menu
**Description**: Add new menu item
**Request Body**:
```json
{
  "name": "Grilled Chicken",
  "description": "Delicious grilled chicken",
  "price": 15.99,
  "category_id": "uuid",
  "preparation_time": 30,
  "image_url": "https://...",
  "is_available": true
}
```

#### PUT /api/vendor/menu/{id}
**Description**: Update menu item

#### DELETE /api/vendor/menu/{id}
**Description**: Delete menu item

### 3.8 Wallet & Payment APIs

#### GET /api/wallet
**Description**: Get wallet balance and transactions

#### POST /api/wallet/topup
**Description**: Top up wallet
**Request Body**:
```json
{
  "amount": 50.00,
  "payment_method": "STRIPE",
  "payment_token": "stripe_token"
}
```

#### POST /api/wallet/withdraw
**Description**: Withdraw from wallet (vendors only)
**Request Body**:
```json
{
  "amount": 100.00,
  "bank_details": {
    "account_number": "1234567890",
    "routing_number": "123456789"
  }
}
```

### 3.9 Admin APIs

#### GET /api/admin/dashboard
**Description**: Get admin dashboard data
**Response**:
```json
{
  "total_wallet_balance": 10000.00,
  "pending_payout_amount": 2500.00,
  "total_customers": 1500,
  "total_vendors": 250,
  "monthly_stats": {
    "new_customers": 150,
    "new_vendors": 25,
    "total_spent": 50000.00
  },
  "daily_activities": [
    {
      "date": "2024-12-01",
      "active_users": 300,
      "transactions": 150,
      "amount_spent": 2500.00
    }
  ]
}
```

#### GET /api/admin/users
**Description**: Get all users with filtering
**Query Parameters**:
- `user_type`: Filter by user type
- `status`: Filter by status
- `search`: Search by name/email/phone
- `page`: Page number
- `limit`: Items per page

#### PUT /api/admin/users/{id}/status
**Description**: Update user status
**Request Body**:
```json
{
  "status": "SUSPENDED"
}
```

#### GET /api/admin/finance
**Description**: Get financial overview

#### POST /api/admin/notifications
**Description**: Send notification
**Request Body**:
```json
{
  "type": "ANNOUNCEMENT",
  "title": "System Maintenance",
  "content": "System will be down for maintenance",
  "target_audience": "ALL_USERS",
  "delivery_methods": ["IN_APP", "PUSH", "EMAIL"],
  "scheduled_for": "2024-12-15T10:00:00Z"
}
```

### 3.10 Notification APIs

#### GET /api/notifications
**Description**: Get user notifications
**Query Parameters**:
- `page`: Page number
- `limit`: Items per page
- `is_read`: Filter by read status
- `type`: Filter by notification type

**Response**:
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "ORDER_UPDATE",
        "title": "Order Confirmed",
        "message": "Your order #12345 has been confirmed",
        "data": {
          "order_id": "uuid",
          "vendor_name": "Joe's Kitchen"
        },
        "is_read": false,
        "created_at": "2024-12-01T10:00:00Z"
      }
    ],
    "unread_count": 5,
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_items": 25
    }
  }
}
```

#### PUT /api/notifications/{id}/read
**Description**: Mark notification as read

#### PUT /api/notifications/mark-all-read
**Description**: Mark all notifications as read

#### DELETE /api/notifications/{id}
**Description**: Delete specific notification

#### POST /api/notifications/register-device
**Description**: Register device token for push notifications
**Request Body**:
```json
{
  "device_type": "IOS",
  "token": "device_token_here"
}
```

#### GET /api/notifications/preferences
**Description**: Get user notification preferences

#### PUT /api/notifications/preferences
**Description**: Update notification preferences
**Request Body**:
```json
{
  "order_updates": {
    "in_app": true,
    "push": true,
    "sms": false,
    "email": true
  },
  "promotions": {
    "in_app": true,
    "push": false,
    "sms": false,
    "email": true
  },
  "system_updates": {
    "in_app": true,
    "push": true,
    "sms": true,
    "email": true
  }
}
```

#### GET /api/admin/notifications/templates
**Description**: Get notification templates

#### POST /api/admin/notifications/templates
**Description**: Create notification template
**Request Body**:
```json
{
  "template_name": "order_confirmed",
  "notification_type": "ORDER_UPDATE",
  "title_template": "Order Confirmed - #{order_number}",
  "message_template": "Your order from {vendor_name} has been confirmed. Estimated preparation time: {prep_time} minutes.",
  "target_audience": "CUSTOMERS"
}
```

#### GET /api/admin/notifications/analytics
**Description**: Get notification analytics
**Response**:
```json
{
  "total_sent": 10000,
  "delivery_rates": {
    "in_app": 95.5,
    "push": 82.3,
    "sms": 98.1,
    "email": 89.7
  },
  "engagement_rates": {
    "opened": 78.5,
    "clicked": 23.2
  },
  "by_type": {
    "ORDER_UPDATE": {
      "sent": 5000,
      "opened": 4200
    },
    "PROMOTION": {
      "sent": 3000,
      "opened": 1800
    }
  }
}
```

---

## 4. Business Logic Requirements

### 4.1 Notification System Logic

#### Notification Types & Triggers
- **ORDER_UPDATE**: Order status changes (confirmed, preparing, completed)
- **PAYMENT**: Payment confirmations, failures, wallet top-ups
- **PROMOTION**: Marketing campaigns, special offers
- **SYSTEM**: Maintenance, app updates, policy changes
- **VENDOR_APPLICATION**: Application status updates

#### Notification Delivery Logic
1. **Priority Routing**: Critical notifications (payment failures) sent via multiple channels
2. **User Preferences**: Respect user's channel preferences per notification type
3. **Fallback Mechanism**: If push fails, fallback to SMS for critical notifications
4. **Rate Limiting**: Prevent notification spam per user
5. **Scheduling**: Support immediate and scheduled delivery
6. **Template Processing**: Dynamic content replacement in templates

#### Real-time Notification Flow
1. **Event Trigger**: System event occurs (order placed, payment processed)
2. **Template Selection**: Choose appropriate template based on event type
3. **Content Generation**: Replace template variables with actual data
4. **Channel Selection**: Determine delivery channels based on user preferences
5. **Delivery**: Send via selected channels (in-app, push, SMS, email)
6. **Tracking**: Record delivery status and user engagement

### 4.2 Proximity Calculation
- Calculate distance between customer and vendors using Haversine formula
- Sort search results by distance (nearest first)
- Apply maximum delivery radius constraints
- Cache distance calculations for performance

### 4.2 Commission Calculation
- Calculate commission on each completed order
- Support different commission rates per vendor
- Track commission in separate transactions
- Generate commission reports for admin

### 4.3 Order Workflow
1. **New Order**: Customer places order
2. **Payment Processing**: Process payment via selected method
3. **Vendor Notification**: Notify vendor of new order
4. **Preparation**: Vendor starts preparing (status: PREPARING)
5. **Completion**: Vendor marks order as completed
6. **Commission**: Calculate and process commission
7. **Payout**: Add vendor earnings to wallet

### 4.4 Payment Processing
- Support multiple payment methods (Wallet, Stripe, Paystack)
- Handle payment failures and retries
- Process refunds when needed
- Maintain transaction audit trail

---

## 5. Integration Requirements

### 5.1 SMS Service Integration
- **Primary**: Twilio API
- **Fallback**: Alternative SMS providers
- **Functionality**: OTP delivery, order notifications

### 5.2 Payment Gateway Integration
- **Stripe**: Credit card processing
- **Paystack**: Local payment methods
- **Webhook handling**: Payment status updates

### 5.3 Geolocation Services
- **Google Maps API**: Geocoding and distance calculation
- **Alternative**: MapBox or similar services

### 5.4 File Storage
- **Cloud Storage**: AWS S3, Google Cloud Storage
- **CDN**: CloudFront or similar for image delivery

### 5.5 Notification Services
- **Push Notifications**: Firebase Cloud Messaging (FCM), Apple Push Notification Service (APNs)
- **Email Service**: SendGrid, AWS SES, Mailgun
- **SMS Integration**: Twilio, AWS SNS
- **Real-time**: WebSocket for in-app notifications

---

## 6. Security Requirements

### 6.1 Authentication & Authorization
- JWT-based authentication
- Role-based access control (Customer, Vendor, Admin)
- Secure password handling (if passwords are used)
- Session management and token refresh

### 6.2 Data Protection
- Encrypt sensitive data (PII, payment info)
- HTTPS for all API communications
- Input validation and sanitization
- Rate limiting to prevent abuse

### 6.3 Payment Security
- PCI DSS compliance considerations
- Secure payment token handling
- Fraud detection mechanisms
- Secure webhook endpoints

---

## 7. Performance Requirements

### 7.1 Response Time
- API response time: < 2 seconds
- Database query optimization
- Caching strategy for frequently accessed data

### 7.2 Scalability
- Horizontal scaling capability
- Database connection pooling
- Load balancing support
- Microservices architecture consideration

### 7.3 Availability
- 99.9% uptime requirement
- Health check endpoints
- Monitoring and alerting
- Backup and disaster recovery

---

## 8. Error Handling

### 8.1 Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid phone number format",
    "details": {
      "field": "phone_number",
      "constraint": "E.164 format required"
    }
  }
}
```

### 8.2 HTTP Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 422: Unprocessable Entity
- 500: Internal Server Error

---

## 9. Testing Requirements

### 9.1 Unit Testing
- Test coverage: > 80%
- Test all business logic functions
- Mock external service dependencies

### 9.2 Integration Testing
- API endpoint testing
- Database integration testing
- Third-party service integration testing

### 9.3 Performance Testing
- Load testing for expected traffic
- Stress testing for peak loads
- Database performance testing

---

## 10. Deployment Requirements

### 10.1 Environment Configuration
- Development, Staging, Production environments
- Environment-specific configuration management
- Secret management for API keys and credentials

### 10.2 CI/CD Pipeline
- Automated testing on code commits
- Automated deployment to staging
- Manual approval for production deployment

### 10.3 Monitoring & Logging
- Application performance monitoring
- Error tracking and alerting
- Audit logging for sensitive operations 