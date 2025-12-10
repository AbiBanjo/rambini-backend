// src/modules/admin/controllers/admin-user-profile.controller.ts

import {
  Controller,
  Put,
  Post,
  Delete,
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
  AdminActionResponseDto,
} from '../dto/admin-update-profile.dto';
import { AdminProfileService } from '../service/admin-profile.service';

@ApiTags('Admin - User Profile Management')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminAuthGuard)
@ApiBearerAuth()
export class AdminUserProfileController {
  constructor(private readonly adminProfileService: AdminProfileService) {}

  /**
   * ==================== Phone Number Management ====================
   */

  @Put(':userId/phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin: Update user phone number',
    description: 'Allows admin to update a user phone number. Resets phone verification status.',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Phone number updated successfully',
    type: AdminActionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Phone number already in use' })
  async updateUserPhone(
    @GetUser() admin: User,
    @Param('userId') userId: string,
    @Body() updateDto: AdminUpdatePhoneDto,
  ): Promise<AdminActionResponseDto> {
    return await this.adminProfileService.updateUserPhone(admin, userId, updateDto);
  }

  /**
   * ==================== Address Management ====================
   */

  @Get(':userId/addresses')
  @ApiOperation({
    summary: 'Admin: Get all user addresses',
    description: 'Retrieve all addresses for a specific user',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Addresses retrieved successfully',
    type: [Address],
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserAddresses(@Param('userId') userId: string): Promise<Address[]> {
    return await this.adminProfileService.getUserAddresses(userId);
  }

  @Post(':userId/addresses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Admin: Create new address for user',
    description: 'Create a new address for a specific user',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 201,
    description: 'Address created successfully',
    type: AdminActionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async createUserAddress(
    @GetUser() admin: User,
    @Param('userId') userId: string,
    @Body() createDto: AdminUpdateAddressDto,
  ): Promise<AdminActionResponseDto> {
    return await this.adminProfileService.createUserAddress(admin, userId, createDto);
  }

  @Put(':userId/addresses/:addressId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin: Update user address',
    description: 'Update a specific address for a user',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'addressId', description: 'Address ID' })
  @ApiResponse({
    status: 200,
    description: 'Address updated successfully',
    type: AdminActionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User or address not found' })
  async updateUserAddress(
    @GetUser() admin: User,
    @Param('userId') userId: string,
    @Param('addressId') addressId: string,
    @Body() updateDto: AdminUpdateAddressDto,
  ): Promise<AdminActionResponseDto> {
    return await this.adminProfileService.updateUserAddress(
      admin,
      userId,
      addressId,
      updateDto,
    );
  }

  @Delete(':userId/addresses/:addressId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin: Delete user address',
    description: 'Delete a specific address for a user',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'addressId', description: 'Address ID' })
  @ApiResponse({
    status: 200,
    description: 'Address deleted successfully',
    type: AdminActionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User or address not found' })
  async deleteUserAddress(
    @GetUser() admin: User,
    @Param('userId') userId: string,
    @Param('addressId') addressId: string,
    @Body() body: { reason?: string },
  ): Promise<AdminActionResponseDto> {
    return await this.adminProfileService.deleteUserAddress(
      admin,
      userId,
      addressId,
      body.reason,
    );
  }
}
