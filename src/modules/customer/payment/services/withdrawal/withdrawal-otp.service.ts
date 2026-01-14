import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../../entities';
import { WithdrawalRepository } from '../../repositories/withdrawal.repository';
import { RedisService } from '../../../../database/redis.service';
import { WithdrawalEmailNotificationService } from '../../../notification/services/withdrawal-email-notification.service';

export interface OTPData {
  userId: string;
  otpCode: string;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
}

@Injectable()
export class WithdrawalOtpService {
  private readonly logger = new Logger(WithdrawalOtpService.name);
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 3;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly withdrawalRepo: WithdrawalRepository,
    private readonly redisService: RedisService,
    private readonly withdrawalEmailService: WithdrawalEmailNotificationService,
  ) {}

  /**
   * Generate OTP for withdrawal request
   */
  async generateWithdrawalOTP(
    userId: string,
    amount: number,
  ): Promise<{ otpId: string; message: string }> {
    this.logger.log(`[OTP START] ========================================`);
    this.logger.log(
      `[OTP START] Generating withdrawal OTP for user ${userId} with amount ${amount}`,
    );

    // Check if user has any active withdrawal request
    const activeWithdrawal = await this.withdrawalRepo.findActiveByUserId(
      userId,
    );
    if (activeWithdrawal) {
      throw new BadRequestException(
        'You have a pending or processing withdrawal request. Please wait for it to be completed.',
      );
    }

    this.logger.log(
      `[OTP CHECK] User ${userId} has no active withdrawal request`,
    );

    // Get user details
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['wallet'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.email) {
      throw new BadRequestException(
        'User email is required for withdrawal OTP',
      );
    }

    this.logger.log(`[OTP USER] User email: ${user.email}`);
    this.logger.log(
      `[OTP USER] User name: ${user.first_name || user.full_name || 'User'}`,
    );

    // Check if user has sufficient balance
    if (!user.wallet || user.wallet.vendor_balance < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    this.logger.log(
      `[OTP BALANCE] User ${userId} has sufficient balance: ${user.wallet.vendor_balance}`,
    );
    this.logger.log(`[OTP GENERATE] Starting OTP generation...`);

    // Generate random 6-digit OTP with verification
    const randomValue = Math.random();
    const calculatedNumber = Math.floor(100000 + randomValue * 900000);
    const otpCode = calculatedNumber.toString();

    // CRITICAL: Verify OTP generation
    this.logger.log(`[OTP GENERATE] Random value: ${randomValue}`);
    this.logger.log(`[OTP GENERATE] Calculated number: ${calculatedNumber}`);
    this.logger.log(`[OTP GENERATE] Final OTP code: "${otpCode}"`);
    this.logger.log(`[OTP GENERATE] OTP length: ${otpCode.length}`);
    this.logger.log(`[OTP GENERATE] OTP type: ${typeof otpCode}`);

    // Verify it's actually a 6-digit number
    if (otpCode.length !== 6) {
      this.logger.error(
        `[OTP ERROR] Generated OTP is not 6 digits! Length: ${otpCode.length}`,
      );
      throw new Error('Failed to generate valid 6-digit OTP');
    }

    if (!/^\d{6}$/.test(otpCode)) {
      this.logger.error(
        `[OTP ERROR] Generated OTP is not all digits! Value: "${otpCode}"`,
      );
      throw new Error('Failed to generate valid numeric OTP');
    }

    this.logger.log(`[OTP VERIFY] ✓ OTP is valid 6-digit number: "${otpCode}"`);

    const otpId = `withdrawal_otp_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    this.logger.log(`[OTP ID] Generated OTP ID: ${otpId}`);

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.OTP_EXPIRY_MINUTES * 60 * 1000,
    );

    const otpData: OTPData = {
      userId,
      otpCode,
      createdAt: now,
      expiresAt,
      attempts: 0,
    };

    this.logger.log(`[OTP DATA] Created OTP data object:`, {
      userId: otpData.userId,
      otpCode: otpData.otpCode,
      expiresAt: otpData.expiresAt.toISOString(),
      attempts: otpData.attempts,
    });

    // Store OTP in Redis with expiration
    const key = `withdrawal_otp:${otpId}`;
    this.logger.log(`[REDIS STORE] Storing OTP in Redis with key: ${key}`);
    this.logger.log(
      `[REDIS STORE] TTL: ${this.OTP_EXPIRY_MINUTES * 60} seconds`,
    );

    await this.redisService.setex(
      key,
      this.OTP_EXPIRY_MINUTES * 60,
      JSON.stringify(otpData),
    );

    // VERIFY what was actually stored in Redis
    this.logger.log(`[REDIS VERIFY] Reading back from Redis to verify...`);
    const storedValue = await this.redisService.get(key);

    if (!storedValue) {
      this.logger.error(
        `[REDIS ERROR] Failed to retrieve OTP from Redis immediately after storing!`,
      );
      throw new Error('Redis storage verification failed');
    }

    const storedData = JSON.parse(storedValue);
    this.logger.log(`[REDIS VERIFY] Stored OTP code: "${storedData.otpCode}"`);
    this.logger.log(`[REDIS VERIFY] Stored user ID: ${storedData.userId}`);

    if (storedData.otpCode !== otpCode) {
      this.logger.error(
        `[REDIS ERROR] OTP MISMATCH IN REDIS! Generated: "${otpCode}", Stored: "${storedData.otpCode}"`,
      );
      throw new Error('Redis OTP mismatch - data corruption detected');
    }

    this.logger.log(`[REDIS VERIFY] ✓ Redis storage verified successfully`);

    // Send OTP via email with retry logic
    this.logger.log(
      `[EMAIL START] Starting email delivery (max 3 attempts)...`,
    );
    let emailSent = false;
    let emailError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        this.logger.log(
          `[EMAIL ATTEMPT ${attempt}] Sending OTP "${otpCode}" to ${user.email}`,
        );
        this.logger.log(
          `[EMAIL ATTEMPT ${attempt}] Calling withdrawalEmailService.sendWithdrawalOTPEmail()`,
        );

        await this.withdrawalEmailService.sendWithdrawalOTPEmail(
          user,
          otpCode,
          this.OTP_EXPIRY_MINUTES,
        );

        emailSent = true;
        this.logger.log(
          `[EMAIL SUCCESS] ✓ Withdrawal OTP email sent successfully on attempt ${attempt}`,
        );
        this.logger.log(
          `[EMAIL SUCCESS] OTP sent: "${otpCode}" to ${user.email}`,
        );
        break;
      } catch (error) {
        emailError = error;
        this.logger.warn(
          `[EMAIL FAILED] Failed to send OTP email (attempt ${attempt}/3): ${error.message}`,
        );

        if (error.stack) {
          this.logger.debug(`[EMAIL ERROR STACK] ${error.stack}`);
        }

        // Wait before retrying (exponential backoff: 1s, 2s, 4s)
        if (attempt < 3) {
          const waitTime = 1000 * Math.pow(2, attempt - 1);
          this.logger.log(
            `[EMAIL RETRY] Waiting ${waitTime}ms before retry...`,
          );
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // Log final result but don't fail the entire operation
    if (!emailSent) {
      this.logger.error(
        `[EMAIL FINAL] ❌ Failed to send withdrawal OTP email after 3 attempts`,
      );
      this.logger.error(`[EMAIL FINAL] Last error: ${emailError?.message}`);
      if (emailError?.stack) {
        this.logger.error(`[EMAIL FINAL] Error stack: ${emailError.stack}`);
      }
    } else {
      this.logger.log(`[EMAIL FINAL] ✓ Email delivered successfully`);
    }

    this.logger.log(`[OTP SUMMARY] ========================================`);
    this.logger.log(`[OTP SUMMARY] OTP Generation Complete`);
    this.logger.log(`[OTP SUMMARY] User ID: ${userId}`);
    this.logger.log(`[OTP SUMMARY] User Email: ${user.email}`);
    this.logger.log(`[OTP SUMMARY] Generated OTP: "${otpCode}"`);
    this.logger.log(`[OTP SUMMARY] OTP ID: ${otpId}`);
    this.logger.log(`[OTP SUMMARY] Stored in Redis: YES`);
    this.logger.log(`[OTP SUMMARY] Email Sent: ${emailSent ? 'YES' : 'NO'}`);
    this.logger.log(`[OTP SUMMARY] Expires: ${expiresAt.toISOString()}`);
    this.logger.log(`[OTP SUMMARY] ========================================`);

    return {
      otpId,
      message: emailSent
        ? 'Withdrawal OTP sent to your email successfully'
        : 'Withdrawal OTP generated. Please check your email or contact support if you did not receive it.',
    };
  }

  /**
   * Validate withdrawal OTP
   */
  async validateWithdrawalOTP(
    otpId: string,
    otpCode: string,
  ): Promise<{ isValid: boolean; error?: string }> {
    const key = `withdrawal_otp:${otpId}`;
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

    // Check attempts
    if (otpData.attempts >= this.MAX_ATTEMPTS) {
      await this.redisService.del(key);
      return { isValid: false, error: 'Maximum OTP attempts exceeded' };
    }

    // Verify OTP code
    if (otpCode !== otpData.otpCode) {
      otpData.attempts += 1;
      await this.redisService.setex(
        key,
        this.OTP_EXPIRY_MINUTES * 60,
        JSON.stringify(otpData),
      );
      return { isValid: false, error: 'Invalid OTP code' };
    }

    // OTP is valid, clean up
    await this.redisService.del(key);
    return { isValid: true };
  }
}