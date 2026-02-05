import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { 
  User, 
  Address, 
  Vendor, 
  Wallet, 
  MenuItem, 
  MenuLike,      // ✅ ADD THIS
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
  DeliveryTracking,
  DeliveryQuote,
  Withdrawal,
  Bank,
  SavedCard,
  Coupon,
  CouponUsage
} from 'src/entities';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DB_HOST'),
  port: configService.get('DB_PORT'),
  username: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_DATABASE'),
  entities: [
    User, 
    Address, 
    Vendor, 
    Wallet, 
    MenuItem, 
    MenuLike,      // ✅ ADD THIS
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
    DeliveryTracking,
    DeliveryQuote,
    Withdrawal,
    Bank,
    SavedCard,
    Coupon,
    CouponUsage
  ],
  migrations: configService.get('DB_USE_MIGRATIONS') === 'true' 
    ? [__dirname + '/migrations/*{.ts,.js}'] 
    : [],
  synchronize: configService.get('DB_SYNCHRONIZE') === 'true',
  logging: configService.get('DB_LOGGING') === 'true',
  ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
  autoLoadEntities: false,
  migrationsRun: false,
  migrationsTableName: 'migrations',
});