import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminAuthGuard } from '../../auth/guards/admin-auth-guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminService } from '../service/admin.service';
import { VendorService } from '../../vendor/services/vendor.service';
import { UserService } from '../../user/services/user.service';
import { Vendor } from '../../../entities';

@ApiTags('Admin - Vendors')
@Controller('admin/vendors')
@UseGuards(JwtAuthGuard, AdminAuthGuard)
@ApiBearerAuth()
export class AdminVendorController {
  constructor(
    private readonly adminService: AdminService,
    private readonly vendorService: VendorService,
    private readonly userService: UserService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get vendor statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Vendor stats retrieved successfully',
  })
  async getVendorStats() {
    return await this.adminService.getVerificationStats();
  }

  @Get()
  @ApiOperation({ summary: 'Get all vendors (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'All vendors retrieved successfully',
    type: [Vendor],
  })
  async getAllVendors(): Promise<Vendor[]> {
    return await this.adminService.getAllVendors();
  }

  @Get(':vendorId')
  @ApiOperation({ summary: 'Get vendor by ID (Admin only)' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiResponse({
    status: 200,
    description: 'Vendor retrieved successfully',
    type: Vendor,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async getVendorById(@Param('vendorId') vendorId: string): Promise<Vendor> {
    const vendor = await this.vendorService.getVendorById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }
    return vendor;
  }

  @Post(':vendorId/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a vendor (Admin only)' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiResponse({
    status: 200,
    description: 'Vendor activated successfully',
    type: Vendor,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async activateVendorByAdmin(@Param('vendorId') vendorId: string): Promise<Vendor> {
    const vendor = await this.vendorService.getVendorById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }
    return await this.vendorService.activateVendor(vendor.user_id);
  }

  @Post(':vendorId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a vendor (Admin only)' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiResponse({
    status: 200,
    description: 'Vendor deactivated successfully',
    type: Vendor,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async deactivateVendorByAdmin(@Param('vendorId') vendorId: string): Promise<Vendor> {
    const vendor = await this.vendorService.getVendorById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }
    return await this.vendorService.deactivateVendor(vendor.user_id);
  }

  @Delete(':vendorId')
  @ApiOperation({ summary: 'Delete vendor and associated user (Admin only)' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiResponse({ status: 200, description: 'Vendor and user deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async deleteVendorByAdmin(@Param('vendorId') vendorId: string): Promise<{ message: string }> {
    const vendor = await this.vendorService.getVendorById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }
    
    await this.userService.deleteUser(vendor.user_id);
    
    return { message: 'Vendor and associated user deleted successfully' };
  }
}