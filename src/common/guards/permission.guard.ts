import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserType } from 'src/entities';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (...permissions: string[]) => {
  return (target: any, key?: string, descriptor?: any) => {
    if (descriptor) {
      Reflect.defineMetadata(PERMISSIONS_KEY, permissions, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(PERMISSIONS_KEY, permissions, target);
    return target;
  };
};

export const RequireVendorOwnership = (resourceIdParam: string = 'id') => {
  return (target: any, key?: string, descriptor?: any) => {
    if (descriptor) {
      Reflect.defineMetadata('requireVendorOwnership', resourceIdParam, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata('requireVendorOwnership', resourceIdParam, target);
    return target;
  };
};

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requireVendorOwnership = this.reflector.getAllAndOverride<string>('requireVendorOwnership', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions && !requireVendorOwnership) {
      return true; // No permissions required, allow access
    }

    const { user, params } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check permissions if required
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermission = this.checkPermissions(user, requiredPermissions);
      if (!hasPermission) {
        throw new ForbiddenException(
          `Access denied. Required permissions: ${requiredPermissions.join(', ')}`
        );
      }
    }

    // Check vendor ownership if required
    if (requireVendorOwnership) {
      const hasOwnership = this.checkVendorOwnership(user, params, requireVendorOwnership);
      if (!hasOwnership) {
        throw new ForbiddenException('Access denied. You can only access your own resources.');
      }
    }

    return true;
  }

  private checkPermissions(user: any, requiredPermissions: string[]): boolean {
    // For now, we'll implement basic permission checking
    // You can extend this to check against a user's permission list
    
    // Admin has all permissions
    if (user.user_type === UserType.ADMIN) {
      return true;
    }

    // Vendor permissions
    if (user.user_type === UserType.VENDOR) {
      const vendorPermissions = [
        'menu:read', 'menu:write', 'menu:delete',
        'orders:read', 'orders:update',
        'profile:read', 'profile:write'
      ];
      
      return requiredPermissions.every(permission => 
        vendorPermissions.includes(permission)
      );
    }

    // Customer permissions
    if (user.user_type === UserType.CUSTOMER) {
      const customerPermissions = [
        'menu:read', 'orders:read', 'orders:create',
        'profile:read', 'profile:write', 'cart:manage'
      ];
      
      return requiredPermissions.every(permission => 
        customerPermissions.includes(permission)
      );
    }

    return false;
  }

  private checkVendorOwnership(user: any, params: any, resourceIdParam: string): boolean {
    if (user.user_type !== UserType.VENDOR) {
      return false;
    }

    const resourceId = params[resourceIdParam];
    if (!resourceId) {
      return false;
    }

    // This is a basic check - in practice, you'd want to verify against the database
    // that the resource actually belongs to the vendor
    // For now, we'll assume the user.vendor_id is set correctly
    return user.vendor_id && user.vendor_id === resourceId;
  }
} 