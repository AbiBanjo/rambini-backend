import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { VendorService } from '../services/vendor.service';
import { CreateVendorDto } from '../dto/create-vendor.dto';
import { Vendor, User } from '../../../entities';
import { GetUser } from '@/common/decorators/get-user.decorator';

@ApiTags('Vendor')
@Controller('vendor')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create vendor profile' })
  @ApiResponse({ status: 201, description: 'Vendor profile created successfully' })
  @ApiResponse({ status: 409, description: 'User already has a vendor profile' })
  async createVendor(
    @GetUser() user: User,
    @Body() createVendorDto: CreateVendorDto,
  ): Promise<Vendor> {
    return await this.vendorService.createVendor(user, createVendorDto);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user vendor profile' })
  @ApiResponse({ status: 200, description: 'Vendor profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Vendor profile not found' })
  async getVendorProfile(@Request() req): Promise<Vendor> {
    const vendor = await this.vendorService.getVendorByUserId(req.user.id);
    if (!vendor) {
      throw new Error('Vendor profile not found');
    }
    return vendor;
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update vendor profile' })
  @ApiResponse({ status: 200, description: 'Vendor profile updated successfully' })
  @ApiResponse({ status: 404, description: 'Vendor profile not found' })
  async updateVendorProfile(
    @Request() req,
    @Body() updateData: Partial<CreateVendorDto>,
  ): Promise<Vendor> {
    return await this.vendorService.updateVendor(req.user.id, updateData);
  }

  @Post('activate')
  @ApiOperation({ summary: 'Activate vendor profile' })
  @ApiResponse({ status: 200, description: 'Vendor profile activated successfully' })
  async activateVendor(@Request() req): Promise<Vendor> {
    return await this.vendorService.activateVendor(req.user.id);
  }

  @Post('deactivate')
  @ApiOperation({ summary: 'Deactivate vendor profile' })
  @ApiResponse({ status: 200, description: 'Vendor profile deactivated successfully' })
  async deactivateVendor(@Request() req): Promise<Vendor> {
    return await this.vendorService.deactivateVendor(req.user.id);
  }

  // Admin endpoints for vendor management
  @Get('admin/all')
  @ApiOperation({ summary: 'Get all vendors (Admin only)' })
  @ApiResponse({ status: 200, description: 'All vendors retrieved successfully', type: [Vendor] })
  async getAllVendors(): Promise<Vendor[]> {
    // TODO: Add admin role check
    return await this.vendorService.getAllVendors();
  }

  @Get('admin/stats')
  @ApiOperation({ summary: 'Get vendor statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Vendor stats retrieved successfully' })
  async getVendorStats() {
    // TODO: Add admin role check
    return await this.vendorService.getVerificationStats();
  }
} 