# Role Guards and Access Control

This module provides a comprehensive set of guards and decorators for controlling access to your API endpoints based on user roles and permissions.

## Available Guards

### 1. RoleGuard
Basic role-based access control using the `@Roles()` decorator.

### 2. PermissionGuard
Permission-based access control using the `@RequirePermissions()` decorator.

### 3. AccessControlGuard
Comprehensive access control that combines roles, permissions, and ownership checks.

## Usage Examples

### Basic Role-Based Access Control

```typescript
import { Roles, RoleGuard } from 'src/common/guards';
import { UseGuards } from '@nestjs/common';

@Controller('admin')
@UseGuards(JwtAuthGuard, RoleGuard)
export class AdminController {
  
  @Get('users')
  @Roles(UserType.ADMIN)
  async getAllUsers() {
    // Only admins can access this endpoint
  }

  @Get('vendors')
  @Roles(UserType.ADMIN, UserType.VENDOR)
  async getVendors() {
    // Both admins and vendors can access this endpoint
  }
}
```

### Permission-Based Access Control

```typescript
import { RequirePermissions, PermissionGuard } from 'src/common/guards';
import { UseGuards } from '@nestjs/common';

@Controller('menu')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class MenuController {
  
  @Post()
  @RequirePermissions('menu:write')
  async createMenuItem() {
    // Only users with 'menu:write' permission can access this
  }

  @Delete(':id')
  @RequirePermissions('menu:delete')
  async deleteMenuItem() {
    // Only users with 'menu:delete' permission can access this
  }
}
```

### Vendor Ownership Checks

```typescript
import { RequireVendorOwnership, PermissionGuard } from 'src/common/guards';

@Controller('vendor')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class VendorController {
  
  @Put(':id')
  @RequireVendorOwnership('id')
  async updateVendor() {
    // Only the vendor who owns the resource can access this
    // The 'id' parameter is used to check ownership
  }
}
```

### Comprehensive Access Control

```typescript
import { AccessControl, AccessControlGuard } from 'src/common/guards';
import { UseGuards } from '@nestjs/common';

@Controller('orders')
@UseGuards(JwtAuthGuard, AccessControlGuard)
export class OrderController {
  
  @Get()
  @AccessControl({
    roles: [UserType.ADMIN, UserType.VENDOR, UserType.CUSTOMER],
    permissions: ['orders:read']
  })
  async getOrders() {
    // All authenticated users with 'orders:read' permission
  }

  @Post()
  @AccessControl({
    roles: [UserType.CUSTOMER],
    permissions: ['orders:create']
  })
  async createOrder() {
    // Only customers with 'orders:create' permission
  }

  @Put(':id')
  @AccessControl({
    roles: [UserType.VENDOR],
    permissions: ['orders:update'],
    requireVendorOwnership: 'id'
  })
  async updateOrder() {
    // Only vendors with 'orders:update' permission who own the order
  }
}
```

### Convenience Decorators

```typescript
import { 
  AdminOnly, 
  VendorOnly, 
  CustomerOnly, 
  AdminOrVendor, 
  AdminOrCustomer, 
  AuthenticatedOnly 
} from 'src/common/guards';

@Controller('api')
@UseGuards(JwtAuthGuard, AccessControlGuard)
export class ApiController {
  
  @Get('admin-stats')
  @AdminOnly()
  async getAdminStats() {
    // Only admins
  }

  @Get('vendor-dashboard')
  @VendorOnly()
  async getVendorDashboard() {
    // Only vendors
  }

  @Get('customer-profile')
  @CustomerOnly()
  async getCustomerProfile() {
    // Only customers
  }

  @Get('shared-data')
  @AdminOrVendor()
  async getSharedData() {
    // Admins or vendors
  }

  @Get('user-info')
  @AuthenticatedOnly()
  async getUserInfo() {
    // Any authenticated user
  }
}
```

## Setting Up Guards

### Global Setup (Recommended)

Add the guards to your `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RoleGuard, PermissionGuard, AccessControlGuard } from 'src/common/guards';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AccessControlGuard,
    },
  ],
})
export class AppModule {}
```

### Per-Controller Setup

```typescript
import { UseGuards } from '@nestjs/common';
import { RoleGuard } from 'src/common/guards';

@Controller('protected')
@UseGuards(JwtAuthGuard, RoleGuard)
export class ProtectedController {
  // All endpoints in this controller will use RoleGuard
}
```

### Per-Endpoint Setup

```typescript
import { UseGuards } from '@nestjs/common';
import { RoleGuard } from 'src/common/guards';

@Controller('mixed')
export class MixedController {
  
  @Get('public')
  async publicEndpoint() {
    // No guards
  }

  @Get('protected')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserType.ADMIN)
  async protectedEndpoint() {
    // Protected with RoleGuard
  }
}
```

## Permission System

The permission system uses a hierarchical approach:

### Admin Permissions
- Admins have access to all permissions
- Can perform any operation on any resource

### Vendor Permissions
- `menu:read`, `menu:write`, `menu:delete`
- `orders:read`, `orders:update`, `orders:cancel`
- `profile:read`, `profile:write`
- `analytics:read`, `reports:read`

### Customer Permissions
- `menu:read`
- `orders:read`, `orders:create`, `orders:cancel`
- `profile:read`, `profile:write`
- `cart:manage`
- `reviews:read`, `reviews:write`

## Ownership Checks

### Vendor Ownership
Use `requireVendorOwnership` to ensure vendors can only access their own resources:

```typescript
@AccessControl({
  roles: [UserType.VENDOR],
  requireVendorOwnership: 'vendorId'
})
```

### Customer Ownership
Use `requireCustomerOwnership` to ensure customers can only access their own resources:

```typescript
@AccessControl({
  roles: [UserType.CUSTOMER],
  requireCustomerOwnership: 'userId'
})
```

## Error Handling

All guards throw `ForbiddenException` with descriptive error messages:

- `Access denied. Required roles: ADMIN, VENDOR. Your role: CUSTOMER`
- `Access denied. Required permissions: menu:write`
- `Access denied. You can only access your own vendor resources.`

## Best Practices

1. **Use the most specific guard** for your needs
2. **Combine guards** when you need multiple checks
3. **Use convenience decorators** for common role combinations
4. **Always validate ownership** for resource-specific operations
5. **Keep permissions granular** for better security control
6. **Test your guards** thoroughly with different user types

## Migration from Manual Checks

Replace manual role checks like this:

```typescript
// Old way
if (req.user.user_type !== 'VENDOR') {
  throw new Error('Only vendors can access this');
}

// New way
@VendorOnly()
async endpoint() {
  // Guard handles the check automatically
}
```

This makes your code cleaner, more maintainable, and more secure. 