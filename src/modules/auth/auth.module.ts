import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet, User, Address } from '../../entities';

// Services
import { AuthService } from './services/auth.service';
import { OTPService } from './services/otp.service';
import { SMSService } from './services/sms.service';
import { JWTService } from './services/jwt.service';
import { GoogleAuthService } from './services/google-auth.service';
import { AppleAuthService } from './services/apple-auth.service';

// Controllers
import { AuthController } from './controllers/auth.controller';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// Strategies
import { JwtStrategy } from './strategies/jwt.strategy';

// Common services
import { RedisService } from '../../database/redis.service';

// User services (import directly to avoid circular dependency)
import { AddressService } from '../user/services/address.service';
import { UserModule } from '../user/user.module';

// Notification services
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    PassportModule,
    ConfigModule,
    TypeOrmModule.forFeature([Wallet, User, Address]),
    forwardRef(() => UserModule),
    forwardRef(() => NotificationModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN') || '24h',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OTPService,
    SMSService,
    JWTService,
    GoogleAuthService,
    AppleAuthService,
    JwtAuthGuard,
    JwtStrategy,
    RedisService,
    AddressService, // Provide AddressService directly
  ],
  exports: [AuthService, JWTService, JwtAuthGuard, OTPService, SMSService],
})
export class AuthModule {} 