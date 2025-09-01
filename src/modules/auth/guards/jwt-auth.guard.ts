import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JWTService } from '../services/jwt.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private readonly jwtService: JWTService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      // Check if the error is related to token expiration
      if (info && info.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired. Please login again.');
      }
      
      // Check if the error is related to invalid token format
      if (info && info.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token format. Please provide a valid token.');
      }
      
      // Check if the error is related to token not provided
      if (info && info.message === 'No auth token') {
        throw new UnauthorizedException('Authentication token is required.');
      }
      
      // For other authentication errors
      if (err) {
        throw err;
      }
      
      throw new UnauthorizedException('Authentication required');
    }
    return user;
  }
} 