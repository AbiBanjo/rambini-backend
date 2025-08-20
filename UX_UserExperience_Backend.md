# User Experience Document (UX)
## Food Ordering Platform Backend Service

### Document Information
- **Product Name**: Food Ordering Platform Backend API
- **Version**: 1.0
- **Date**: December 2024
- **Document Type**: User Experience & Flow Document

---

## 1. User Journey Overview

### 1.1 User Types & Their Journeys
- **New User**: Registration → Profile Setup → Food Discovery
- **Customer**: Login → Search Food → Order → Payment → Track Order
- **Vendor Applicant**: Apply → Verification → Menu Setup → Receive Orders
- **Active Vendor**: Manage Menu → Process Orders → Manage Wallet
- **Admin**: Monitor Platform → Manage Users → Financial Oversight

---

## 2. Detailed User Flows

### 2.1 User Registration & Onboarding Flow

#### Step 1: Phone Number Registration
**User Action**: Enter phone number
**API Call**: `POST /api/auth/register`
**Backend Process**:
1. Validate phone number format (E.164)
2. Check if phone number already exists
3. Generate OTP code
4. Send OTP via SMS service (Twilio)
5. Store OTP with expiration time
6. Return OTP ID to client

**Response Scenarios**:
- Success: OTP sent, return OTP ID
- Error: Invalid phone format, phone already exists

#### Step 2: OTP Verification
**User Action**: Enter received OTP code
**API Call**: `POST /api/auth/verify-otp`
**Backend Process**:
1. Validate OTP against stored value
2. Check OTP expiration
3. Create user record with CUSTOMER type
4. Generate JWT access and refresh tokens
5. Create wallet record for user
6. Mark phone as verified

**Response Scenarios**:
- Success: Return tokens and user info
- Error: Invalid OTP, expired OTP

#### Step 3: Profile Completion
**User Action**: Fill profile details and address
**API Call**: `POST /api/auth/complete-profile`
**Backend Process**:
1. Validate required fields
2. Geocode address using mapping service
3. Update user profile
4. Create default address record
5. Mark profile as complete

**Response Scenarios**:
- Success: Profile updated
- Error: Invalid address, geocoding failed

### 2.2 Food Discovery & Search Flow

#### Food Search Process
**User Action**: Search for food item
**API Call**: `GET /api/menu/search?q=chicken&latitude=40.7128&longitude=-74.0060`
**Backend Process**:
1. Parse search query
2. Search menu items by name/description
3. Get user's current location
4. Calculate distance to each vendor
5. Apply proximity filtering (within delivery radius)
6. Sort results by distance
7. Include vendor info and preparation time
8. Paginate results

**Response Data**:
```json
{
  "items": [
    {
      "id": "menu-123",
      "name": "Grilled Chicken",
      "price": 15.99,
      "preparation_time": 30,
      "vendor": {
        "name": "Joe's Kitchen",
        "distance": 1.2
      }
    }
  ]
}
```

### 2.3 Shopping Cart & Ordering Flow

#### Add to Cart Process
**User Action**: Add menu item to cart
**API Call**: `POST /api/cart/items`
**Backend Process**:
1. Validate menu item exists and is available
2. Check if vendor is active
3. Clear cart if adding from different vendor
4. Add/update item in user's cart
5. Calculate cart totals

#### Checkout & Order Creation
**User Action**: Proceed to checkout
**API Call**: `POST /api/orders`
**Backend Process**:
1. Validate cart contents
2. Check menu item availability
3. Calculate order totals (subtotal + delivery fee)
4. Validate delivery address
5. Process payment based on selected method
6. Create order record
7. Clear user's cart
8. Notify vendor of new order
9. Send order confirmation to customer

**Payment Processing Sub-flow**:
- **Wallet Payment**: Debit user wallet, check sufficient balance
- **Online Payment**: Process via Stripe/Paystack, handle webhooks
- **Commission Calculation**: Calculate platform commission

### 2.4 Vendor Application & Verification Flow

#### Vendor Application Process
**User Action**: Apply to become vendor
**API Call**: `POST /api/vendor/apply`
**Backend Process**:
1. Validate business information
2. Upload and store required documents
3. Create vendor record with PENDING status
4. Notify admin of new vendor application
5. Send application confirmation to user

#### Admin Verification Process
**Admin Action**: Review vendor application
**API Call**: `PUT /api/admin/vendors/{id}/status`
**Backend Process**:
1. Admin reviews submitted documents
2. Update vendor verification status
3. If approved: Enable vendor features for user
4. If rejected: Send rejection reason
5. Notify applicant of decision

### 2.5 Vendor Order Management Flow

#### Receiving New Orders
**System Process**: Real-time order notification
**WebSocket/Push Notification**: New order alert
**API Call**: `GET /api/vendor/orders?status=NEW`
**Backend Process**:
1. Retrieve new orders for vendor
2. Include customer details and order items
3. Calculate vendor earnings (total - commission)

#### Order Processing Workflow
**Vendor Action**: Start preparing order
**API Call**: `PUT /api/vendor/orders/{id}/status`
**Backend Process**:
1. Update order status to PREPARING
2. Record timestamp of status change
3. Notify customer of status update
4. Update order in real-time dashboard

**Vendor Action**: Mark order as completed
**API Call**: `PUT /api/vendor/orders/{id}/status`
**Backend Process**:
1. Update order status to COMPLETED
2. Calculate and process vendor payment
3. Credit vendor wallet (total - commission)
4. Create commission transaction record
5. Notify delivery service (if integrated)
6. Send completion notification to customer

### 2.6 Menu Management Flow

#### Adding Menu Items
**Vendor Action**: Create new menu item
**API Call**: `POST /api/vendor/menu`
**Backend Process**:
1. Validate menu item data
2. Upload and process item image
3. Validate category exists
4. Create menu item record
5. Set availability status

#### Menu Item Management
**Vendor Actions**: Update pricing, availability, description
**API Calls**: `PUT /api/vendor/menu/{id}`
**Backend Process**:
1. Validate updated information
2. Update menu item record
3. Handle image updates if provided
4. Update search index if name/description changed

### 2.7 Wallet & Payment Management Flow

#### Wallet Top-up Process
**Customer Action**: Add money to wallet
**API Call**: `POST /api/wallet/topup`
**Backend Process**:
1. Validate top-up amount
2. Process payment via selected gateway
3. Handle payment webhook confirmation
4. Credit user wallet upon successful payment
5. Create transaction record
6. Send top-up confirmation

#### Vendor Withdrawal Process
**Vendor Action**: Withdraw earnings
**API Call**: `POST /api/wallet/withdraw`
**Backend Process**:
1. Validate withdrawal amount against available balance
2. Verify bank account details
3. Process withdrawal request
4. Create pending transaction record
5. Initiate bank transfer
6. Update transaction status upon completion

### 2.8 Notification Management Flows

#### In-App Notification System
**User Action**: View notifications
**API Call**: `GET /api/notifications`
**Backend Process**:
1. Retrieve user's notifications with pagination
2. Sort by creation date (newest first)
3. Include unread count
4. Mark notifications as delivered when viewed

**User Action**: Mark notification as read
**API Call**: `PUT /api/notifications/{id}/read`
**Backend Process**:
1. Update notification read status
2. Update read timestamp
3. Recalculate unread count
4. Send real-time update to user's connected devices

#### Push Notification Registration
**User Action**: Login to mobile app
**API Call**: `POST /api/notifications/register-device`
**Backend Process**:
1. Validate device token format
2. Check if token already exists for user
3. Store/update device token
4. Set token as active
5. Deactivate old tokens for same device

#### Notification Preferences Management
**User Action**: Update notification settings
**API Call**: `PUT /api/notifications/preferences`
**Backend Process**:
1. Validate preference settings
2. Update user's notification preferences
3. Apply preferences immediately to future notifications
4. Confirm settings update to user

#### Admin Notification Broadcasting
**Admin Action**: Send announcement to users
**API Call**: `POST /api/admin/notifications`
**Backend Process**:
1. Validate notification content and targeting
2. Create notification template if needed
3. Queue notifications for target audience
4. Process delivery based on user preferences
5. Track delivery and engagement metrics
6. Generate delivery report for admin

**Admin Action**: Schedule promotional notification
**API Call**: `POST /api/admin/notifications`
**Backend Process**:
1. Store scheduled notification
2. Set up delivery job for specified time
3. Apply targeting criteria (customer segments, locations)
4. Execute delivery at scheduled time
5. Track campaign performance

### 2.9 Admin Management Flows

#### Dashboard Data Aggregation
**Admin Action**: View dashboard
**API Call**: `GET /api/admin/dashboard`
**Backend Process**:
1. Calculate total wallet balances across all users
2. Sum pending payout amounts
3. Count total customers and vendors
4. Calculate growth percentages vs. previous month
5. Aggregate transaction data for charts
6. Generate daily/monthly activity reports

#### User Management Process
**Admin Action**: Manage user accounts
**API Call**: `GET /api/admin/users`
**Backend Process**:
1. Retrieve user list with filtering options
2. Include user statistics (orders, wallet balance, last activity)
3. Support search and sorting functionality

**Admin Action**: Suspend/activate user
**API Call**: `PUT /api/admin/users/{id}/status`
**Backend Process**:
1. Update user status
2. If suspending: Disable API access, cancel active orders
3. Send notification to affected user
4. Log admin action for audit trail

#### Financial Management
**Admin Action**: Review financial data
**API Call**: `GET /api/admin/finance`
**Backend Process**:
1. Aggregate all transaction data
2. Calculate commission earnings
3. Track refunds and payouts
4. Generate financial reports
5. Show pending reconciliations

---

## 3. API Interaction Patterns

### 3.1 Authentication Flow
```
1. POST /api/auth/register (phone)
2. POST /api/auth/verify-otp (otp_code)
3. POST /api/auth/complete-profile (user_info)
4. Include Authorization header in subsequent requests
```

### 3.2 Typical Customer Session
```
1. GET /api/users/profile (load user data)
2. GET /api/menu/search (discover food)
3. POST /api/cart/items (add to cart)
4. GET /api/cart (review cart)
5. POST /api/orders (place order)
6. GET /api/orders/{id} (track order)
```

### 3.3 Typical Vendor Session
```
1. GET /api/vendor/orders (check new orders)
2. PUT /api/vendor/orders/{id}/status (update order)
3. GET /api/vendor/menu (manage menu)
4. POST /api/vendor/menu (add new items)
5. GET /api/wallet (check earnings)
6. GET /api/notifications (check notifications)
7. PUT /api/notifications/{id}/read (mark as read)
```

### 3.4 Notification System API Flow
```
1. POST /api/notifications/register-device (register for push)
2. GET /api/notifications (fetch notifications)
3. PUT /api/notifications/{id}/read (mark as read)
4. GET /api/notifications/preferences (get settings)
5. PUT /api/notifications/preferences (update settings)
6. WebSocket connection for real-time notifications
```

---

## 4. Real-time Interactions

### 4.1 WebSocket Events
- **Order Status Updates**: Real-time order status changes
- **New Order Notifications**: Instant vendor notifications
- **Payment Confirmations**: Real-time payment status updates
- **In-App Notifications**: Real-time notification delivery
- **Unread Count Updates**: Live notification badge updates
- **System Announcements**: Broadcast messages to all connected users

### 4.2 Push Notifications

#### Customer Push Notifications
- **Order Confirmations**: "Your order #12345 has been confirmed"
- **Order Status Updates**: "Your order is being prepared"
- **Payment Notifications**: "Payment successful for your order"
- **Promotional Offers**: "20% off on your next order"
- **Wallet Updates**: "₦1,000 added to your wallet"

#### Vendor Push Notifications
- **New Order Alerts**: "New order received - ₦2,500"
- **Payment Notifications**: "Payment received for order #12345"
- **Application Updates**: "Your vendor application has been approved"
- **System Alerts**: "Update your menu items"

#### Delivery Integration Notifications
- **Pickup Alerts**: "Order ready for pickup by delivery partner"
- **Delivery Updates**: "Order out for delivery"

#### Notification Categories
- **Critical**: Payment failures, security alerts (always delivered)
- **Transactional**: Order updates, confirmations (high priority)
- **Marketing**: Promotions, offers (can be disabled by user)
- **Informational**: Tips, app updates (low priority)

---

## 5. Error Handling & Edge Cases

### 5.1 Common Error Scenarios

#### Payment Failures
**Scenario**: Credit card declined during order
**Backend Handling**:
1. Capture payment failure reason
2. Return specific error message
3. Maintain cart contents
4. Log transaction attempt
5. Suggest alternative payment methods

#### Vendor Unavailability
**Scenario**: Vendor goes offline during order
**Backend Handling**:
1. Check vendor status before order creation
2. If vendor becomes unavailable: Cancel order, refund payment
3. Notify customer of cancellation
4. Suggest alternative vendors

#### Inventory Issues
**Scenario**: Menu item becomes unavailable after adding to cart
**Backend Handling**:
1. Validate item availability during checkout
2. Remove unavailable items from order
3. Recalculate totals
4. Notify customer of changes
5. Allow order modification

### 5.2 Data Consistency
- Use database transactions for critical operations
- Implement idempotency for payment operations
- Handle concurrent cart modifications
- Ensure wallet balance consistency

---

## 6. Performance Considerations

### 6.1 Caching Strategy
- Cache frequently searched menu items
- Cache vendor location data
- Cache user preferences and addresses
- Cache notification templates and user preferences
- Cache device tokens for push notifications
- Implement cache invalidation for real-time data

### 6.2 Database Optimization
- Index frequently queried fields (location, status, timestamps)
- Optimize proximity search queries
- Use connection pooling
- Implement read replicas for reporting queries

### 6.3 API Rate Limiting
- Implement rate limiting per user/IP
- Different limits for different user types
- Graceful degradation under high load

---

## 7. Security & Privacy

### 7.1 Data Protection
- Encrypt sensitive user data (PII, payment info)
- Implement data retention policies
- Support user data deletion requests
- Audit trail for admin actions

### 7.2 Access Control
- Role-based permissions
- API endpoint protection
- Resource-level authorization
- Secure file upload validation

---

## 8. Integration Touch Points

### 8.1 External Service Dependencies
- **SMS Service**: OTP delivery reliability
- **Payment Gateways**: Transaction processing
- **Mapping Services**: Address geocoding and distance calculation
- **File Storage**: Image upload and delivery
- **Delivery Services**: Order handoff and tracking
- **Push Notification Services**: FCM/APNs reliability
- **Email Services**: Transactional email delivery
- **WebSocket Infrastructure**: Real-time communication

### 8.2 Service Health Monitoring
- Monitor external service availability
- Implement fallback mechanisms
- Alert admin of service failures
- Graceful degradation strategies

---

## 9. Analytics & Reporting

### 9.1 User Behavior Tracking
- Search patterns and popular items
- Order frequency and timing
- Cart abandonment rates
- Payment method preferences
- Notification engagement rates (open, click, dismiss)
- Preferred notification channels per user
- Optimal notification timing analysis

### 9.2 Business Metrics
- Revenue and commission tracking
- Vendor performance metrics
- Customer acquisition and retention
- Platform growth indicators

---

## 10. Future Considerations

### 10.1 Scalability Planning
- Microservices architecture migration
- Database sharding strategies
- CDN implementation for static content
- Auto-scaling infrastructure

### 10.2 Feature Extensions
- Real-time order tracking
- Customer reviews and ratings
- Loyalty programs and rewards
- Advanced recommendation engine
- Multi-language support
- AI-powered notification optimization
- Rich push notifications with images/actions
- In-app messaging between customers and vendors
- Smart notification timing based on user behavior 