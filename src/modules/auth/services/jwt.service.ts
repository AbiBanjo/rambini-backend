import { Injectable, Logger } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../../../entities';

export interface JwtPayload {
  sub: string;
  phoneNumber: string;
  userType: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class JWTService {
  private readonly logger = new Logger(JWTService.name);

  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  generateTokenPair(user: User): TokenPair {
    const payload: JwtPayload = {
      sub: user.id,
      phoneNumber: user.phone_number,
      userType: user.user_type,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '24h'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    this.logger.log(`Generated tokens for user ${user.id}`);

    return { accessToken, refreshToken };
  }

  verifyToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      this.logger.warn('Token verification failed:', error.message);
      return null;
    }
  }

  decodeToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.decode(token) as JwtPayload;
    } catch (error) {
      this.logger.warn('Token decoding failed:', error.message);
      return null;
    }
  }

  refreshAccessToken(refreshToken: string): string | null {
    try {
      const payload = this.jwtService.verify(refreshToken);
      
      if (!payload) {
        return null;
      }

      const newPayload: JwtPayload = {
        sub: payload.sub,
        phoneNumber: payload.phoneNumber,
        userType: payload.userType,
      };

      return this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '24h'),
      });
    } catch (error) {
      this.logger.warn('Refresh token validation failed:', error.message);
      return null;
    }
  }

  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = this.jwtService.decode(token) as JwtPayload;
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch (error) {
      this.logger.warn('Failed to get token expiration:', error.message);
      return null;
    }
  }

  isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) {
      return true;
    }
    return expiration < new Date();
  }

  getTokenTimeToExpiry(token: string): number {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) {
      return 0;
    }
    return Math.max(0, expiration.getTime() - Date.now());
  }
} 