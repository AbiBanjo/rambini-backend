// src/modules/coupon/controllers/coupon.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CouponService } from '../services/coupon.service';
import { CreateCouponDto, CouponResponseDto } from '../dto';

@ApiTags('Coupons')
@Controller('coupons')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new coupon (Admin/Vendor)' })
  @ApiResponse({ status: 201, description: 'Coupon created successfully', type: CouponResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid coupon data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createCoupon(@Body() createDto: CreateCouponDto): Promise<CouponResponseDto> {
    return await this.couponService.createCoupon(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all coupons' })
  @ApiQuery({ name: 'vendor_id', required: false, description: 'Filter by vendor ID' })
  @ApiResponse({ status: 200, description: 'Coupons retrieved successfully', type: [CouponResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllCoupons(@Query('vendor_id') vendorId?: string): Promise<CouponResponseDto[]> {
    return await this.couponService.getAllCoupons(vendorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get coupon by ID' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  @ApiResponse({ status: 200, description: 'Coupon retrieved successfully', type: CouponResponseDto })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCouponById(@Param('id') id: string): Promise<CouponResponseDto> {
    return await this.couponService.getCouponById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update coupon' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  @ApiResponse({ status: 200, description: 'Coupon updated successfully', type: CouponResponseDto })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateCoupon(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateCouponDto>
  ): Promise<CouponResponseDto> {
    return await this.couponService.updateCoupon(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate coupon' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  @ApiResponse({ status: 200, description: 'Coupon deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deactivateCoupon(@Param('id') id: string): Promise<{ message: string }> {
    await this.couponService.deactivateCoupon(id);
    return { message: 'Coupon deactivated successfully' };
  }
}