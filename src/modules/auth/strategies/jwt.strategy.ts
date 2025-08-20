import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JWTService, JwtPayload } from '../services/jwt.service';
import { User } from '../../../entities';
import { UserService } from '../../user/services/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JWTService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    // Validate token structure
    if (!payload.sub || !payload.phoneNumber || !payload.userType) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Check if token is expired
    // if (this.jwtService.isTokenExpired(payload.sub)) {
    //   throw new UnauthorizedException('Token expired');
    // }

    // Fetch complete user data from database
    try {
      const user = await this.userService.findById(payload.sub);
      
      // Verify the user is still active
      if (user.status !== 'ACTIVE') {
        throw new UnauthorizedException('User account is not active');
      }
      
      return user;
    } catch (error) {
      throw new UnauthorizedException('User not found or inactive');
    }
  }
} 