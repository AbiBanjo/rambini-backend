// src/modules/admin/controllers/admin-otp.controller.ts
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminAuthGuard } from '../../auth/guards/admin-auth-guard';
import { OtpMonitoringService } from '../service/otp-monitoring.service';
import {
  OtpMonitoringResponseDto,
  OtpMonitoringFilterDto,
  OtpStatsResponseDto,
  OtpRequestStatus,
} from '../dto/otp-monitoring.dto';

@ApiTags('Admin - OTP Monitoring')
@Controller('admin/otp-requests')
@UseGuards(JwtAuthGuard, AdminAuthGuard)
@ApiBearerAuth()
export class AdminOtpController {
  private readonly logger = new Logger(AdminOtpController.name);

  constructor(
    private readonly otpMonitoringService: OtpMonitoringService,
  ) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get all withdrawal OTP requests',
    description: 'Retrieve all withdrawal OTP requests with optional filtering by status, user, or date range'
  })
  @ApiQuery({ 
    name: 'status', 
    enum: OtpRequestStatus, 
    required: false,
    description: 'Filter by OTP status (PENDING, USED, EXPIRED, FAILED_ATTEMPTS)'
  })
  @ApiQuery({ 
    name: 'userId', 
    required: false,
    description: 'Filter by specific user ID'
  })
  @ApiQuery({ 
    name: 'startDate', 
    required: false,
    description: 'Filter by start date (ISO 8601 format)',
    example: '2024-12-01T00:00:00Z'
  })
  @ApiQuery({ 
    name: 'endDate', 
    required: false,
    description: 'Filter by end date (ISO 8601 format)',
    example: '2024-12-31T23:59:59Z'
  })
  @ApiResponse({
    status: 200,
    description: 'OTP requests retrieved successfully',
    type: [OtpMonitoringResponseDto],
  })
  async getAllOtpRequests(
    @Query() filters: OtpMonitoringFilterDto,
  ): Promise<OtpMonitoringResponseDto[]> {
    this.logger.log(`[ADMIN] Fetching OTP requests with filters: ${JSON.stringify(filters)}`);
    return await this.otpMonitoringService.getAllOtpRequests(filters);
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get OTP request statistics',
    description: 'Get aggregated statistics about withdrawal OTP requests'
  })
  @ApiResponse({
    status: 200,
    description: 'OTP statistics retrieved successfully',
    type: OtpStatsResponseDto,
  })
  async getOtpStats(): Promise<OtpStatsResponseDto> {
    this.logger.log('[ADMIN] Fetching OTP statistics');
    return await this.otpMonitoringService.getOtpStats();
  }

  @Get('active')
  @ApiOperation({ 
    summary: 'Get active OTP requests',
    description: 'Retrieve all non-expired, pending OTP requests'
  })
  @ApiResponse({
    status: 200,
    description: 'Active OTP requests retrieved successfully',
    type: [OtpMonitoringResponseDto],
  })
  async getActiveOtpRequests(): Promise<OtpMonitoringResponseDto[]> {
    this.logger.log('[ADMIN] Fetching active OTP requests');
    return await this.otpMonitoringService.getActiveOtpRequests();
  }

  @Get('user/:userId')
  @ApiOperation({ 
    summary: 'Get OTP requests by user',
    description: 'Retrieve all OTP requests for a specific user'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'User ID',
    example: 'user-uuid-123' 
  })
  @ApiResponse({
    status: 200,
    description: 'User OTP requests retrieved successfully',
    type: [OtpMonitoringResponseDto],
  })
  async getOtpRequestsByUser(
    @Param('userId') userId: string,
  ): Promise<OtpMonitoringResponseDto[]> {
    this.logger.log(`[ADMIN] Fetching OTP requests for user: ${userId}`);
    return await this.otpMonitoringService.getOtpRequestsByUser(userId);
  }

  @Get(':otpId')
  @ApiOperation({ 
    summary: 'Get OTP request by ID',
    description: 'Retrieve detailed information about a specific OTP request'
  })
  @ApiParam({ 
    name: 'otpId', 
    description: 'OTP Request ID',
    example: 'withdrawal_otp_1733577600000_abc123xyz' 
  })
  @ApiResponse({
    status: 200,
    description: 'OTP request retrieved successfully',
    type: OtpMonitoringResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'OTP request not found or expired',
  })
  async getOtpRequestById(
    @Param('otpId') otpId: string,
  ): Promise<OtpMonitoringResponseDto> {
    this.logger.log(`[ADMIN] Fetching OTP request: ${otpId}`);
    return await this.otpMonitoringService.getOtpRequestById(otpId);
  }
}