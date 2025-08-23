import { Controller, Get, Post, Put, Delete, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { 
  RoleGuard, 
  PermissionGuard, 
  AccessControlGuard,
  Roles,
  RequirePermissions,
  RequireVendorOwnership,
  AccessControl,
  AdminOnly,
  VendorOnly,
  CustomerOnly,
  AdminOrVendor,
  AdminOrCustomer,
  AuthenticatedOnly
} from './index';
import { UserType } from 'src/entities';

// Example 1: Basic Role-Based Access Control
@Controller('role-example')
@UseGuards(JwtAuthGuard, RoleGuard)
export class RoleExampleController {
  
  @Get('admin-only')
  @Roles(UserType.ADMIN)
  async adminOnly() {
    return { message: 'Only admins can see this' };
  }

  @Get('vendor-only')
  @Roles(UserType.VENDOR)
  async vendorOnly() {
    return { message: 'Only vendors can see this' };
  }

  @Get('admin-or-vendor')
  @Roles(UserType.ADMIN, UserType.VENDOR)
  async adminOrVendor() {
    return { message: 'Admins or vendors can see this' };
  }
}

// Example 2: Permission-Based Access Control
@Controller('permission-example')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PermissionExampleController {
  
  @Post('create-menu')
  @RequirePermissions('menu:write')
  async createMenu() {
    return { message: 'User has menu:write permission' };
  }

  @Delete('delete-menu/:id')
  @RequirePermissions('menu:delete')
  async deleteMenu() {
    return { message: 'User has menu:delete permission' };
  }

  @Put('vendor/:id')
  @RequireVendorOwnership('id')
  async updateVendor() {
    return { message: 'Vendor owns this resource' };
  }
}

// Example 3: Comprehensive Access Control
@Controller('access-control-example')
@UseGuards(JwtAuthGuard, AccessControlGuard)
export class AccessControlExampleController {
  
  @Get('public-data')
  @AccessControl({ allowPublic: true })
  async publicData() {
    return { message: 'Anyone can access this' };
  }

  @Get('authenticated-data')
  @AccessControl({ roles: [UserType.ADMIN, UserType.VENDOR, UserType.CUSTOMER] })
  async authenticatedData() {
    return { message: 'Any authenticated user can access this' };
  }

  @Post('create-order')
  @AccessControl({
    roles: [UserType.CUSTOMER],
    permissions: ['orders:create']
  })
  async createOrder() {
    return { message: 'Customer with orders:create permission' };
  }

  @Put('update-order/:id')
  @AccessControl({
    roles: [UserType.VENDOR],
    permissions: ['orders:update'],
    requireVendorOwnership: 'id'
  })
  async updateOrder() {
    return { message: 'Vendor with orders:update permission who owns the order' };
  }

  @Delete('delete-order/:id')
  @AccessControl({
    roles: [UserType.ADMIN],
    permissions: ['orders:delete']
  })
  async deleteOrder() {
    return { message: 'Admin with orders:delete permission' };
  }
}

// Example 4: Convenience Decorators
@Controller('convenience-example')
@UseGuards(JwtAuthGuard, AccessControlGuard)
export class ConvenienceExampleController {
  
  @Get('admin-stats')
  @AdminOnly()
  async adminStats() {
    return { message: 'Admin statistics' };
  }

  @Get('vendor-dashboard')
  @VendorOnly()
  async vendorDashboard() {
    return { message: 'Vendor dashboard' };
  }

  @Get('customer-profile')
  @CustomerOnly()
  async customerProfile() {
    return { message: 'Customer profile' };
  }

  @Get('shared-data')
  @AdminOrVendor()
  async sharedData() {
    return { message: 'Data shared between admins and vendors' };
  }

  @Get('user-info')
  @AuthenticatedOnly()
  async userInfo() {
    return { message: 'Any authenticated user info' };
  }
}

// Example 5: Mixed Approach
@Controller('mixed-example')
export class MixedExampleController {
  
  @Get('public')
  async publicEndpoint() {
    return { message: 'No guards - public access' };
  }

  @Get('protected')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserType.ADMIN)
  async protectedEndpoint() {
    return { message: 'Protected with RoleGuard' };
  }

  @Post('create')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('resource:create')
  async createResource() {
    return { message: 'Protected with PermissionGuard' };
  }

  @Put('update/:id')
  @UseGuards(JwtAuthGuard, AccessControlGuard)
  @AccessControl({
    roles: [UserType.VENDOR],
    requireVendorOwnership: 'id'
  })
  async updateResource() {
    return { message: 'Protected with AccessControlGuard' };
  }
} 