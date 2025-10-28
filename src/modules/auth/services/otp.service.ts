import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@/database/redis.service';
import { v4 as uuidv4 } from 'uuid';

export interface OTPData {
  phoneNumber: string;
  otpCode: string;
  attempts: number;
  createdAt: Date;
  expiresAt: Date;
}

@Injectable()
export class OTPService {
  private readonly logger = new Logger(OTPService.name);
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 3;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async generateOTP(phoneNumber: string): Promise<{ otpId: string; otpCode: string }> {
    // Generate 6-digit OTP
    // const otpCode = process.env.NODE_ENV === 'production' 
    //   ? Math.floor(100000 + Math.random() * 900000).toString()
    //   : "123456";
    const otpCode = "123456"
    const otpId = uuidv4();
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    const otpData: OTPData = {
      phoneNumber,
      otpCode,
      attempts: 0,
      createdAt: now,
      expiresAt,
    };

    // Store OTP in Redis with expiration
    const key = `otp:${otpId}`;
    await this.redisService.setex(key, this.OTP_EXPIRY_MINUTES * 60, JSON.stringify(otpData));

    this.logger.log(`OTP generated for ${phoneNumber}: ${otpCode}`);

    return { otpId, otpCode };
  }

  async validateOTP(otpId: string, otpCode: string): Promise<{ 
    isValid: boolean; 
    phoneNumber?: string; 
    error?: string;
  }> {
    const key = `otp:${otpId}`;
    const otpDataString = await this.redisService.get(key);

    if (!otpDataString) {
      return { isValid: false, error: 'OTP expired or invalid' };
    }

    const otpData: OTPData = JSON.parse(otpDataString);

    // Check if OTP is expired
    if (new Date() > new Date(otpData.expiresAt)) {
      await this.redisService.del(key);
      return { isValid: false, error: 'OTP expired' };
    }

    // Check attempts limit
    if (otpData.attempts >= this.MAX_ATTEMPTS) {
      await this.redisService.del(key);
      return { isValid: false, error: 'Too many failed attempts' };
    }

    // Verify OTP code
    if (otpCode !== otpData.otpCode) {
      // Increment attempts
      otpData.attempts += 1;
      await this.redisService.setex(key, this.OTP_EXPIRY_MINUTES * 60, JSON.stringify(otpData));
      
      return { isValid: false, error: 'Invalid OTP code' };
    }

    // OTP is valid, clean up
    await this.redisService.del(key);
    
    return { isValid: true, phoneNumber: otpData.phoneNumber };
  }

  async resendOTP(otpId: string): Promise<{ otpCode: string, phoneNumber: string } | null> {
    const key = `otp:${otpId}`;
    const otpDataString = await this.redisService.get(key);

    if (!otpDataString) {
      return null;
    }

    const otpData: OTPData = JSON.parse(otpDataString);
    
    // Generate new OTP code
    const newOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Update OTP data
    otpData.otpCode = newOtpCode;
    otpData.attempts = 0;
    otpData.createdAt = new Date();
    otpData.expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store updated OTP
    await this.redisService.setex(key, this.OTP_EXPIRY_MINUTES * 60, JSON.stringify(otpData));

    this.logger.log(`OTP resent for ${otpData.phoneNumber}: ${newOtpCode}`);

    return { otpCode: newOtpCode, phoneNumber: otpData.phoneNumber };
  }

  async cleanupExpiredOTPs(): Promise<number> {
    // This would be called by a scheduled job
    // For now, Redis handles expiration automatically
    return 0;
  }
} 