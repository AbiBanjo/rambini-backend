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

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([Wallet, User, Address]),
    forwardRef(() => UserModule),
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
    JwtAuthGuard,
    JwtStrategy,
    RedisService,
    AddressService, // Provide AddressService directly
  ],
  exports: [AuthService, JWTService, JwtAuthGuard, OTPService],
})
export class AuthModule {} 