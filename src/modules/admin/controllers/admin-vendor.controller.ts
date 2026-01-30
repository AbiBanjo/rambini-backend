// src/modules/admin/controllers/admin-vendor.controller.ts
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  NotFoundException,
  Query,
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
import { Ipagination } from '@/utils/pagination.utils';

@ApiTags('Admin - Vendors')
@Controller('admin/vendors')
//@UseGuards(JwtAuthGuard, AdminAuthGuard)
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getVendorStats() {
    return await this.adminService.getVerificationStats();
  }

  @Get()
  @ApiOperation({
    summary: 'Get all vendors (Admin only)',
    description:
      'Retrieves all vendors with complete address information and formatted address details.',
  })
  @ApiResponse({
    status: 200,
    description: 'All vendors retrieved successfully with formatted addresses',
    schema: {
      example: [
        {
          id: 'vendor-uuid',
          user_id: 'user-uuid',
          business_name: 'ABC Business',
          certificate_number: 'RC123456',
          address_id: 'address-uuid',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          fullAddress: '123 Main St, Lagos, Lagos State, 100001, NG',
          formattedAddress: '123 Main St\nLagos, Lagos State, 100001\nNG',
          addressComponents: {
            street: '123 Main St',
            streetLine2: '',
            city: 'Lagos',
            state: 'Lagos State',
            postalCode: '100001',
            country: 'NG',
            latitude: 6.5244,
            longitude: 3.3792,
          },
          address: {
            id: 'address-uuid',
            address_line_1: '123 Main St',
            city: 'Lagos',
            state: 'Lagos State',
          },
          user: {
            id: 'user-uuid',
            email: 'vendor@example.com',
            full_name: 'John Doe',
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllVendors() // @Query('limit') limit: number, // @Query('page') page: number,
  {
    // VendorService.getAllVendors() now returns enriched vendors
    // No need for manual transformation
    return await this.vendorService.getAllVendors();
  }

  @Get(':vendorId')
  @ApiOperation({
    summary: 'Get vendor by ID (Admin only)',
    description:
      'Retrieves a specific vendor with complete address information and formatted address details.',
  })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiResponse({
    status: 200,
    description: 'Vendor retrieved successfully with formatted address',
    schema: {
      example: {
        id: 'vendor-uuid',
        user_id: 'user-uuid',
        business_name: 'ABC Business',
        certificate_number: 'RC123456',
        address_id: 'address-uuid',
        is_active: true,
        fullAddress: '123 Main St, Lagos, Lagos State, 100001, NG',
        formattedAddress: '123 Main St\nLagos, Lagos State, 100001\nNG',
        addressComponents: {
          street: '123 Main St',
          streetLine2: '',
          city: 'Lagos',
          state: 'Lagos State',
          postalCode: '100001',
          country: 'NG',
          latitude: 6.5244,
          longitude: 3.3792,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async getVendorById(@Param('vendorId') vendorId: string): Promise<Vendor> {
    const vendor = await this.vendorService.getVendorById(vendorId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // VendorService.getVendorById() now returns enriched vendor
    // No need for manual transformation
    return vendor;
  }

  @Post(':vendorId/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate a vendor (Admin only)',
    description:
      'Activates a vendor profile. Returns the activated vendor with formatted address details.',
  })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiResponse({
    status: 200,
    description: 'Vendor activated successfully',
    type: Vendor,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async activateVendorByAdmin(
    @Param('vendorId') vendorId: string,
  ): Promise<Vendor> {
    const vendor = await this.vendorService.getVendorById(vendorId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return await this.vendorService.activateVendor(vendor.user_id);
  }

  @Post(':vendorId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate a vendor (Admin only)',
    description:
      'Deactivates a vendor profile. Returns the deactivated vendor with formatted address details.',
  })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiResponse({
    status: 200,
    description: 'Vendor deactivated successfully',
    type: Vendor,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async deactivateVendorByAdmin(
    @Param('vendorId') vendorId: string,
  ): Promise<Vendor> {
    const vendor = await this.vendorService.getVendorById(vendorId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return await this.vendorService.deactivateVendor(vendor.user_id);
  }

  // Add this endpoint to your AdminVendorController

  @Post('cleanup/addresses')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clean corrupted vendor addresses (Admin only)',
    description:
      'Removes duplicate/corrupted data from address_line_2 fields. Run once to fix database.',
  })
  @ApiResponse({
    status: 200,
    description: 'Addresses cleaned successfully',
    schema: {
      example: {
        message: 'Address cleanup completed',
        cleaned: 5,
        total: 20,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async cleanVendorAddresses(): Promise<{
    message: string;
    cleaned: number;
    total: number;
  }> {
    // this.logger.log('[ADMIN] Starting vendor address cleanup...');

    const result = await this.vendorService.cleanAllVendorAddresses();

    // this.logger.log(`[ADMIN] Cleaned ${result.cleaned} out of ${result.total} vendor addresses`);

    return {
      message: 'Address cleanup completed',
      cleaned: result.cleaned,
      total: result.total,
    };
  }

  // OR clean a single vendor
  @Post(':vendorId/cleanup/address')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clean single vendor address (Admin only)',
    description:
      "Removes duplicate/corrupted data from a specific vendor's address_line_2.",
  })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiResponse({
    status: 200,
    description: 'Address cleaned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async cleanSingleVendorAddress(
    @Param('vendorId') vendorId: string,
  ): Promise<{ message: string }> {
    await this.vendorService.cleanVendorAddress(vendorId);

    return {
      message: 'Vendor address cleaned successfully',
    };
  }

  @Delete(':vendorId')
  @ApiOperation({
    summary: 'Delete vendor and associated user (Admin only)',
    description:
      'Permanently deletes a vendor profile and the associated user account.',
  })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiResponse({
    status: 200,
    description: 'Vendor and user deleted successfully',
    schema: {
      example: {
        message: 'Vendor and associated user deleted successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async deleteVendorByAdmin(
    @Param('vendorId') vendorId: string,
  ): Promise<{ message: string }> {
    const vendor = await this.vendorService.getVendorById(vendorId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    await this.userService.deleteUser(vendor.user_id);

    return { message: 'Vendor and associated user deleted successfully' };
  }
}
