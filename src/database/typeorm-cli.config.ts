import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import {
  User,
  Address,
  Vendor,
  Wallet,
  MenuItem,
  Category,
  CartItem,
  Notification,
  UserNotificationPreference,
  DeviceToken,
  Order,
  OrderItem,
  Transaction,
  VendorApplication,
  Payment,
  Delivery,
  DeliveryQuote,
  DeliveryTracking,
  Withdrawal,
  Bank,
  Coupon,        // ADD THIS
  CouponUsage    // ADD THIS
} from '../entities';

// Load environment variables
config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'rambini_db',
  entities: [
    User,
    Address,
    Vendor,
    Wallet,
    MenuItem,
    Category,
    CartItem,
    Notification,
    UserNotificationPreference,
    DeviceToken,
    Order,
    OrderItem,
    Transaction,
    VendorApplication,
    Payment,
    Delivery,
    DeliveryQuote,
    DeliveryTracking,
    Withdrawal,
    Bank,
    Coupon,        // ADD THIS
    CouponUsage    // ADD THIS
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});