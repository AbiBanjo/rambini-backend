
// ============================================================================

// src/modules/admin/controllers/admin-vendor-profile.controller.ts

import {
  Controller,
  Put,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminAuthGuard } from '../../auth/guards/admin-auth-guard';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { User, Address } from 'src/entities';
import {
  AdminUpdatePhoneDto,
  AdminUpdateAddressDto,
  AdminUpdateVendorDto,
  AdminActionResponseDto,
} from '../dto/admin-update-profile.dto';
import { AdminProfileService } from '../service/admin-profile.service';

@ApiTags('Admin - Vendor Profile Management')
@Controller('admin/vendors')
@UseGuards(JwtAuthGuard, AdminAuthGuard)
@ApiBearerAuth()
export class AdminVendorProfileController {
  constructor(private readonly adminProfileService: AdminProfileService) {}

  /**
   * ==================== Vendor Phone Management ====================
   */

  @Put(':vendorId/phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin: Update vendor phone number',
    description:
      'Update the phone number for a vendor (updates the associated user phone)',
  })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiResponse({
    status: 200,
    description: 'Vendor phone number updated successfully',
    type: AdminActionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiResponse({ status: 409, description: 'Phone number already in use' })
  async updateVendorPhone(
    @GetUser() admin: User,
    @Param('vendorId') vendorId: string,
    @Body() updateDto: AdminUpdatePhoneDto,
  ): Promise<AdminActionResponseDto> {
    return await this.adminProfileService.updateVendorPhone(admin, vendorId, updateDto);
  }

  /**
   * ==================== Vendor Address Management ====================
   */

  @Get(':vendorId/address')
  @ApiOperation({
    summary: 'Admin: Get vendor address',
    description: 'Retrieve the business address for a vendor',
  })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiResponse({
    status: 200,
    description: 'Vendor address retrieved successfully',
    type: Address,
  })
  @ApiResponse({ status: 404, description: 'Vendor or address not found' })
  async getVendorAddress(@Param('vendorId') vendorId: string): Promise<Address> {
    return await this.adminProfileService.getVendorAddress(vendorId);
  }

  @Put(':vendorId/address')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin: Update vendor address',
    description: 'Update the business address for a vendor',
  })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiResponse({
    status: 200,
    description: 'Vendor address updated successfully',
    type: AdminActionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async updateVendorAddress(
    @GetUser() admin: User,
    @Param('vendorId') vendorId: string,
    @Body() updateDto: AdminUpdateAddressDto,
  ): Promise<AdminActionResponseDto> {
    return await this.adminProfileService.updateVendorAddress(
      admin,
      vendorId,
      updateDto,
    );
  }

  /**
   * ==================== Vendor Business Info Management ====================
   */

  @Put(':vendorId/info')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin: Update vendor business information',
    description: 'Update vendor business name and certificate number',
  })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiResponse({
    status: 200,
    description: 'Vendor information updated successfully',
    type: AdminActionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async updateVendorInfo(
    @GetUser() admin: User,
    @Param('vendorId') vendorId: string,
    @Body() updateDto: AdminUpdateVendorDto,
  ): Promise<AdminActionResponseDto> {
    return await this.adminProfileService.updateVendorInfo(admin, vendorId, updateDto);
  }
}