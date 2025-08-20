# Rambini Food Ordering Platform - Database Schema

## Enums

Enum UserType {
  CUSTOMER
  VENDOR
  ADMIN
}

Enum UserStatus {
  ACTIVE
  SUSPENDED
  DELETED
  PENDING_VERIFICATION
}

Enum VerificationStatus {
  PENDING
  UNDER_REVIEW
  APPROVED
  REJECTED
  SUSPENDED
}

Enum AddressType {
  HOME
  WORK
  OTHER
}

Enum OrderStatus {
  NEW
  CONFIRMED
  PREPARING
  READY
  OUT_FOR_DELIVERY
  DELIVERED
  CANCELLED
  REFUNDED
}

Enum OrderType {
  DELIVERY
  PICKUP
}

Enum PaymentMethod {
  WALLET
  STRIPE
  PAYSTACK
  CASH_ON_DELIVERY
}

Enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED
}

Enum TransactionType {
  CREDIT
  DEBIT
  COMMISSION
  PAYOUT
  REFUND
  REVERSAL
  FEE
}

Enum TransactionStatus {
  PENDING
  COMPLETED
  FAILED
  REVERSED
}

Enum NotificationType {
  ORDER_UPDATE
  PAYMENT
  PROMOTION
  SYSTEM
  VENDOR_APPLICATION
  SECURITY_ALERT
  WALLET_UPDATE
  REVIEW_REQUEST
  NEWS
  ADMIN_BROADCAST
  VENDOR_ANNOUNCEMENT
  CUSTOMER_ANNOUNCEMENT
}

Enum NotificationDelivery {
  IN_APP
  PUSH
  SMS
  EMAIL
}

Enum NotificationAudience {
  ALL_USERS
  CUSTOMERS_ONLY
  VENDORS_ONLY
  ADMINS_ONLY
  SPECIFIC_USERS
  SPECIFIC_VENDORS
  SPECIFIC_CATEGORIES
}

Enum DeliveryStatus {
  PENDING
  SENT
  DELIVERED
  FAILED
  EXPIRED
}

Enum NotificationPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

Enum DeviceType {
  IOS
  ANDROID
  WEB
}

Enum ReviewType {
  ORDER
  VENDOR
  MENU_ITEM
}

Enum DiscountType {
  PERCENTAGE
  FIXED_AMOUNT
  FREE_DELIVERY
}

Enum SettingType {
  GENERAL
  PAYMENT
  NOTIFICATION
  BUSINESS
  SECURITY
}

Enum AuditAction {
  CREATE
  UPDATE
  DELETE
  LOGIN
  LOGOUT
}

Enum Currency {
  NGN
  USD
  EUR
  GBP
}

## Tables

Table users {
  id varchar [primary key]
  phone_number varchar [unique, note: "E.164 format"]
  first_name varchar
  last_name varchar
  email varchar [unique]
  user_type UserType [default: CUSTOMER]
  status UserStatus [default: ACTIVE]
  is_phone_verified boolean [default: false]
  profile_completed boolean [default: false]
  email_verified_at timestamp
  phone_verified_at timestamp
  last_active_at timestamp
  deleted_at timestamp
  created_at timestamp
  updated_at timestamp [note: "auto-updated"]
}

Table addresses {
  id varchar [primary key]
  user_id varchar [not null, ref: > users.id]
  address_line_1 varchar [not null]
  address_line_2 varchar
  city varchar [not null]
  state varchar [not null]
  postal_code varchar
  country varchar [default: "NG"]
  latitude decimal
  longitude decimal
  is_default boolean [default: false]
  address_type AddressType [default: HOME]
  delivery_instructions text
  landmark varchar
  created_at timestamp
  updated_at timestamp [note: "auto-updated"]

  indexes {
    (user_id, is_default) [unique, note: "One default address per user"]
  }
}

Table vendors {
  id varchar [primary key]
  user_id varchar [not null, ref: > users.id]
  business_name varchar [not null]
  business_registration_number varchar
  business_address text [not null]
  business_phone varchar
  business_email varchar
  business_description text
  business_logo_url varchar
  business_banner_url varchar
  verification_status VerificationStatus [default: PENDING]
  verification_documents json
  verification_notes text
  verified_at timestamp
  verified_by varchar [ref: > users.id]
  commission_rate decimal [default: 0.15]
  is_active boolean [default: true]
  is_accepting_orders boolean [default: true]
  delivery_radius_km int [default: 10]
  minimum_order_amount decimal [default: 0]
  estimated_prep_time_minutes int [default: 30]
  delivery_fee decimal [default: 0]
  business_hours json
  rating_average decimal [default: 0]
  total_ratings int [default: 0]
  total_orders int [default: 0]
  created_at timestamp
  updated_at timestamp [note: "auto-updated"]

  indexes {
    (user_id) [unique, note: "One vendor profile per user"]
  }
}

Table categories {
  id varchar [primary key]
  name varchar [unique, not null]
  description text
  image_url varchar
  icon_url varchar
  sort_order int [default: 0]
  is_active boolean [default: true]
  parent_category_id varchar [ref: > categories.id]
  created_at timestamp
  updated_at timestamp [note: "auto-updated"]
}

Table menu_items {
  id varchar [primary key]
  vendor_id varchar [not null, ref: > vendors.id]
  category_id varchar [not null, ref: > categories.id]
  name varchar [not null]
  description text
  price decimal [not null]
  cost_price decimal
  preparation_time_minutes int [default: 15]
  image_url varchar
  images json
  is_available boolean [default: true]
  is_featured boolean [default: false]
  dietary_info json
  ingredients text
  nutritional_info json
  allergen_info text
  portion_size varchar
  sort_order int [default: 0]
  rating_average decimal [default: 0]
  total_ratings int [default: 0]
  total_orders int [default: 0]
  created_at timestamp
  updated_at timestamp [note: "auto-updated"]
}

Table menu_item_variants {
  id varchar [primary key]
  menu_item_id varchar [not null, ref: > menu_items.id]
  variant_name varchar [not null]
  variant_value varchar [not null]
  price_modifier decimal [default: 0]
  is_available boolean [default: true]
  created_at timestamp
}

Table orders {
  id varchar [primary key]
  order_number varchar [unique, not null]
  customer_id varchar [not null, ref: > users.id]
  vendor_id varchar [not null, ref: > vendors.id]
  delivery_address_id varchar [not null, ref: > addresses.id]
  order_status OrderStatus [default: NEW]
  order_type OrderType [default: DELIVERY]
  payment_method PaymentMethod [not null]
  payment_status PaymentStatus [default: PENDING]
  payment_reference varchar
  payment_provider varchar
  subtotal decimal [not null]
  delivery_fee decimal [default: 0]
  service_fee decimal [default: 0]
  tax_amount decimal [default: 0]
  discount_amount decimal [default: 0]
  commission_amount decimal [not null]
  total_amount decimal [not null]
  estimated_prep_time_minutes int
  estimated_delivery_time timestamp
  order_ready_at timestamp
  delivered_at timestamp
  cancelled_at timestamp
  cancellation_reason text
  cancelled_by varchar [ref: > users.id]
  special_instructions text
  delivery_notes text
  customer_rating int
  customer_review text
  vendor_notes text
  created_at timestamp
  updated_at timestamp [note: "auto-updated"]
}

Table order_items {
  id varchar [primary key]
  order_id varchar [not null, ref: > orders.id]
  menu_item_id varchar [not null, ref: > menu_items.id]
  quantity int [not null]
  unit_price decimal [not null]
  total_price decimal [not null]
  special_instructions text
  variants json
  created_at timestamp
}

Table wallets {
  id varchar [primary key]
  user_id varchar [not null, ref: > users.id]
  balance decimal [default: 0]
  currency Currency [default: NGN]
  is_active boolean [default: true]
  daily_limit decimal [default: 100000]
  monthly_limit decimal [default: 1000000]
  last_transaction_at timestamp
  created_at timestamp
  updated_at timestamp [note: "auto-updated"]

  indexes {
    (user_id) [unique, note: "One wallet per user"]
  }
}

Table transactions {
  id varchar [primary key]
  wallet_id varchar [not null, ref: > wallets.id]
  transaction_type TransactionType [not null]
  amount decimal [not null]
  balance_before decimal [not null]
  balance_after decimal [not null]
  description text [not null]
  reference_id varchar
  external_reference varchar
  status TransactionStatus [default: PENDING]
  failure_reason text
  processed_at timestamp
  reversed_at timestamp
  reversal_reason text
  metadata json
  created_at timestamp
}

Table notifications {
  id varchar [primary key]
  user_id varchar [not null, ref: > users.id]
  notification_type NotificationType [not null]
  title varchar [not null]
  message text [not null]
  data json
  is_read boolean [default: false]
  read_at timestamp
  delivery_method NotificationDelivery [default: IN_APP]
  scheduled_for timestamp
  sent_at timestamp
  delivery_status DeliveryStatus [default: PENDING]
  failure_reason text
  priority NotificationPriority [default: NORMAL]
  expires_at timestamp
  created_at timestamp
}

Table notification_templates {
  id varchar [primary key]
  template_name varchar [unique, not null]
  notification_type NotificationType [not null]
  title_template text [not null]
  message_template text [not null]
  target_audience NotificationAudience [default: ALL_USERS]
  delivery_methods NotificationDelivery[] [default: ["IN_APP"]]
  is_active boolean [default: true]
  variables json
  created_at timestamp
  updated_at timestamp [note: "auto-updated"]
}

Table user_notification_preferences {
  id varchar [primary key]
  user_id varchar [not null, ref: > users.id]
  notification_type NotificationType [not null]
  in_app_enabled boolean [default: true]
  push_enabled boolean [default: true]
  sms_enabled boolean [default: false]
  email_enabled boolean [default: true]
  created_at timestamp
  updated_at timestamp [note: "auto-updated"]

  indexes {
    (user_id, notification_type) [unique, note: "One preference per user per type"]
  }
}

Table admin_broadcast_notifications {
  id varchar [primary key]
  title varchar [not null]
  message text [not null]
  notification_type NotificationType [not null]
  target_audience NotificationAudience [not null]
  delivery_methods NotificationDelivery[] [default: ["IN_APP"]]
  priority NotificationPriority [default: NORMAL]
  scheduled_for timestamp
  expires_at timestamp
  is_sent boolean [default: false]
  sent_at timestamp
  sent_by varchar [not null, ref: > users.id]
  target_users varchar[] [note: "Specific user IDs if target_audience is SPECIFIC_USERS"]
  target_vendors varchar[] [note: "Specific vendor IDs if target_audience is SPECIFIC_VENDORS"]
  target_categories varchar[] [note: "Specific category IDs if target_audience is SPECIFIC_CATEGORIES"]
  metadata json
  created_at timestamp
  updated_at timestamp [note: "auto-updated"]
}

Table broadcast_notification_deliveries {
  id varchar [primary key]
  broadcast_id varchar [not null, ref: > admin_broadcast_notifications.id]
  user_id varchar [not null, ref: > users.id]
  delivery_method NotificationDelivery [not null]
  delivery_status DeliveryStatus [default: PENDING]
  sent_at timestamp
  delivered_at timestamp
  failed_at timestamp
  failure_reason text
  retry_count int [default: 0]
  created_at timestamp
  updated_at timestamp [note: "auto-updated"]

  indexes {
    (broadcast_id, user_id, delivery_method) [unique, note: "One delivery record per user per method per broadcast"]
  }
}

Table device_tokens {
  id varchar [primary key]
  user_id varchar [not null, ref: > users.id]
  device_type DeviceType [not null]
  token text [not null]
  is_active boolean [default: true]
  app_version varchar
  device_info json
  last_used_at timestamp
  created_at timestamp

  indexes {
    (user_id, token) [unique, note: "One token per user per device"]
  }
}

Table reviews {
  id varchar [primary key]
  order_id varchar [not null, ref: > orders.id]
  customer_id varchar [not null, ref: > users.id]
  vendor_id varchar [not null, ref: > vendors.id]
  rating int [not null]
  review_text text
  review_type ReviewType [default: ORDER]
  is_anonymous boolean [default: false]
  vendor_response text
  vendor_responded_at timestamp
  is_featured boolean [default: false]
  helpful_count int [default: 0]
  created_at timestamp
  updated_at timestamp [note: "auto-updated"]
}

Table coupons {
  id varchar [primary key]
  code varchar [unique, not null]
  name varchar [not null]
  description text
  discount_type DiscountType [not null]
  discount_value decimal [not null]
  minimum_order_amount decimal [default: 0]
  maximum_discount_amount decimal
  usage_limit int
  usage_count int [default: 0]
  user_usage_limit int [default: 1]
  valid_from timestamp [not null]
  valid_until timestamp [not null]
  is_active boolean [default: true]
  applicable_vendors varchar[]
  applicable_categories varchar[]
  created_by varchar [ref: > users.id]
  created_at timestamp
  updated_at timestamp [note: "auto-updated"]
}

Table coupon_usage {
  id varchar [primary key]
  coupon_id varchar [not null, ref: > coupons.id]
  user_id varchar [not null, ref: > users.id]
  order_id varchar [not null, ref: > orders.id]
  discount_amount decimal [not null]
  used_at timestamp
}

Table admin_settings {
  id varchar [primary key]
  setting_key varchar [unique, not null]
  setting_value json [not null]
  setting_type SettingType [default: GENERAL]
  description text
  is_public boolean [default: false]
  updated_by varchar [ref: > users.id]
  created_at timestamp
  updated_at timestamp [note: "auto-updated"]
}

Table audit_logs {
  id varchar [primary key]
  table_name varchar [not null]
  record_id varchar [not null]
  action AuditAction [not null]
  old_values json
  new_values json
  changed_by varchar [ref: > users.id]
  ip_address inet
  user_agent text
  created_at timestamp
}

Table vendor_earnings {
  id varchar [primary key]
  vendor_id varchar [not null, ref: > vendors.id]
  order_id varchar [not null, ref: > orders.id]
  gross_amount decimal [not null]
  commission_amount decimal [not null]
  net_amount decimal [not null]
  payout_status PayoutStatus [default: PENDING]
  payout_reference varchar
  paid_at timestamp
  created_at timestamp
  updated_at timestamp [note: "auto-updated"]
}

Table payout_requests {
  id varchar [primary key]
  vendor_id varchar [not null, ref: > vendors.id]
  amount decimal [not null]
  bank_details json [not null]
  status PayoutStatus [default: PENDING]
  processed_at timestamp
  processed_by varchar [ref: > users.id]
  failure_reason text
  created_at timestamp
  updated_at timestamp [note: "auto-updated"]
}

Table delivery_zones {
  id varchar [primary key]
  vendor_id varchar [not null, ref: > vendors.id]
  zone_name varchar [not null]
  delivery_fee decimal [not null]
  minimum_order_amount decimal [default: 0]
  estimated_delivery_time_minutes int [not null]
  is_active boolean [default: true]
  created_at timestamp
  updated_at timestamp [note: "auto-updated"]
}

Table zone_coordinates {
  id varchar [primary key]
  zone_id varchar [not null, ref: > delivery_zones.id]
  latitude decimal [not null]
  longitude decimal [not null]
  sequence_order int [not null]
  created_at timestamp
}

Table carts {
  id varchar [primary key]
  user_id varchar [not null, ref: > users.id]
  delivery_address_id varchar [ref: > addresses.id]
  coupon_code varchar [ref: > coupons.code]
  subtotal decimal [default: 0]
  total_delivery_fee decimal [default: 0]
  total_discount_amount decimal [default: 0]
  total_tax_amount decimal [default: 0]
  total_amount decimal [default: 0]
  special_instructions text
  expires_at timestamp [note: "Cart expires after 24 hours"]
  is_active boolean [default: true]
  created_at timestamp
  updated_at timestamp [note: "auto-updated"]

  indexes {
    (user_id) [unique, note: "One active cart per user"]
    (user_id, is_active)
    (expires_at, is_active)
  }
}

Table cart_items {
  id varchar [primary key]
  cart_id varchar [not null, ref: > carts.id]
  menu_item_id varchar [not null, ref: > menu_items.id]
  vendor_id varchar [not null, ref: > vendors.id]
  quantity int [not null, default: 1]
  unit_price decimal [not null]
  total_price decimal [not null]
  delivery_fee decimal [default: 0]
  tax_amount decimal [default: 0]
  special_instructions text
  selected_variants json [note: "Selected menu item variants"]
  estimated_prep_time_minutes int
  created_at timestamp
  updated_at timestamp [note: "auto-updated"]

  indexes {
    (cart_id, menu_item_id) [unique, note: "One cart item per menu item per cart"]
    (cart_id, vendor_id)
  }
}

Table cart_vendor_summaries {
  id varchar [primary key]
  cart_id varchar [not null, ref: > carts.id]
  vendor_id varchar [not null, ref: > vendors.id]
  vendor_name varchar [not null]
  vendor_logo_url varchar
  subtotal decimal [default: 0]
  delivery_fee decimal [default: 0]
  tax_amount decimal [default: 0]
  discount_amount decimal [default: 0]
  total_amount decimal [default: 0]
  estimated_prep_time_minutes int
  estimated_delivery_time timestamp
  minimum_order_amount decimal
  delivery_radius_km int
  is_delivery_available boolean [default: true]
  special_instructions text
  created_at timestamp
  updated_at timestamp [note: "auto-updated"]

  indexes {
    (cart_id, vendor_id) [unique, note: "One summary per vendor per cart"]
  }
}

Enum PayoutStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

Enum PayoutMethod {
  BANK_TRANSFER
  MOBILE_MONEY
  CASH_PICKUP
}

## Additional Indexes

// Performance optimization indexes
indexes {
  // Users table
  (phone_number) [unique]
  (email) [unique]
  (user_type, status)
  (created_at)
  
  // Addresses table
  (user_id)
  (latitude, longitude) [note: "Geospatial index"]
  (user_id, is_default) [unique]
  
  // Vendors table
  (verification_status)
  (is_active, is_accepting_orders)
  (rating_average DESC)
  (total_orders DESC)
  
  // Menu items table
  (vendor_id, is_available)
  (category_id, is_available)
  (is_featured, is_available)
  (rating_average DESC)
  
  // Orders table
  (customer_id, order_status)
  (vendor_id, order_status)
  (order_status, created_at)
  (payment_status, created_at)
  
  // Order items table
  (order_id)
  (menu_item_id)
  
  // Wallets table
  (user_id) [unique]
  (balance)
  
  // Transactions table
  (wallet_id, transaction_type)
  (status, created_at)
  (reference_id)
  
  // Notifications table
  (user_id, is_read)
  (notification_type, created_at)
  
  // Admin broadcast notifications table
  (target_audience, is_sent)
  (scheduled_for, is_sent)
  (sent_by, created_at)
  
  // Broadcast notification deliveries table
  (broadcast_id, delivery_status)
  (user_id, delivery_status)
  (delivery_method, delivery_status)
  
  // Reviews table
  (vendor_id, rating)
  (order_id) [unique]
  
  // Coupons table
  (code) [unique]
  (is_active, valid_from, valid_until)
  
  // Coupon usage table
  (coupon_id, user_id)
  (order_id)
  
  // Device tokens table
  (user_id, is_active)
  (token, is_active)
  
  // Vendor earnings table
  (vendor_id, payout_status)
  (order_id) [unique]
  
  // Payout requests table
  (vendor_id, status)
  (status, created_at)
  
  // Delivery zones table
  (vendor_id, is_active)
  
  // Zone coordinates table
  (zone_id, sequence_order)
  
  // Cart tables
  (user_id) [unique, note: "One active cart per user"]
  (user_id, is_active)
  (expires_at, is_active)
  (cart_id, menu_item_id) [unique, note: "One cart item per menu item per cart"]
  (cart_id, vendor_id)
  (cart_id, vendor_id) [unique, note: "One summary per vendor per cart"]
}

## Notes

// Business Rules
- One user can have multiple addresses but only one default address
- One user can have only one vendor profile
- One user can have only one wallet
- Orders must have at least one order item
- Commission is calculated as a percentage of order subtotal
- Vendor earnings = order total - commission - delivery fee
- Notifications respect user preferences for delivery methods
- Coupons have usage limits and expiration dates
- Reviews can only be submitted for completed orders
- Device tokens are unique per user per device
- Audit logs track all data changes for compliance
- Delivery zones define vendor service areas with custom pricing
- Payout requests require bank details and approval process
- Admin broadcast notifications support targeted audiences (all users, customers only, vendors only, specific users/vendors/categories)
- Broadcast notifications are delivered to individual users based on target audience and user preferences
- Each broadcast notification delivery is tracked per user per delivery method for analytics and retry logic
- Shopping carts allow users to build orders from multiple vendors before checkout with one active cart per user
- Cart items are grouped by vendor with separate pricing, delivery fees, and preparation times per vendor
- Cart vendor summaries provide per-vendor totals and delivery estimates for better user experience
- Carts automatically expire after 24 hours to prevent stale data
- Cart totals are calculated per vendor including delivery fees, taxes, and applied discounts
- At checkout, the cart is split into separate orders per vendor for independent processing and delivery 