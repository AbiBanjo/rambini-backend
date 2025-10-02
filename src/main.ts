import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { json } from 'express';
import { 
  DatabaseExceptionFilter, 
  HttpExceptionFilter, 
  ValidationExceptionFilter 
} from './common/filters';
import { loadEnvironmentVariables, validateRequiredEnvironmentVariables } from './utils/env-loader';

async function bootstrap() {
  // Load environment variables first
  loadEnvironmentVariables();
  
  // Validate required environment variables
  validateRequiredEnvironmentVariables();
  
  const app = await NestFactory.create(AppModule);
  
  // Get configuration service
  const configService = app.get(ConfigService);
  
  // Global prefix
  app.setGlobalPrefix(configService.get('API_PREFIX') || 'api/v1');
  
  // Global exception filters (order matters - most specific first)
  app.useGlobalFilters(
    new DatabaseExceptionFilter(),
    new ValidationExceptionFilter(),
    new HttpExceptionFilter(),
  );
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // CORS configuration
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Rambini Food Ordering API')
    .setDescription('Backend API for Rambini Food Ordering Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('vendors', 'Vendor management endpoints')
    .addTag('menu', 'Menu and food item endpoints')
    .addTag('orders', 'Order management endpoints')
    .addTag('payments', 'Payment and wallet endpoints')
    .addTag('notifications', 'Notification endpoints')
    .addTag('admin', 'Admin dashboard endpoints')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.use('/api/v1/webhooks/payments/stripe', json({
    verify: (req: any, res: any, buf: Buffer) => {
      if (req.originalUrl.startsWith('/api/v1/webhooks/payments/stripe')) {
        req.rawBody = buf;
      }
    }
  }));

  app.use(json())
  
  // Start application
  const port = configService.get('PORT') || 3500;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Rambini Backend API is running on: http://0.0.0.0:${port}`);
  console.log(`📚 API Documentation available at: http://0.0.0.0:${port}/api/docs`);
}

bootstrap(); 