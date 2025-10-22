export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'rambini_db',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },
  
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.AWS_S3_BUCKET || 'rambini-uploads',
    s3BucketRegion: process.env.AWS_S3_BUCKET_REGION || 'us-east-1',
  },
  
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
    publicKey: process.env.PAYSTACK_PUBLIC_KEY,
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
    callbackUrl: process.env.PAYSTACK_CALLBACK_URL,
  },
  
  fcm: {
    serverKey: process.env.FCM_SERVER_KEY,
    projectId: process.env.FCM_PROJECT_ID,
  },
  
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60,
    rateLimitLimit: parseInt(process.env.RATE_LIMIT_LIMIT, 10) || 100,
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || 'logs/app.log',
  },
  
  external: {
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    geocodingApiKey: process.env.GEOCODING_API_KEY,
    mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN,
  },

  shipbubble: {
    apiKey: process.env.SHIPBUBBLE_API_KEY,
    webhookSecret: process.env.SHIPBUBBLE_WEBHOOK_SECRET,
  },

  uber: {
    clientId: process.env.UBER_CLIENT_ID,
    clientSecret: process.env.UBER_CLIENT_SECRET,
    customerId: process.env.UBER_CUSTOMER_ID,
    webhookSecret: process.env.UBER_WEBHOOK_SECRET,
  },
  
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@rambini.com',
    password: process.env.ADMIN_PASSWORD || 'admin_password_123',
  },
  
  notifications: {
    push: process.env.PUSH_NOTIFICATIONS_ENABLED === 'true',
    sms: process.env.SMS_NOTIFICATIONS_ENABLED === 'true',
    email: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
  },
  
  fees: {
    serviceFeePercentage: parseFloat(process.env.SERVICE_FEE_PERCENTAGE) || 15,
    commissionPercentage: parseFloat(process.env.COMMISSION_PERCENTAGE) || 20,
  },
}); 