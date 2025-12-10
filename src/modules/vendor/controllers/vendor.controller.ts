// src/modules/vendor/controllers/vendor.controller.ts
import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { VendorService } from '../services/vendor.service';
import { CreateVendorDto } from '../dto/create-vendor.dto';
import { Vendor, User } from '../../../entities';
import { GetUser } from '../../../common/decorators/get-user.decorator';

@ApiTags('Vendor')
@Controller('vendor')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create vendor profile',
    description: 'Creates a new vendor profile for the authenticated user. Returns vendor with formatted address details.'
  })
  @ApiResponse({
    status: 201,
    description: 'Vendor profile created successfully with formatted address',
    schema: {
      example: {
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
          longitude: 3.3792
        },
        address: {
          id: 'address-uuid',
          address_line_1: '123 Main St',
          city: 'Lagos',
          state: 'Lagos State',
          postal_code: '100001',
          country: 'NG'
        },
        user: {
          id: 'user-uuid',
          email: 'vendor@example.com',
          full_name: 'John Doe'
        }
      }
    }
  })
  @ApiResponse({
    status: 409,
    description: 'User already has a vendor profile',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async createVendor(
    @GetUser() user: User,
    @Body() createVendorDto: CreateVendorDto,
  ): Promise<Vendor> {
    return await this.vendorService.createVendor(user, createVendorDto);
  }

  @Get('profile')
  @ApiOperation({ 
    summary: 'Get current user vendor profile',
    description: 'Retrieves the vendor profile for the authenticated user with formatted address details.'
  })
  @ApiResponse({
    status: 200,
    description: 'Vendor profile retrieved successfully with formatted address',
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
          longitude: 3.3792
        }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Vendor profile not found' 
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getVendorProfile(@GetUser() user: User): Promise<Vendor> {
    const vendor = await this.vendorService.getVendorByUserId(user.id);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }
    return vendor;
  }

  @Put('profile')
  @ApiOperation({ 
    summary: 'Update vendor profile',
    description: 'Updates the vendor profile for the authenticated user. Returns updated vendor with formatted address details.'
  })
  @ApiResponse({
    status: 200,
    description: 'Vendor profile updated successfully with formatted address',
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Vendor profile not found' 
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async updateVendorProfile(
    @GetUser() user: User,
    @Body() updateData: Partial<CreateVendorDto>,
  ): Promise<Vendor> {
    return await this.vendorService.updateVendor(user.id, updateData);
  }

  @Post('activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Activate vendor profile',
    description: 'Activates the vendor profile for the authenticated user.'
  })
  @ApiResponse({
    status: 200,
    description: 'Vendor profile activated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Vendor profile not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async activateVendor(@GetUser() user: User): Promise<Vendor> {
    return await this.vendorService.activateVendor(user.id);
  }

  @Post('deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Deactivate vendor profile',
    description: 'Deactivates the vendor profile for the authenticated user.'
  })
  @ApiResponse({
    status: 200,
    description: 'Vendor profile deactivated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Vendor profile not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async deactivateVendor(@GetUser() user: User): Promise<Vendor> {
    return await this.vendorService.deactivateVendor(user.id);
  }
}