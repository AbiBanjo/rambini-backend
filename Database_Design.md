# Database Design - Rambini Food Ordering Platform

## Document Information
- **Product Name**: Rambini Backend Database Design
- **Version**: 1.0
- **Date**: December 2024
- **Document Type**: Database Design Specification

---

## 1. Database Overview

### 1.1 Database Technology
- **Primary Database**: PostgreSQL 15+
- **Rationale**: ACID compliance, JSON support, excellent geospatial capabilities (PostGIS), scalability
- **Character Set**: UTF-8
- **Collation**: en_US.UTF-8

### 1.2 Design Principles
- Normalized design (3NF) for data integrity
- Strategic denormalization for performance where needed
- Comprehensive indexing strategy
- Support for geospatial operations
- Audit trail capabilities
- Soft delete implementation

---

## 2. Core Tables Design

### 2.1 Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE NOT NULL CHECK (phone_number ~ '^\+[1-9]\d{1,14}$'),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    user_type user_type_enum NOT NULL DEFAULT 'CUSTOMER',
    status user_status_enum NOT NULL DEFAULT 'ACTIVE',
    is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified_at TIMESTAMP,
    phone_verified_at TIMESTAMP,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- Enums
CREATE TYPE user_type_enum AS ENUM ('CUSTOMER', 'VENDOR', 'ADMIN');
CREATE TYPE user_status_enum AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED', 'PENDING_VERIFICATION');
```

### 2.2 Addresses Table
```sql
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    country VARCHAR(2) NOT NULL DEFAULT 'NG',
    latitude DECIMAL(10, 8) CHECK (latitude >= -90 AND latitude <= 90),
    longitude DECIMAL(11, 8) CHECK (longitude >= -180 AND longitude <= 180),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    address_type address_type_enum DEFAULT 'HOME',
    delivery_instructions TEXT,
    landmark VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE address_type_enum AS ENUM ('HOME', 'WORK', 'OTHER');
```

### 2.3 Vendors Table
```sql
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    business_registration_number VARCHAR(100),
    business_address TEXT NOT NULL,
    business_phone VARCHAR(20),
    business_email VARCHAR(255),
    business_description TEXT,
    business_logo_url VARCHAR(500),
    business_banner_url VARCHAR(500),
    verification_status verification_status_enum NOT NULL DEFAULT 'PENDING',
    verification_documents JSONB,
    verification_notes TEXT,
    verified_at TIMESTAMP,
    verified_by UUID REFERENCES users(id),
    commission_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.15 CHECK (commission_rate >= 0 AND commission_rate <= 1),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_accepting_orders BOOLEAN NOT NULL DEFAULT TRUE,
    delivery_radius_km INTEGER DEFAULT 10 CHECK (delivery_radius_km > 0),
    minimum_order_amount DECIMAL(10, 2) DEFAULT 0,
    estimated_prep_time_minutes INTEGER DEFAULT 30,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    business_hours JSONB, -- Store opening hours
    rating_average DECIMAL(3, 2) DEFAULT 0 CHECK (rating_average >= 0 AND rating_average <= 5),
    total_ratings INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE verification_status_enum AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');
```

### 2.4 Categories Table
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    image_url VARCHAR(500),
    icon_url VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    parent_category_id UUID REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.5 Menu Items Table
```sql
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    cost_price DECIMAL(10, 2) CHECK (cost_price >= 0), -- For vendor analytics
    preparation_time_minutes INTEGER DEFAULT 15 CHECK (preparation_time_minutes > 0),
    image_url VARCHAR(500),
    images JSONB, -- Array of additional images
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    dietary_info JSONB, -- vegetarian, vegan, gluten-free, etc.
    ingredients TEXT,
    nutritional_info JSONB, -- calories, protein, etc.
    allergen_info TEXT,
    portion_size VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    rating_average DECIMAL(3, 2) DEFAULT 0 CHECK (rating_average >= 0 AND rating_average <= 5),
    total_ratings INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.6 Menu Item Variants Table
```sql
CREATE TABLE menu_item_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    variant_name VARCHAR(100) NOT NULL, -- Size, Spice Level, etc.
    variant_value VARCHAR(100) NOT NULL, -- Large, Medium, Mild, Hot, etc.
    price_modifier DECIMAL(10, 2) DEFAULT 0, -- Additional cost for this variant
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.7 Orders Table
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES users(id),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    delivery_address_id UUID NOT NULL REFERENCES addresses(id),
    order_status order_status_enum NOT NULL DEFAULT 'NEW',
    order_type order_type_enum NOT NULL DEFAULT 'DELIVERY',
    payment_method payment_method_enum NOT NULL,
    payment_status payment_status_enum NOT NULL DEFAULT 'PENDING',
    payment_reference VARCHAR(255),
    payment_provider VARCHAR(50),
    
    -- Pricing breakdown
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
    service_fee DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (service_fee >= 0),
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    commission_amount DECIMAL(10, 2) NOT NULL CHECK (commission_amount >= 0),
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    
    -- Timing
    estimated_prep_time_minutes INTEGER,
    estimated_delivery_time TIMESTAMP,
    order_ready_at TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES users(id),
    
    -- Additional info
    special_instructions TEXT,
    delivery_notes TEXT,
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    customer_review TEXT,
    vendor_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE order_status_enum AS ENUM ('NEW', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED');
CREATE TYPE order_type_enum AS ENUM ('DELIVERY', 'PICKUP');
CREATE TYPE payment_method_enum AS ENUM ('WALLET', 'STRIPE', 'PAYSTACK', 'CASH_ON_DELIVERY');
CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
```

### 2.8 Order Items Table
```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price > 0),
    total_price DECIMAL(10, 2) NOT NULL CHECK (total_price > 0),
    special_instructions TEXT,
    variants JSONB, -- Store selected variants
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.9 Wallets Table
```sql
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    daily_limit DECIMAL(12, 2) DEFAULT 100000, -- Daily transaction limit
    monthly_limit DECIMAL(12, 2) DEFAULT 1000000, -- Monthly transaction limit
    last_transaction_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.10 Transactions Table
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    transaction_type transaction_type_enum NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    balance_before DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    description TEXT NOT NULL,
    reference_id UUID, -- Reference to order, payout, etc.
    external_reference VARCHAR(255), -- Payment gateway reference
    status transaction_status_enum NOT NULL DEFAULT 'PENDING',
    failure_reason TEXT,
    processed_at TIMESTAMP,
    reversed_at TIMESTAMP,
    reversal_reason TEXT,
    metadata JSONB, -- Additional transaction data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE transaction_type_enum AS ENUM ('CREDIT', 'DEBIT', 'COMMISSION', 'PAYOUT', 'REFUND', 'REVERSAL', 'FEE');
CREATE TYPE transaction_status_enum AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');
```

---

## 3. Notification System Tables

### 3.1 Notifications Table
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type notification_type_enum NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional notification data
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,
    delivery_method notification_delivery_enum NOT NULL DEFAULT 'IN_APP',
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP,
    delivery_status delivery_status_enum DEFAULT 'PENDING',
    failure_reason TEXT,
    priority notification_priority_enum DEFAULT 'NORMAL',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE notification_type_enum AS ENUM (
    'ORDER_UPDATE', 'PAYMENT', 'PROMOTION', 'SYSTEM', 'VENDOR_APPLICATION',
    'SECURITY_ALERT', 'WALLET_UPDATE', 'REVIEW_REQUEST', 'NEWS'
);
CREATE TYPE notification_delivery_enum AS ENUM ('IN_APP', 'PUSH', 'SMS', 'EMAIL');
CREATE TYPE delivery_status_enum AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'EXPIRED');
CREATE TYPE notification_priority_enum AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
```

### 3.2 Notification Templates Table
```sql
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(100) UNIQUE NOT NULL,
    notification_type notification_type_enum NOT NULL,
    title_template TEXT NOT NULL,
    message_template TEXT NOT NULL,
    target_audience user_type_enum,
    delivery_methods notification_delivery_enum[] DEFAULT ARRAY['IN_APP'],
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    variables JSONB, -- Template variables documentation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3 User Notification Preferences Table
```sql
CREATE TABLE user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type notification_type_enum NOT NULL,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, notification_type)
);
```

### 3.4 Device Tokens Table
```sql
CREATE TABLE device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_type device_type_enum NOT NULL,
    token TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    app_version VARCHAR(20),
    device_info JSONB,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, token)
);

CREATE TYPE device_type_enum AS ENUM ('IOS', 'ANDROID', 'WEB');
```

---

## 4. Support Tables

### 4.1 Reviews and Ratings Table
```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    customer_id UUID NOT NULL REFERENCES users(id),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    review_type review_type_enum NOT NULL DEFAULT 'ORDER',
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    vendor_response TEXT,
    vendor_responded_at TIMESTAMP,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE review_type_enum AS ENUM ('ORDER', 'VENDOR', 'MENU_ITEM');
```

### 4.2 Coupons and Discounts Table
```sql
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type discount_type_enum NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),
    minimum_order_amount DECIMAL(10, 2) DEFAULT 0,
    maximum_discount_amount DECIMAL(10, 2),
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    user_usage_limit INTEGER DEFAULT 1,
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    applicable_vendors UUID[] DEFAULT ARRAY[]::UUID[],
    applicable_categories UUID[] DEFAULT ARRAY[]::UUID[],
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE discount_type_enum AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_DELIVERY');
```

### 4.3 Coupon Usage Table
```sql
CREATE TABLE coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES coupons(id),
    user_id UUID NOT NULL REFERENCES users(id),
    order_id UUID NOT NULL REFERENCES orders(id),
    discount_amount DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.4 Admin Settings Table
```sql
CREATE TABLE admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    setting_type setting_type_enum NOT NULL DEFAULT 'GENERAL',
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE setting_type_enum AS ENUM ('GENERAL', 'PAYMENT', 'NOTIFICATION', 'BUSINESS', 'SECURITY');
```

### 4.5 Audit Log Table
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action audit_action_enum NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE audit_action_enum AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT');
```

---

## 5. Indexes and Performance Optimization

### 5.1 Primary Indexes
```sql
-- Users table indexes
CREATE INDEX idx_users_phone_number ON users(phone_number);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Addresses table indexes
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_location ON addresses USING GIST(ST_Point(longitude, latitude));
CREATE INDEX idx_addresses_default ON addresses(user_id, is_default) WHERE is_default = TRUE;

-- Vendors table indexes
CREATE INDEX idx_vendors_user_id ON vendors(user_id);
CREATE INDEX idx_vendors_verification_status ON vendors(verification_status);
CREATE INDEX idx_vendors_is_active ON vendors(is_active);
CREATE INDEX idx_vendors_rating ON vendors(rating_average DESC);

-- Menu items indexes
CREATE INDEX idx_menu_items_vendor_id ON menu_items(vendor_id);
CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX idx_menu_items_available ON menu_items(is_available);
CREATE INDEX idx_menu_items_featured ON menu_items(is_featured);
CREATE INDEX idx_menu_items_rating ON menu_items(rating_average DESC);

-- Orders table indexes
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_vendor_id ON orders(vendor_id);
CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON orders(order_number);

-- Order items indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON order_items(menu_item_id);

-- Wallets table indexes
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_balance ON wallets(balance);

-- Transactions table indexes
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_reference_id ON transactions(reference_id);

-- Notifications table indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Device tokens indexes
CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_active ON device_tokens(is_active);
```

### 5.2 Composite Indexes
```sql
-- User notification preferences
CREATE INDEX idx_user_prefs_user_type ON user_notification_preferences(user_id, notification_type);

-- Order search optimization
CREATE INDEX idx_orders_vendor_status_date ON orders(vendor_id, order_status, created_at DESC);
CREATE INDEX idx_orders_customer_status_date ON orders(customer_id, order_status, created_at DESC);

-- Menu item search
CREATE INDEX idx_menu_items_vendor_available ON menu_items(vendor_id, is_available);

-- Transaction search
CREATE INDEX idx_transactions_wallet_type_date ON transactions(wallet_id, transaction_type, created_at DESC);
```

---

## 6. Database Constraints and Business Rules

### 6.1 Check Constraints
```sql
-- Ensure order totals are consistent
ALTER TABLE orders ADD CONSTRAINT check_order_total 
CHECK (total_amount = subtotal + delivery_fee + service_fee + tax_amount - discount_amount);

-- Ensure transaction balance consistency
ALTER TABLE transactions ADD CONSTRAINT check_balance_consistency
CHECK (
    (transaction_type IN ('CREDIT', 'REFUND') AND balance_after = balance_before + amount) OR
    (transaction_type IN ('DEBIT', 'COMMISSION', 'PAYOUT', 'FEE') AND balance_after = balance_before - amount)
);

-- Ensure rating values are valid
ALTER TABLE reviews ADD CONSTRAINT check_rating_range
CHECK (rating >= 1 AND rating <= 5);

-- Ensure vendor commission rate is reasonable
ALTER TABLE vendors ADD CONSTRAINT check_commission_rate
CHECK (commission_rate >= 0 AND commission_rate <= 0.5);
```

### 6.2 Unique Constraints
```sql
-- One default address per user
CREATE UNIQUE INDEX idx_users_default_address 
ON addresses(user_id) WHERE is_default = TRUE;

-- One vendor profile per user
CREATE UNIQUE INDEX idx_user_vendor 
ON vendors(user_id);

-- One wallet per user
CREATE UNIQUE INDEX idx_user_wallet 
ON wallets(user_id);

-- Unique device tokens per user
CREATE UNIQUE INDEX idx_user_device_token 
ON device_tokens(user_id, token);
```

---

## 7. Database Functions and Triggers

### 7.1 Update Timestamp Function
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 7.2 Wallet Balance Update Function
```sql
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        IF NEW.transaction_type IN ('CREDIT', 'REFUND') THEN
            UPDATE wallets 
            SET balance = balance + NEW.amount,
                last_transaction_at = CURRENT_TIMESTAMP
            WHERE id = NEW.wallet_id;
        ELSIF NEW.transaction_type IN ('DEBIT', 'COMMISSION', 'PAYOUT', 'FEE') THEN
            UPDATE wallets 
            SET balance = balance - NEW.amount,
                last_transaction_at = CURRENT_TIMESTAMP
            WHERE id = NEW.wallet_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wallet_balance
AFTER UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_wallet_balance();
```

### 7.3 Vendor Rating Update Function
```sql
CREATE OR REPLACE FUNCTION update_vendor_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Update vendor rating when a new review is added
    UPDATE vendors 
    SET rating_average = (
        SELECT ROUND(AVG(rating)::numeric, 2)
        FROM reviews 
        WHERE vendor_id = NEW.vendor_id
    ),
    total_ratings = (
        SELECT COUNT(*)
        FROM reviews 
        WHERE vendor_id = NEW.vendor_id
    )
    WHERE id = NEW.vendor_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vendor_rating
AFTER INSERT ON reviews
FOR EACH ROW EXECUTE FUNCTION update_vendor_rating();
```

---

## 8. Data Migration and Seeding

### 8.1 Initial Data Seeds
```sql
-- Insert default categories
INSERT INTO categories (id, name, description, sort_order) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Fast Food', 'Quick and delicious meals', 1),
('550e8400-e29b-41d4-a716-446655440002', 'Local Cuisine', 'Traditional Nigerian dishes', 2),
('550e8400-e29b-41d4-a716-446655440003', 'International', 'Global cuisine varieties', 3),
('550e8400-e29b-41d4-a716-446655440004', 'Desserts', 'Sweet treats and desserts', 4),
('550e8400-e29b-41d4-a716-446655440005', 'Beverages', 'Drinks and refreshments', 5);

-- Insert default admin settings
INSERT INTO admin_settings (setting_key, setting_value, setting_type, description) VALUES
('commission_rate', '{"default": 0.15, "min": 0.10, "max": 0.25}', 'BUSINESS', 'Default commission rates'),
('delivery_fee', '{"default": 500, "free_threshold": 5000}', 'BUSINESS', 'Delivery fee settings'),
('payment_methods', '["WALLET", "STRIPE", "PAYSTACK"]', 'PAYMENT', 'Enabled payment methods'),
('notification_settings', '{"push_enabled": true, "sms_enabled": true, "email_enabled": true}', 'NOTIFICATION', 'Notification configurations');

-- Insert notification templates
INSERT INTO notification_templates (template_name, notification_type, title_template, message_template, target_audience) VALUES
('order_confirmed', 'ORDER_UPDATE', 'Order Confirmed - #{order_number}', 'Your order from {vendor_name} has been confirmed. Estimated preparation time: {prep_time} minutes.', 'CUSTOMER'),
('order_preparing', 'ORDER_UPDATE', 'Order Being Prepared - #{order_number}', 'Your order from {vendor_name} is now being prepared.', 'CUSTOMER'),
('order_ready', 'ORDER_UPDATE', 'Order Ready - #{order_number}', 'Your order from {vendor_name} is ready for pickup/delivery.', 'CUSTOMER'),
('new_order_vendor', 'ORDER_UPDATE', 'New Order Received - #{order_number}', 'You have received a new order worth ₦{total_amount}. Order details: {order_summary}', 'VENDOR');
```

---

## 9. Security Considerations

### 9.1 Row Level Security (RLS)
```sql
-- Enable RLS on sensitive tables
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Wallet access policy
CREATE POLICY wallet_owner_policy ON wallets
FOR ALL TO authenticated_user
USING (user_id = current_user_id());

-- Transaction access policy
CREATE POLICY transaction_owner_policy ON transactions
FOR ALL TO authenticated_user
USING (
    wallet_id IN (
        SELECT id FROM wallets WHERE user_id = current_user_id()
    )
);

-- Notification access policy
CREATE POLICY notification_owner_policy ON notifications
FOR ALL TO authenticated_user
USING (user_id = current_user_id());
```

### 9.2 Sensitive Data Encryption
```sql
-- Create extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to encrypt PII data
CREATE OR REPLACE FUNCTION encrypt_pii(data TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(encrypt(data::bytea, key::bytea, 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to decrypt PII data
CREATE OR REPLACE FUNCTION decrypt_pii(encrypted_data TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN convert_from(decrypt(decode(encrypted_data, 'base64'), key::bytea, 'aes'), 'UTF8');
END;
$$ LANGUAGE plpgsql;
```

---

## 10. Performance Optimization

### 10.1 Partitioning Strategy
```sql
-- Partition orders table by creation date
CREATE TABLE orders_partitioned (
    LIKE orders INCLUDING DEFAULTS INCLUDING CONSTRAINTS
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE orders_2024_12 PARTITION OF orders_partitioned
FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

CREATE TABLE orders_2025_01 PARTITION OF orders_partitioned
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Similar partitioning for transactions
CREATE TABLE transactions_partitioned (
    LIKE transactions INCLUDING DEFAULTS INCLUDING CONSTRAINTS
) PARTITION BY RANGE (created_at);
```

### 10.2 Materialized Views for Analytics
```sql
-- Vendor performance summary
CREATE MATERIALIZED VIEW vendor_performance_summary AS
SELECT 
    v.id AS vendor_id,
    v.business_name,
    COUNT(o.id) AS total_orders,
    SUM(o.total_amount) AS total_revenue,
    AVG(o.total_amount) AS average_order_value,
    AVG(r.rating) AS average_rating,
    COUNT(r.id) AS total_reviews
FROM vendors v
LEFT JOIN orders o ON v.id = o.vendor_id AND o.order_status = 'DELIVERED'
LEFT JOIN reviews r ON v.id = r.vendor_id
GROUP BY v.id, v.business_name;

-- Create index on materialized view
CREATE INDEX idx_vendor_performance_vendor_id ON vendor_performance_summary(vendor_id);

-- Refresh materialized view daily
CREATE OR REPLACE FUNCTION refresh_vendor_performance()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY vendor_performance_summary;
END;
$$ LANGUAGE plpgsql;
```

---

## 11. Backup and Recovery Strategy

### 11.1 Backup Configuration
```sql
-- Create backup role
CREATE ROLE backup_user WITH LOGIN PASSWORD 'secure_backup_password';
GRANT CONNECT ON DATABASE rambini TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO backup_user;

-- Backup script (to be run via cron)
-- pg_dump -h localhost -U backup_user -d rambini -f rambini_backup_$(date +%Y%m%d_%H%M%S).sql
```

### 11.2 Point-in-Time Recovery Setup
```sql
-- Enable WAL archiving in postgresql.conf
-- wal_level = replica
-- archive_mode = on
-- archive_command = 'cp %p /backup/wal_archive/%f'
-- max_wal_senders = 3
-- wal_keep_segments = 32
```

---

This comprehensive database design provides a solid foundation for your Rambini food ordering platform. The schema includes all necessary tables, relationships, indexes, and constraints to support the features outlined in your documentation while ensuring scalability, performance, and data integrity. 