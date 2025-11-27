import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet, User, Address } from '../../entities';

// Services
import { AuthService } from './services/auth.service';
import { EmailAuthService } from './services/email-auth.service';
import { PasswordService } from './services/password.service';
import { SocialAuthService } from './services/social-auth.service';
import { ProfileService } from './services/profile.service';
import { OTPService } from './services/otp.service';
import { SMSService } from './services/sms.service';
import { JWTService } from './services/jwt.service';
import { GoogleAuthService } from './services/google-auth.service';
import { AppleAuthService } from './services/apple-auth.service';
import { TwilioVerifyService } from './services/twillo-otp.service';

// Helpers
import { AuthResponseBuilder } from './helpers/auth-response.builder';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { EmailAuthController } from './controllers/email-auth.controller';
import { PasswordController } from './controllers/password.controller';
import { SocialAuthController } from './controllers/social-auth.controller';

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
  controllers: [
    AuthController,
    EmailAuthController,      // ✅ ADD THIS
    PasswordController,        // ✅ ADD THIS
    SocialAuthController,      // ✅ ADD THIS
  ],
  providers: [
    AuthService,
    EmailAuthService,
    PasswordService,
    SocialAuthService,
    ProfileService,
    OTPService,
    SMSService,
    JWTService,
    GoogleAuthService,
    AppleAuthService,
    TwilioVerifyService,
    JwtAuthGuard,
    JwtStrategy,
    RedisService,
    AddressService,
    AuthResponseBuilder,
  ],
  exports: [
    AuthService, 
    JWTService, 
    JwtAuthGuard, 
    OTPService, 
    SMSService, 
    TwilioVerifyService,
    EmailAuthService,
    PasswordService,
  ],
})
export class AuthModule {}