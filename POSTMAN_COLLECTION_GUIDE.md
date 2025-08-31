# Rambini Food Ordering API - Postman Collection Guide

## Overview

This Postman collection provides comprehensive testing coverage for the Rambini Food Ordering API. It includes all major endpoints organized by functionality with automated test scripts for seamless testing.

## Collection Structure

### 🏥 Health & Status
- **Health Check**: Verify API health status
- **App Status**: Check application status

### 🔐 Authentication
- **Register User**: Create new user account with phone number
- **Verify OTP**: Complete registration with OTP verification
- **Login**: Authenticate user and get access tokens
- **Complete Profile**: Set up user profile after registration
- **Resend OTP**: Request new OTP if needed
- **Refresh Token**: Get new access token using refresh token
- **Get Current User**: Retrieve current user information

### 👤 User Management
- **Get Current User Profile**: Retrieve user profile details
- **Update Current User**: Modify user profile information
- **Verify Phone Number**: Verify phone number with OTP
- **Verify Email**: Verify email address with OTP
- **Complete Profile**: Complete profile setup
- **Suspend Current User**: Deactivate user account
- **Activate Current User**: Reactivate user account
- **Delete Current User**: Remove user account

### 📍 Address Management
- **Create Address**: Add new delivery address
- **Get User Addresses**: Retrieve all user addresses
- **Get Address by ID**: Get specific address details
- **Update Address**: Modify existing address
- **Set Default Address**: Mark address as default
- **Get Default Address**: Retrieve default address
- **Validate Address**: Validate address format
- **Delete Address**: Remove address

### 🛒 Cart Management
- **Add Item to Cart**: Add menu item to shopping cart
- **Get Cart**: Retrieve current cart contents
- **Validate Cart**: Validate cart for checkout
- **Get Cart Item by ID**: Get specific cart item details
- **Update Cart Item**: Modify cart item quantity/instructions
- **Remove Item from Cart**: Remove item from cart
- **Clear Cart**: Empty entire cart
- **Validate Cart for Checkout**: Final cart validation

### 🍽️ Menu & Categories
#### Categories
- **Create Category**: Add new food category
- **Get All Categories**: Retrieve all categories
- **Get Active Categories**: Get only active categories
- **Get Category by ID**: Get specific category details
- **Update Category**: Modify category information
- **Upload Category Image**: Add category image
- **Upload Category Icon**: Add category icon
- **Delete Category**: Remove category

#### Menu Items
- **Search Menu Items**: Search with filters and distance sorting
- **Get Menu Item by ID**: Get specific menu item details
- **Get Vendor Menu**: Retrieve vendor's menu items
- **Get Category Menu**: Get menu items by category
- **Create Menu Item**: Add new menu item (vendor only)
- **Update Menu Item**: Modify menu item details
- **Delete Menu Item**: Remove menu item
- **Toggle Menu Item Availability**: Change availability status
- **Bulk Update Menu Items**: Perform bulk operations

### 📦 Orders
- **Create Order**: Place new order from cart
- **Get Customer Orders**: Retrieve user's order history
- **Get Order by ID**: Get specific order details
- **Cancel Order**: Cancel existing order
- **Get Customer Order Stats**: View order statistics

### 🏪 Vendor Operations
#### Vendor Profile
- **Create Vendor**: Apply for vendor account
- **Get Vendor Profile**: Retrieve vendor information

#### Vendor Orders
- **Get Vendor Orders**: View incoming orders
- **Update Order Status**: Change order status (confirm, prepare, etc.)

### 📱 Notifications
- **Get User Notifications**: Retrieve user notifications
- **Get Unread Count**: Count unread notifications
- **Mark Notification as Read**: Mark notification as read
- **Register Device Token**: Register device for push notifications

### 📁 File Storage
- **Upload General File**: Upload any file type
- **Upload Menu Item Image**: Add image to menu item
- **Get File by ID**: Retrieve file details
- **Delete File**: Remove uploaded file

### 🔧 Admin Operations
- **Get All Users**: Retrieve all system users
- **Get All Vendors**: View all vendor applications
- **Verify Vendor**: Approve/reject vendor applications
- **Get System Stats**: View system statistics

## Environment Variables

The collection uses the following variables that are automatically set during testing:

| Variable | Description | Auto-set by |
|-----------|-------------|-------------|
| `base_url` | API base URL | Manual setup |
| `access_token` | JWT access token | Login/Verify OTP |
| `refresh_token` | JWT refresh token | Login/Verify OTP |
| `user_id` | Current user ID | Login/Verify OTP |
| `user_type` | User type (CUSTOMER/VENDOR/ADMIN) | Login/Verify OTP |
| `otp_id` | OTP verification ID | Register/Resend OTP |
| `phone_number` | User's phone number | Register |
| `address_id` | Created address ID | Create Address |
| `cart_item_id` | Cart item ID | Add to Cart |
| `category_id` | Category ID | Create Category |
| `menu_item_id` | Menu item ID | Create Menu Item/Search |
| `vendor_id` | Vendor ID | Create Vendor |
| `order_id` | Order ID | Create Order |
| `order_number` | Order number | Create Order |
| `notification_id` | Notification ID | Manual setup |
| `device_token_id` | Device token ID | Register Device |
| `file_id` | File ID | Upload File |

## Testing Workflow

### 1. Initial Setup
1. Import the collection into Postman
2. Set the `base_url` variable to your API endpoint
3. Run the Health Check to verify API connectivity

### 2. User Registration & Authentication
1. **Register User**: Create account with phone number
2. **Verify OTP**: Complete registration (sets `otp_id`, `user_id`, `access_token`)
3. **Complete Profile**: Set up user profile
4. **Login**: Get fresh tokens if needed

### 3. Address Setup
1. **Create Address**: Add delivery address (sets `address_id`)
2. **Set Default Address**: Mark as primary address

### 4. Menu & Cart Testing
1. **Create Category**: Add food category (sets `category_id`)
2. **Create Menu Item**: Add menu item (sets `menu_item_id`)
3. **Add to Cart**: Add item to cart (sets `cart_item_id`)
4. **Validate Cart**: Ensure cart is ready for checkout

### 5. Order Processing
1. **Create Order**: Place order from cart (sets `order_id`, `order_number`)
2. **Get Order Details**: Verify order creation
3. **Cancel Order**: Test order cancellation

### 6. Vendor Operations (if testing vendor features)
1. **Create Vendor**: Apply for vendor account (sets `vendor_id`)
2. **Get Vendor Orders**: View incoming orders
3. **Update Order Status**: Process orders

### 7. Admin Operations (if testing admin features)
1. **Get All Users**: View system users
2. **Verify Vendor**: Approve vendor applications
3. **Get System Stats**: View system metrics

## Test Scripts

Each request includes comprehensive test scripts that:

- **Validate Status Codes**: Ensure correct HTTP responses
- **Check Response Structure**: Verify JSON format and required fields
- **Set Collection Variables**: Automatically populate variables for subsequent requests
- **Log Responses**: Provide debugging information in console
- **Performance Testing**: Check response times
- **Data Validation**: Verify response data integrity

## Common Test Scenarios

### Customer Journey
1. Register → Verify OTP → Complete Profile → Login
2. Add Address → Browse Menu → Add to Cart → Place Order
3. Track Order → Receive Notifications → Rate Experience

### Vendor Journey
1. Apply for Vendor Account → Upload Documents → Wait for Approval
2. Create Categories → Add Menu Items → Manage Orders
3. Process Orders → Update Status → Handle Customer Requests

### Admin Journey
1. Review Vendor Applications → Verify Documents → Approve/Reject
2. Monitor System Health → View Statistics → Manage Users
3. Handle Disputes → Review Reports → System Maintenance

## Troubleshooting

### Common Issues
1. **Authentication Errors**: Ensure `access_token` is valid and not expired
2. **Missing Variables**: Check that required variables are set by previous requests
3. **API Errors**: Verify `base_url` and API endpoint availability
4. **Test Failures**: Check console logs for detailed error information

### Debug Tips
1. Use Postman Console to view test script execution
2. Check Collection Variables to ensure proper data flow
3. Verify request/response headers and body content
4. Use Postman's built-in debugging tools

## Best Practices

1. **Sequential Testing**: Run requests in the order they appear in folders
2. **Variable Management**: Let the collection automatically manage variables
3. **Error Handling**: Review failed tests to identify API issues
4. **Data Consistency**: Use realistic test data that matches your schema
5. **Environment Isolation**: Use separate collections for different environments

## API Documentation

For detailed API specifications, refer to:
- Swagger documentation at `/api-docs` endpoint
- Backend implementation guides in the project
- Database schema documentation
- Functional requirements documents

## Support

If you encounter issues with the collection:
1. Check the test console for error messages
2. Verify API endpoint availability
3. Review the backend logs for server-side issues
4. Consult the project documentation for API changes 