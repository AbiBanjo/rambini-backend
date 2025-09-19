# Backend Implementation Guide
## Rambini Food Ordering Platform

### Document Information
- **Product Name**: Rambini Backend Service
- **Version**: 1.0
- **Date**: December 2024
- **Document Type**: Technical Implementation Guide

---

## 1. Technology Stack & Architecture

### 1.1 Core Technology Stack

#### Backend Framework
**Recommended: Node.js with Express.js**
- **Rationale**: Excellent for real-time applications, large ecosystem, JavaScript throughout stack
- **Alternative**: Python with FastAPI/Django, or Go with Gin

#### Database
**Primary Database: PostgreSQL**
- **Rationale**: ACID compliance, excellent geospatial support (PostGIS), JSON support, scalability
- **Alternative**: MySQL or MongoDB for document flexibility

#### Caching & Session Store
**Redis**
- **Purpose**: Session management, caching, real-time data, queue management
- **Features**: Pub/Sub for real-time notifications, data structure store

#### Real-time Communication
**Socket.IO (WebSocket)**
- **Purpose**: Real-time notifications, order updates, admin broadcasts
- **Features**: Room-based messaging, automatic fallback, scaling support

### 1.2 Payment Processing

#### Payment Gateway Integration
**Paystack**
- **Purpose**: Primary payment processing for Nigerian market
- **Features**: Card payments, bank transfers, USSD, mobile money
- **Currencies**: NGN (primary), USD, ZAR, GHS, KES
- **Integration**: REST API with webhook support
- **Documentation**: See `docs/PAYSTACK_INTEGRATION_GUIDE.md`

**Stripe Integration**
- **Purpose**: International payment processing for global customers
- **Features**: Card payments, digital wallets, 3D Secure, recurring payments
- **Currencies**: USD, EUR, GBP, CAD, AUD, JPY, and 100+ more
- **Integration**: Stripe SDK with PaymentIntents API
- **Documentation**: See `docs/STRIPE_INTEGRATION_GUIDE.md`

**Alternative Payment Methods**
- **Mercury**: Additional payment processing
- **Wallet**: Internal wallet system for users

### 1.3 Cloud Infrastructure

#### Cloud Provider Options
**Option 1: AWS**
- **Compute**: EC2 or ECS/Fargate
- **Database**: RDS PostgreSQL
- **Storage**: S3 for file storage
- **CDN**: CloudFront
- **Notifications**: SNS for push notifications
- **Email**: SES for transactional emails

**Option 2: Google Cloud Platform**
- **Compute**: Compute Engine or Cloud Run
- **Database**: Cloud SQL PostgreSQL
- **Storage**: Cloud Storage
- **Notifications**: Firebase Cloud Messaging
- **Email**: SendGrid integration

**Option 3: DigitalOcean (Cost-effective)**
- **Compute**: Droplets or App Platform
- **Database**: Managed PostgreSQL
- **Storage**: Spaces (S3-compatible)
- **CDN**: Built-in CDN

### 1.3 Third-Party Integrations

#### Payment Processing
- **Stripe**: International cards, webhooks, robust API
- **Paystack**: Local Nigerian payments, mobile money
- **Flutterwave**: African payment gateway alternative

#### SMS Services
- **Primary**: Twilio (reliable, global)
- **Alternative**: Africa's Talking (local), AWS SNS

#### Push Notifications
- **Firebase Cloud Messaging (FCM)**: Android and iOS
- **Apple Push Notification Service (APNs)**: iOS direct

#### Email Services
- **SendGrid**: Transactional emails, templates
- **AWS SES**: Cost-effective for high volume
- **Mailgun**: Developer-friendly API

#### Mapping & Geolocation
- **Google Maps API**: Geocoding, distance calculation
- **MapBox**: Alternative with better pricing

---

## 2. Project Structure & Architecture

### 2.1 Microservices vs Monolith

**Recommended: Modular Monolith (initially)**
```
src/
├── app.js                     # Main application entry
├── config/                    # Configuration files
├── controllers/               # Route handlers
├── middleware/                # Custom middleware
├── models/                    # Database models
├── services/                  # Business logic services
├── utils/                     # Utility functions
├── routes/                    # API route definitions
├── jobs/                      # Background job processors
├── sockets/                   # WebSocket handlers
├── tests/                     # Test files
└── docs/                      # API documentation
```

### 2.2 Detailed Project Structure

```
rambini-backend/
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
├── README.md
├── Dockerfile
├── docker-compose.yml
├── src/
│   ├── app.js                 # Express app setup
│   ├── server.js              # Server startup
│   ├── config/
│   │   ├── database.js        # DB configuration
│   │   ├── redis.js           # Redis configuration
│   │   ├── cloudinary.js      # File upload config
│   │   ├── stripe.js          # Payment config
│   │   └── firebase.js        # Push notification config
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── menu.controller.js
│   │   ├── order.controller.js
│   │   ├── vendor.controller.js
│   │   ├── wallet.controller.js
│   │   ├── notification.controller.js
│   │   └── admin.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── validation.middleware.js
│   │   ├── upload.middleware.js
│   │   ├── rateLimit.middleware.js
│   │   └── error.middleware.js
│   ├── models/
│   │   ├── index.js           # Model associations
│   │   ├── User.js
│   │   ├── Address.js
│   │   ├── Vendor.js
│   │   ├── Category.js
│   │   ├── MenuItem.js
│   │   ├── Order.js
│   │   ├── OrderItem.js
│   │   ├── Wallet.js
│   │   ├── Transaction.js
│   │   ├── Notification.js
│   │   ├── NotificationTemplate.js
│   │   ├── UserNotificationPreference.js
│   │   └── DeviceToken.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── user.service.js
│   │   ├── menu.service.js
│   │   ├── order.service.js
│   │   ├── payment.service.js
│   │   ├── notification.service.js
│   │   ├── location.service.js
│   │   ├── sms.service.js
│   │   └── email.service.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── validators.js
│   │   ├── helpers.js
│   │   ├── constants.js
│   │   └── responses.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── menu.routes.js
│   │   ├── order.routes.js
│   │   ├── vendor.routes.js
│   │   ├── wallet.routes.js
│   │   ├── notification.routes.js
│   │   └── admin.routes.js
│   ├── jobs/
│   │   ├── notification.job.js
│   │   ├── payment.job.js
│   │   └── cleanup.job.js
│   ├── sockets/
│   │   ├── index.js
│   │   ├── notification.socket.js
│   │   └── order.socket.js
│   └── database/
│       ├── migrations/
│       ├── seeders/
│       └── config.js
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/
    ├── api/
    └── deployment/
```

---

## 3. Database Implementation

### 3.1 Database Setup with Sequelize ORM

#### Installation & Configuration
```bash
npm install sequelize pg pg-hstore
npm install --save-dev sequelize-cli
```

#### Database Configuration (`config/database.js`)
```javascript
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = sequelize;
```

### 3.2 Model Definitions

#### User Model (`models/User.js`)
```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      is: /^\+[1-9]\d{1,14}$/ // E.164 format
    }
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  userType: {
    type: DataTypes.ENUM('CUSTOMER', 'VENDOR', 'ADMIN'),
    defaultValue: 'CUSTOMER'
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'SUSPENDED', 'DELETED'),
    defaultValue: 'ACTIVE'
  },
  isPhoneVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  profileCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lastActiveAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',
  timestamps: true,
  indexes: [
    { fields: ['phoneNumber'] },
    { fields: ['email'] },
    { fields: ['userType'] },
    { fields: ['status'] }
  ]
});

module.exports = User;
```

#### Order Model (`models/Order.js`)
```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  vendorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'vendors',
      key: 'id'
    }
  },
  deliveryAddressId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'addresses',
      key: 'id'
    }
  },
  orderStatus: {
    type: DataTypes.ENUM('NEW', 'PREPARING', 'COMPLETED', 'CANCELLED'),
    defaultValue: 'NEW'
  },
  orderType: {
    type: DataTypes.ENUM('DELIVERY', 'PICKUP'),
    defaultValue: 'DELIVERY'
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  deliveryFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  commissionAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.ENUM('WALLET', 'STRIPE', 'PAYSTACK'),
    allowNull: false
  },
  paymentStatus: {
    type: DataTypes.ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED'),
    defaultValue: 'PENDING'
  },
  paymentReference: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'orders',
  timestamps: true,
  indexes: [
    { fields: ['customerId'] },
    { fields: ['vendorId'] },
    { fields: ['orderStatus'] },
    { fields: ['paymentStatus'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = Order;
```

### 3.3 Model Associations (`models/index.js`)
```javascript
const User = require('./User');
const Address = require('./Address');
const Vendor = require('./Vendor');
const MenuItem = require('./MenuItem');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');
const Notification = require('./Notification');

// User associations
User.hasMany(Address, { foreignKey: 'userId', as: 'addresses' });
User.hasOne(Vendor, { foreignKey: 'userId', as: 'vendor' });
User.hasOne(Wallet, { foreignKey: 'userId', as: 'wallet' });
User.hasMany(Order, { foreignKey: 'customerId', as: 'orders' });
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });

// Address associations
Address.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Vendor associations
Vendor.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Vendor.hasMany(MenuItem, { foreignKey: 'vendorId', as: 'menuItems' });
Vendor.hasMany(Order, { foreignKey: 'vendorId', as: 'orders' });

// Order associations
Order.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });
Order.belongsTo(Vendor, { foreignKey: 'vendorId', as: 'vendor' });
Order.belongsTo(Address, { foreignKey: 'deliveryAddressId', as: 'deliveryAddress' });
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });

// OrderItem associations
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
OrderItem.belongsTo(MenuItem, { foreignKey: 'menuItemId', as: 'menuItem' });

// MenuItem associations
MenuItem.belongsTo(Vendor, { foreignKey: 'vendorId', as: 'vendor' });
MenuItem.hasMany(OrderItem, { foreignKey: 'menuItemId', as: 'orderItems' });

// Wallet associations
Wallet.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Wallet.hasMany(Transaction, { foreignKey: 'walletId', as: 'transactions' });

// Transaction associations
Transaction.belongsTo(Wallet, { foreignKey: 'walletId', as: 'wallet' });

// Notification associations
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  User,
  Address,
  Vendor,
  MenuItem,
  Order,
  OrderItem,
  Wallet,
  Transaction,
  Notification
};
```

---

## 4. API Implementation

### 4.1 Express.js Setup (`app.js`)
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const routes = require('./routes');
const errorMiddleware = require('./middleware/error.middleware');
const logger = require('./utils/logger');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', {
  stream: { write: message => logger.info(message.trim()) }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

// Error handling middleware
app.use(errorMiddleware);

module.exports = app;
```

### 4.2 Authentication Service (`services/auth.service.js`)
```javascript
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, Wallet } = require('../models');
const smsService = require('./sms.service');
const redis = require('../config/redis');

class AuthService {
  async register(phoneNumber) {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { phoneNumber } });
    if (existingUser) {
      throw new Error('Phone number already registered');
    }

    // Generate OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const otpId = crypto.randomUUID();

    // Store OTP in Redis with 10 minutes expiration
    await redis.setex(`otp:${otpId}`, 600, JSON.stringify({
      phoneNumber,
      otpCode,
      attempts: 0
    }));

    // Send OTP via SMS
    await smsService.sendOTP(phoneNumber, otpCode);

    return { otpId };
  }

  async verifyOTP(otpId, otpCode) {
    // Get OTP data from Redis
    const otpData = await redis.get(`otp:${otpId}`);
    if (!otpData) {
      throw new Error('OTP expired or invalid');
    }

    const { phoneNumber, otpCode: storedOTP, attempts } = JSON.parse(otpData);

    // Check attempts limit
    if (attempts >= 3) {
      await redis.del(`otp:${otpId}`);
      throw new Error('Too many failed attempts');
    }

    // Verify OTP
    if (otpCode !== storedOTP) {
      // Increment attempts
      await redis.setex(`otp:${otpId}`, 600, JSON.stringify({
        phoneNumber,
        otpCode: storedOTP,
        attempts: attempts + 1
      }));
      throw new Error('Invalid OTP');
    }

    // Create user
    const user = await User.create({
      phoneNumber,
      isPhoneVerified: true
    });

    // Create wallet for user
    await Wallet.create({
      userId: user.id,
      balance: 0,
      currency: 'NGN'
    });

    // Clean up OTP
    await redis.del(`otp:${otpId}`);

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        userType: user.userType,
        profileCompleted: user.profileCompleted
      },
      ...tokens
    };
  }

  async completeProfile(userId, profileData) {
    const { firstName, lastName, email, address } = profileData;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update user profile
    await user.update({
      firstName,
      lastName,
      email,
      profileCompleted: true
    });

    // Create default address if provided
    if (address) {
      const { Address } = require('../models');
      await Address.create({
        userId: user.id,
        ...address,
        isDefault: true
      });
    }

    return user;
  }

  generateTokens(user) {
    const payload = {
      userId: user.id,
      phoneNumber: user.phoneNumber,
      userType: user.userType
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    });

    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await User.findByPk(decoded.userId);
      
      if (!user || user.status !== 'ACTIVE') {
        throw new Error('User not found or inactive');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
}

module.exports = new AuthService();
```

### 4.3 Order Service (`services/order.service.js`)
```javascript
const { Order, OrderItem, MenuItem, Vendor, User, Address, Wallet, Transaction } = require('../models');
const paymentService = require('./payment.service');
const notificationService = require('./notification.service');
const sequelize = require('../config/database');

class OrderService {
  async createOrder(customerId, orderData) {
    const transaction = await sequelize.transaction();

    try {
      const { deliveryAddressId, orderType, paymentMethod, items } = orderData;

      // Validate customer
      const customer = await User.findByPk(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Validate delivery address
      const deliveryAddress = await Address.findOne({
        where: { id: deliveryAddressId, userId: customerId }
      });
      if (!deliveryAddress) {
        throw new Error('Invalid delivery address');
      }

      // Get all menu items and validate
      const menuItemIds = items.map(item => item.menuItemId);
      const menuItems = await MenuItem.findAll({
        where: { id: menuItemIds, isAvailable: true },
        include: [{ model: Vendor, as: 'vendor' }]
      });

      if (menuItems.length !== items.length) {
        throw new Error('Some menu items are not available');
      }

      // Validate all items belong to same vendor
      const vendorIds = [...new Set(menuItems.map(item => item.vendorId))];
      if (vendorIds.length > 1) {
        throw new Error('All items must be from the same vendor');
      }

      const vendorId = vendorIds[0];
      const vendor = menuItems[0].vendor;

      // Calculate order totals
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
        const itemTotal = menuItem.price * item.quantity;
        subtotal += itemTotal;

        orderItems.push({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: menuItem.price,
          totalPrice: itemTotal
        });
      }

      const deliveryFee = orderType === 'DELIVERY' ? 500 : 0; // ₦500 delivery fee
      const commissionRate = vendor.commissionRate || 0.15; // 15% commission
      const commissionAmount = subtotal * commissionRate;
      const totalAmount = subtotal + deliveryFee;

      // Generate unique order number
      const orderNumber = `RB${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // Create order
      const order = await Order.create({
        orderNumber,
        customerId,
        vendorId,
        deliveryAddressId,
        orderType,
        orderStatus: 'NEW',
        subtotal,
        deliveryFee,
        commissionAmount,
        totalAmount,
        paymentMethod,
        paymentStatus: 'PENDING'
      }, { transaction });

      // Create order items
      for (const item of orderItems) {
        await OrderItem.create({
          orderId: order.id,
          ...item
        }, { transaction });
      }

      // Process payment
      const paymentResult = await paymentService.processPayment({
        orderId: order.id,
        customerId,
        amount: totalAmount,
        paymentMethod,
        orderNumber
      }, transaction);

      if (!paymentResult.success) {
        throw new Error(paymentResult.message);
      }

      // Update order payment status
      await order.update({
        paymentStatus: 'PAID',
        paymentReference: paymentResult.reference
      }, { transaction });

      await transaction.commit();

      // Send notifications
      await this.sendOrderNotifications(order.id);

      return order;

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async updateOrderStatus(orderId, vendorId, newStatus) {
    const order = await Order.findOne({
      where: { id: orderId, vendorId },
      include: [
        { model: User, as: 'customer' },
        { model: Vendor, as: 'vendor' }
      ]
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const validTransitions = {
      'NEW': ['PREPARING', 'CANCELLED'],
      'PREPARING': ['COMPLETED', 'CANCELLED'],
      'COMPLETED': [],
      'CANCELLED': []
    };

    if (!validTransitions[order.orderStatus].includes(newStatus)) {
      throw new Error(`Cannot change status from ${order.orderStatus} to ${newStatus}`);
    }

    await order.update({ orderStatus: newStatus });

    // Handle completion
    if (newStatus === 'COMPLETED') {
      await this.handleOrderCompletion(order);
    }

    // Send status update notification
    await notificationService.sendOrderStatusUpdate(order, newStatus);

    return order;
  }

  async handleOrderCompletion(order) {
    const transaction = await sequelize.transaction();

    try {
      // Credit vendor wallet (total - commission)
      const vendorEarnings = order.subtotal + order.deliveryFee - order.commissionAmount;
      
      const vendorWallet = await Wallet.findOne({
        where: { userId: order.vendor.userId }
      });

      await vendorWallet.update({
        balance: sequelize.literal(`balance + ${vendorEarnings}`)
      }, { transaction });

      // Create vendor credit transaction
      await Transaction.create({
        walletId: vendorWallet.id,
        transactionType: 'CREDIT',
        amount: vendorEarnings,
        description: `Order ${order.orderNumber} payment`,
        referenceId: order.id,
        status: 'COMPLETED'
      }, { transaction });

      // Create commission transaction
      await Transaction.create({
        walletId: vendorWallet.id,
        transactionType: 'COMMISSION',
        amount: order.commissionAmount,
        description: `Commission for order ${order.orderNumber}`,
        referenceId: order.id,
        status: 'COMPLETED'
      }, { transaction });

      await transaction.commit();

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async sendOrderNotifications(orderId) {
    const order = await Order.findByPk(orderId, {
      include: [
        { model: User, as: 'customer' },
        { model: Vendor, as: 'vendor', include: [{ model: User, as: 'user' }] }
      ]
    });

    // Notify customer
    await notificationService.create({
      userId: order.customerId,
      type: 'ORDER_UPDATE',
      title: 'Order Confirmed',
      message: `Your order ${order.orderNumber} has been confirmed`,
      data: { orderId: order.id, orderNumber: order.orderNumber }
    });

    // Notify vendor
    await notificationService.create({
      userId: order.vendor.userId,
      type: 'ORDER_UPDATE',
      title: 'New Order Received',
      message: `New order ${order.orderNumber} - ₦${order.totalAmount}`,
      data: { orderId: order.id, orderNumber: order.orderNumber }
    });
  }
}

module.exports = new OrderService();
```

---

## 5. Real-time Implementation

### 5.1 Socket.IO Setup (`sockets/index.js`)
```javascript
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
  }

  init(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        methods: ['GET', 'POST']
      }
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await User.findByPk(decoded.userId);
        if (!user) {
          throw new Error('User not found');
        }

        socket.userId = user.id;
        socket.userType = user.userType;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    return this.io;
  }

  handleConnection(socket) {
    const userId = socket.userId;
    
    // Store connected user
    this.connectedUsers.set(userId, {
      socketId: socket.id,
      userType: socket.userType,
      connectedAt: new Date()
    });

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Join user type room
    socket.join(`userType:${socket.userType}`);

    console.log(`User ${userId} connected via socket ${socket.id}`);

    // Handle disconnection
    socket.on('disconnect', () => {
      this.connectedUsers.delete(userId);
      console.log(`User ${userId} disconnected`);
    });

    // Handle real-time events
    this.setupEventHandlers(socket);
  }

  setupEventHandlers(socket) {
    // Join vendor order room
    socket.on('join:vendor:orders', (vendorId) => {
      if (socket.userType === 'VENDOR') {
        socket.join(`vendor:${vendorId}:orders`);
      }
    });

    // Join customer order room
    socket.on('join:customer:orders', (customerId) => {
      if (socket.userType === 'CUSTOMER') {
        socket.join(`customer:${customerId}:orders`);
      }
    });

    // Mark notification as read
    socket.on('notification:read', async (notificationId) => {
      const notificationService = require('../services/notification.service');
      await notificationService.markAsRead(notificationId, socket.userId);
    });
  }

  // Send notification to specific user
  sendToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Send to all users of a specific type
  sendToUserType(userType, event, data) {
    this.io.to(`userType:${userType}`).emit(event, data);
  }

  // Send order update to vendor
  sendOrderToVendor(vendorId, orderData) {
    this.io.to(`vendor:${vendorId}:orders`).emit('order:new', orderData);
  }

  // Send order status update to customer
  sendOrderStatusToCustomer(customerId, statusData) {
    this.io.to(`customer:${customerId}:orders`).emit('order:status', statusData);
  }

  // Broadcast system announcement
  broadcastAnnouncement(announcement) {
    this.io.emit('system:announcement', announcement);
  }
}

module.exports = new SocketService();
```

### 5.2 Notification Service (`services/notification.service.js`)
```javascript
const { Notification, User, DeviceToken, UserNotificationPreference } = require('../models');
const socketService = require('../sockets');
const pushNotificationService = require('./pushNotification.service');
const smsService = require('./sms.service');
const emailService = require('./email.service');

class NotificationService {
  async create(notificationData) {
    const { userId, type, title, message, data = {} } = notificationData;

    // Create notification record
    const notification = await Notification.create({
      userId,
      notificationType: type,
      title,
      message,
      data,
      deliveryMethod: 'IN_APP',
      isRead: false
    });

    // Get user preferences
    const preferences = await this.getUserPreferences(userId, type);

    // Send real-time notification
    if (preferences.inApp) {
      socketService.sendToUser(userId, 'notification:new', {
        id: notification.id,
        type,
        title,
        message,
        data,
        createdAt: notification.createdAt
      });
    }

    // Send push notification
    if (preferences.push) {
      await this.sendPushNotification(userId, { title, message, data });
    }

    // Send SMS for critical notifications
    if (preferences.sms && this.isCriticalNotification(type)) {
      await this.sendSMSNotification(userId, message);
    }

    // Send email notification
    if (preferences.email) {
      await this.sendEmailNotification(userId, { title, message, data });
    }

    return notification;
  }

  async getUserPreferences(userId, notificationType) {
    const preferences = await UserNotificationPreference.findOne({
      where: { userId, notificationType }
    });

    // Default preferences if not set
    return {
      inApp: preferences?.inAppEnabled ?? true,
      push: preferences?.pushEnabled ?? true,
      sms: preferences?.smsEnabled ?? false,
      email: preferences?.emailEnabled ?? true
    };
  }

  async sendPushNotification(userId, notificationData) {
    const deviceTokens = await DeviceToken.findAll({
      where: { userId, isActive: true }
    });

    for (const device of deviceTokens) {
      try {
        await pushNotificationService.send(device.token, device.deviceType, notificationData);
      } catch (error) {
        console.error(`Failed to send push notification to device ${device.id}:`, error);
        // Mark token as inactive if it's invalid
        if (error.code === 'INVALID_TOKEN') {
          await device.update({ isActive: false });
        }
      }
    }
  }

  async sendSMSNotification(userId, message) {
    const user = await User.findByPk(userId);
    if (user && user.phoneNumber) {
      await smsService.send(user.phoneNumber, message);
    }
  }

  async sendEmailNotification(userId, notificationData) {
    const user = await User.findByPk(userId);
    if (user && user.email) {
      await emailService.sendNotification(user.email, notificationData);
    }
  }

  isCriticalNotification(type) {
    const criticalTypes = ['PAYMENT_FAILED', 'SECURITY_ALERT', 'ACCOUNT_SUSPENDED'];
    return criticalTypes.includes(type);
  }

  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      where: { id: notificationId, userId }
    });

    if (notification && !notification.isRead) {
      await notification.update({ isRead: true });
      
      // Send real-time update
      socketService.sendToUser(userId, 'notification:read', {
        notificationId,
        unreadCount: await this.getUnreadCount(userId)
      });
    }

    return notification;
  }

  async getUnreadCount(userId) {
    return await Notification.count({
      where: { userId, isRead: false }
    });
  }

  async sendOrderStatusUpdate(order, newStatus) {
    const statusMessages = {
      'PREPARING': 'Your order is being prepared',
      'COMPLETED': 'Your order is ready!',
      'CANCELLED': 'Your order has been cancelled'
    };

    await this.create({
      userId: order.customerId,
      type: 'ORDER_UPDATE',
      title: `Order ${order.orderNumber} Update`,
      message: statusMessages[newStatus],
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: newStatus
      }
    });
  }

  async broadcastToUserType(userType, notificationData) {
    const users = await User.findAll({
      where: { userType, status: 'ACTIVE' }
    });

    const notifications = users.map(user => ({
      ...notificationData,
      userId: user.id
    }));

    await Notification.bulkCreate(notifications);

    // Send real-time notifications
    socketService.sendToUserType(userType, 'notification:broadcast', notificationData);
  }
}

module.exports = new NotificationService();
```

---

## 6. Background Jobs & Queue Management

### 6.1 Job Queue Setup (`jobs/index.js`)
```javascript
const Bull = require('bull');
const redis = require('../config/redis');

// Create job queues
const notificationQueue = new Bull('notification processing', {
  redis: {
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD
  }
});

const paymentQueue = new Bull('payment processing', {
  redis: {
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD
  }
});

// Job processors
notificationQueue.process('send-notification', require('./notification.job'));
paymentQueue.process('process-payment', require('./payment.job'));

// Job scheduling
const scheduleRecurringJobs = () => {
  // Daily cleanup job
  notificationQueue.add('cleanup-old-notifications', {}, {
    repeat: { cron: '0 2 * * *' } // Daily at 2 AM
  });

  // Weekly analytics report
  notificationQueue.add('weekly-analytics', {}, {
    repeat: { cron: '0 9 * * 1' } // Weekly on Monday at 9 AM
  });
};

module.exports = {
  notificationQueue,
  paymentQueue,
  scheduleRecurringJobs
};
```

---

## 7. Testing Strategy

### 7.1 Test Setup (`tests/setup.js`)
```javascript
const { sequelize } = require('../src/config/database');
const app = require('../src/app');

// Test database setup
before(async () => {
  await sequelize.sync({ force: true });
});

after(async () => {
  await sequelize.close();
});

module.exports = { app };
```

### 7.2 Unit Test Example (`tests/unit/auth.service.test.js`)
```javascript
const chai = require('chai');
const sinon = require('sinon');
const authService = require('../../src/services/auth.service');
const smsService = require('../../src/services/sms.service');

const { expect } = chai;

describe('AuthService', () => {
  describe('register', () => {
    beforeEach(() => {
      sinon.stub(smsService, 'sendOTP').resolves();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should send OTP for valid phone number', async () => {
      const result = await authService.register('+2348012345678');
      
      expect(result).to.have.property('otpId');
      expect(smsService.sendOTP.calledOnce).to.be.true;
    });

    it('should throw error for invalid phone number', async () => {
      try {
        await authService.register('invalid-phone');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Invalid phone number');
      }
    });
  });
});
```

---

## 8. Deployment Strategy

### 8.1 Docker Setup (`Dockerfile`)
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
```

### 8.2 Docker Compose (`docker-compose.yml`)
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    volumes:
      - ./logs:/app/logs

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=rambini
      - POSTGRES_USER=rambini_user
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app

volumes:
  postgres_data:
  redis_data:
```

### 8.3 CI/CD Pipeline (GitHub Actions)
```yaml
name: Deploy Rambini Backend

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          # Deploy script here
          echo "Deploying to production..."
```

---

## 9. Security Implementation

### 9.1 Security Middleware (`middleware/security.middleware.js`)
```javascript
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// Rate limiting configurations
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later'
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many API requests, please try again later'
});

module.exports = {
  helmet: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"]
      }
    }
  }),
  authLimiter,
  apiLimiter,
  mongoSanitize: mongoSanitize(),
  xss: xss()
};
```

### 9.2 Input Validation (`middleware/validation.middleware.js`)
```javascript
const { body, param, query, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array()
      }
    });
  }
  next();
};

const phoneValidation = body('phoneNumber')
  .matches(/^\+[1-9]\d{1,14}$/)
  .withMessage('Invalid phone number format (E.164 required)');

const emailValidation = body('email')
  .optional()
  .isEmail()
  .normalizeEmail()
  .withMessage('Invalid email format');

const passwordValidation = body('password')
  .isLength({ min: 8 })
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage('Password must be at least 8 characters with uppercase, lowercase, number and special character');

module.exports = {
  validateRequest,
  phoneValidation,
  emailValidation,
  passwordValidation
};
```

---

## 10. Monitoring & Logging

### 10.1 Logger Setup (`utils/logger.js`)
```javascript
const winston = require('winston');
const path = require('path');

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'rambini-backend' },
  transports: [
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join('logs', 'combined.log')
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
```

### 10.2 Health Check Implementation
```javascript
const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const redis = require('../config/redis');

router.get('/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {}
  };

  try {
    // Database health check
    await sequelize.authenticate();
    health.checks.database = 'OK';
  } catch (error) {
    health.checks.database = 'FAIL';
    health.status = 'FAIL';
  }

  try {
    // Redis health check
    await redis.ping();
    health.checks.redis = 'OK';
  } catch (error) {
    health.checks.redis = 'FAIL';
    health.status = 'FAIL';
  }

  // Memory usage check
  const memUsage = process.memoryUsage();
  health.checks.memory = {
    used: Math.round(memUsage.heapUsed / 1024 / 1024),
    total: Math.round(memUsage.heapTotal / 1024 / 1024),
    status: memUsage.heapUsed < memUsage.heapTotal * 0.9 ? 'OK' : 'WARN'
  };

  const statusCode = health.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(health);
});

module.exports = router;
```

---

## 11. Development Workflow

### 11.1 Environment Setup
```bash
# 1. Clone repository
git clone <repository-url>
cd rambini-backend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# 4. Start database (using Docker)
docker-compose up -d postgres redis

# 5. Run migrations
npm run migrate

# 6. Seed database (optional)
npm run seed

# 7. Start development server
npm run dev
```

### 11.2 Package.json Scripts
```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "mocha tests/**/*.test.js --timeout 10000",
    "test:watch": "npm test -- --watch",
    "migrate": "sequelize-cli db:migrate",
    "migrate:undo": "sequelize-cli db:migrate:undo",
    "seed": "sequelize-cli db:seed:all",
    "lint": "eslint src/ --fix",
    "docs": "swagger-jsdoc -d docs/swagger.js src/routes/*.js -o docs/swagger.json"
  }
}
```

This comprehensive implementation guide provides you with everything needed to build the Rambini food ordering platform backend. The guide covers architecture decisions, detailed code implementations, security considerations, testing strategies, and deployment approaches.

Would you like me to elaborate on any specific section or help you get started with implementing any particular component? 