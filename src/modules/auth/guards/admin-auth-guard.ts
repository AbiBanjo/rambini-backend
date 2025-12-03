import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new BadRequestException('Invalid user account');
    }
    if (user.user_type !== 'ADMIN') {
      throw new ForbiddenException(
        'You are not allowed to access this resource',
      );
    }
    return true;
  }
}
