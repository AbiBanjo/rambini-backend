// src/modules/payment/dto/otp-monitoring.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsDateString } from 'class-validator';

export enum OtpRequestStatus {
  PENDING = 'PENDING',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
  FAILED_ATTEMPTS = 'FAILED_ATTEMPTS',
}

export class OtpMonitoringResponseDto {
  @ApiProperty({ example: 'withdrawal_otp_123456789_abc123' })
  otpId: string;

  @ApiProperty({ example: '123456' })
  otpCode: string;

  @ApiProperty({ example: 'user-uuid-here' })
  userId: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  userEmail: string;

  @ApiProperty({ example: 'John Doe' })
  userName: string;

  @ApiProperty({ example: 50000 })
  requestedAmount: number;

  @ApiProperty({ example: 'NGN' })
  currency: string;

  @ApiProperty({ enum: OtpRequestStatus, example: OtpRequestStatus.PENDING })
  status: OtpRequestStatus;

  @ApiProperty({ example: 0 })
  attempts: number;

  @ApiProperty({ example: 3 })
  maxAttempts: number;

  @ApiProperty({ example: '2024-12-07T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-12-07T10:40:00Z' })
  expiresAt: Date;

  @ApiProperty({ example: '2024-12-07T10:35:00Z', required: false })
  usedAt?: Date;

  @ApiProperty({ example: 300 })
  remainingSeconds: number;

  @ApiProperty({ example: true })
  isExpired: boolean;
}

export class OtpMonitoringFilterDto {
  @ApiProperty({ 
    enum: OtpRequestStatus, 
    required: false,
    description: 'Filter by OTP status'
  })
  @IsOptional()
  @IsEnum(OtpRequestStatus)
  status?: OtpRequestStatus;

  @ApiProperty({ 
    required: false,
    description: 'Filter by user ID'
  })
  @IsOptional()
  userId?: string;

  @ApiProperty({ 
    required: false,
    description: 'Start date for filtering (ISO 8601)'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ 
    required: false,
    description: 'End date for filtering (ISO 8601)'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class OtpStatsResponseDto {
  @ApiProperty({ example: 150 })
  totalRequests: number;

  @ApiProperty({ example: 45 })
  pendingRequests: number;

  @ApiProperty({ example: 80 })
  usedRequests: number;

  @ApiProperty({ example: 20 })
  expiredRequests: number;

  @ApiProperty({ example: 5 })
  failedAttemptsRequests: number;

  @ApiProperty({ example: 12 })
  activeRequests: number;

  @ApiProperty({ example: '2024-12-07T10:00:00Z' })
  lastRequestTime: Date;
}