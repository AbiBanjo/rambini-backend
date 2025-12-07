// src/modules/admin/services/otp-monitoring.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../entities';
import { RedisService } from '../../../database/redis.service';
import {
  OtpMonitoringResponseDto,
  OtpMonitoringFilterDto,
  OtpStatsResponseDto,
  OtpRequestStatus,
} from '../dto/otp-monitoring.dto';

interface OTPData {
  userId: string;
  otpCode: string;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
}

@Injectable()
export class OtpMonitoringService {
  private readonly logger = new Logger(OtpMonitoringService.name);
  private readonly OTP_KEY_PATTERN = 'withdrawal_otp:*';

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Get all OTP requests with optional filtering
   */
  async getAllOtpRequests(
    filters?: OtpMonitoringFilterDto,
  ): Promise<OtpMonitoringResponseDto[]> {
    this.logger.log('[ADMIN OTP] Fetching all OTP requests');

    // Get all OTP keys from Redis
    const keys = await this.redisService.keys(this.OTP_KEY_PATTERN);
    
    if (!keys || keys.length === 0) {
      this.logger.log('[ADMIN OTP] No OTP requests found');
      return [];
    }

    this.logger.log(`[ADMIN OTP] Found ${keys.length} OTP requests`);

    // Fetch all OTP data
    const otpPromises = keys.map(async (key) => {
      try {
        const otpDataString = await this.redisService.get(key);
        if (!otpDataString) return null;

        const otpData: OTPData = JSON.parse(otpDataString);
        const otpId = key.replace('withdrawal_otp:', '');

        // Get user details
        const user = await this.userRepository.findOne({
          where: { id: otpData.userId },
          relations: ['wallet'],
        });

        if (!user) {
          this.logger.warn(`[ADMIN OTP] User ${otpData.userId} not found for OTP ${otpId}`);
          return null;
        }

        return this.mapToMonitoringDto(otpId, otpData, user);
      } catch (error) {
        this.logger.error(`[ADMIN OTP] Error processing key ${key}: ${error.message}`);
        return null;
      }
    });

    let otpRequests = (await Promise.all(otpPromises)).filter((otp) => otp !== null);

    // Apply filters
    if (filters) {
      otpRequests = this.applyFilters(otpRequests, filters);
    }

    // Sort by creation date (newest first)
    otpRequests.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    this.logger.log(`[ADMIN OTP] Returning ${otpRequests.length} OTP requests after filtering`);
    return otpRequests;
  }

  /**
   * Get OTP request by ID
   */
  async getOtpRequestById(otpId: string): Promise<OtpMonitoringResponseDto> {
    this.logger.log(`[ADMIN OTP] Fetching OTP request: ${otpId}`);

    const key = `withdrawal_otp:${otpId}`;
    const otpDataString = await this.redisService.get(key);

    if (!otpDataString) {
      throw new NotFoundException('OTP request not found or expired');
    }

    const otpData: OTPData = JSON.parse(otpDataString);

    // Get user details
    const user = await this.userRepository.findOne({
      where: { id: otpData.userId },
      relations: ['wallet'],
    });

    if (!user) {
      throw new NotFoundException('User not found for this OTP request');
    }

    return this.mapToMonitoringDto(otpId, otpData, user);
  }

  /**
   * Get OTP statistics
   */
  async getOtpStats(): Promise<OtpStatsResponseDto> {
    this.logger.log('[ADMIN OTP] Calculating OTP statistics');

    const allRequests = await this.getAllOtpRequests();

    const stats: OtpStatsResponseDto = {
      totalRequests: allRequests.length,
      pendingRequests: allRequests.filter(r => r.status === OtpRequestStatus.PENDING).length,
      usedRequests: allRequests.filter(r => r.status === OtpRequestStatus.USED).length,
      expiredRequests: allRequests.filter(r => r.status === OtpRequestStatus.EXPIRED).length,
      failedAttemptsRequests: allRequests.filter(r => r.status === OtpRequestStatus.FAILED_ATTEMPTS).length,
      activeRequests: allRequests.filter(r => !r.isExpired && r.status === OtpRequestStatus.PENDING).length,
      lastRequestTime: allRequests.length > 0 ? allRequests[0].createdAt : null,
    };

    this.logger.log(`[ADMIN OTP] Stats: ${JSON.stringify(stats)}`);
    return stats;
  }

  /**
   * Get active (non-expired) OTP requests
   */
  async getActiveOtpRequests(): Promise<OtpMonitoringResponseDto[]> {
    const allRequests = await this.getAllOtpRequests();
    return allRequests.filter(r => !r.isExpired && r.status === OtpRequestStatus.PENDING);
  }

  /**
   * Get OTP requests by user ID
   */
  async getOtpRequestsByUser(userId: string): Promise<OtpMonitoringResponseDto[]> {
    return await this.getAllOtpRequests({ userId });
  }

  /**
   * Helper: Map OTP data to monitoring DTO
   */
  private mapToMonitoringDto(
    otpId: string,
    otpData: OTPData,
    user: User,
  ): OtpMonitoringResponseDto {
    const now = new Date();
    const expiresAt = new Date(otpData.expiresAt);
    const createdAt = new Date(otpData.createdAt);
    const isExpired = now > expiresAt;
    const remainingSeconds = isExpired ? 0 : Math.floor((expiresAt.getTime() - now.getTime()) / 1000);

    // Determine status
    let status = OtpRequestStatus.PENDING;
    if (isExpired) {
      status = OtpRequestStatus.EXPIRED;
    } else if (otpData.attempts >= 3) {
      status = OtpRequestStatus.FAILED_ATTEMPTS;
    }

    return {
      otpId,
      otpCode: otpData.otpCode,
      userId: otpData.userId,
      userEmail: user.email,
      userName: user.first_name || user.full_name || user.email,
      requestedAmount: user.wallet?.vendor_balance || 0,
      currency: user.wallet?.currency || 'NGN',
      status,
      attempts: otpData.attempts,
      maxAttempts: 3,
      createdAt,
      expiresAt,
      remainingSeconds,
      isExpired,
    };
  }

  /**
   * Helper: Apply filters to OTP requests
   */
  private applyFilters(
    requests: OtpMonitoringResponseDto[],
    filters: OtpMonitoringFilterDto,
  ): OtpMonitoringResponseDto[] {
    let filtered = [...requests];

    if (filters.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    if (filters.userId) {
      filtered = filtered.filter(r => r.userId === filters.userId);
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(r => new Date(r.createdAt) >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      filtered = filtered.filter(r => new Date(r.createdAt) <= endDate);
    }

    return filtered;
  }
}