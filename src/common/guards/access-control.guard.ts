import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserType } from 'src/entities';

export const ACCESS_CONTROL_KEY = 'accessControl';

export interface AccessControlConfig {
  roles?: UserType[];
  permissions?: string[];
  requireVendorOwnership?: string;
  requireCustomerOwnership?: string;
  allowPublic?: boolean;
}

export const AccessControl = (config: AccessControlConfig) => {
  return (target: any, key?: string, descriptor?: any) => {
    if (descriptor) {
      Reflect.defineMetadata(ACCESS_CONTROL_KEY, config, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(ACCESS_CONTROL_KEY, config, target);
    return target;
  };
};

// Convenience decorators
export const AdminOnly = () => AccessControl({ roles: [UserType.ADMIN] });
export const VendorOnly = () => AccessControl({ roles: [UserType.VENDOR] });
export const CustomerOnly = () => AccessControl({ roles: [UserType.CUSTOMER] });
export const AdminOrVendor = () => AccessControl({ roles: [UserType.ADMIN, UserType.VENDOR] });
export const AdminOrCustomer = () => AccessControl({ roles: [UserType.ADMIN, UserType.CUSTOMER] });
export const AuthenticatedOnly = () => AccessControl({ roles: [UserType.ADMIN, UserType.VENDOR, UserType.CUSTOMER] });

@Injectable()
export class AccessControlGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const accessControl = this.reflector.getAllAndOverride<AccessControlConfig>(ACCESS_CONTROL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!accessControl) {
      return true; // No access control required, allow access
    }

    const { user, params } = context.switchToHttp().getRequest();
    
    // Check if endpoint is public
    if (accessControl.allowPublic) {
      return true;
    }

    // Check authentication
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Check roles
    if (accessControl.roles && accessControl.roles.length > 0) {
      if (!accessControl.roles.includes(user.user_type)) {
        throw new ForbiddenException(
          `Access denied. Required roles: ${accessControl.roles.join(', ')}. Your role: ${user.user_type}`
        );
      }
    }

    // Check permissions
    if (accessControl.permissions && accessControl.permissions.length > 0) {
      const hasPermission = this.checkPermissions(user, accessControl.permissions);
      if (!hasPermission) {
        throw new ForbiddenException(
          `Access denied. Required permissions: ${accessControl.permissions.join(', ')}`
        );
      }
    }

    // Check vendor ownership
    if (accessControl.requireVendorOwnership) {
      const hasOwnership = this.checkVendorOwnership(user, params, accessControl.requireVendorOwnership);
      if (!hasOwnership) {
        throw new ForbiddenException('Access denied. You can only access your own vendor resources.');
      }
    }

    // Check customer ownership
    if (accessControl.requireCustomerOwnership) {
      const hasOwnership = this.checkCustomerOwnership(user, params, accessControl.requireCustomerOwnership);
      if (!hasOwnership) {
        throw new ForbiddenException('Access denied. You can only access your own customer resources.');
      }
    }

    return true;
  }

  private checkPermissions(user: any, requiredPermissions: string[]): boolean {
    // Admin has all permissions
    if (user.user_type === UserType.ADMIN) {
      return true;
    }

    // Vendor permissions
    if (user.user_type === UserType.VENDOR) {
      const vendorPermissions = [
        'menu:read', 'menu:write', 'menu:delete',
        'orders:read', 'orders:update', 'orders:cancel',
        'profile:read', 'profile:write',
        'analytics:read', 'reports:read'
      ];
      
      return requiredPermissions.every(permission => 
        vendorPermissions.includes(permission)
      );
    }

    // Customer permissions
    if (user.user_type === UserType.CUSTOMER) {
      const customerPermissions = [
        'menu:read', 'orders:read', 'orders:create', 'orders:cancel',
        'profile:read', 'profile:write', 'cart:manage',
        'reviews:read', 'reviews:write'
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

    // Check if the resource belongs to the vendor
    // This is a basic check - in practice, you'd want to verify against the database
    return user.vendor_id && user.vendor_id === resourceId;
  }

  private checkCustomerOwnership(user: any, params: any, resourceIdParam: string): boolean {
    if (user.user_type !== UserType.CUSTOMER) {
      return false;
    }

    const resourceId = params[resourceIdParam];
    if (!resourceId) {
      return false;
    }

    // Check if the resource belongs to the customer
    // This is a basic check - in practice, you'd want to verify against the database
    return user.id && user.id === resourceId;
  }
} 