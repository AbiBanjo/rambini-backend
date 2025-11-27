// src/modules/user/services/profile/user-profile-phone.service.ts
import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities';
import { UserProfileBaseService } from './user-profile-base.service';
import { OTPService } from '@/modules/auth/services/otp.service';

export interface ChangePhoneRequest {
  newPhoneNumber: string;
  otpId: string;
  otpCode: string;
}

export interface SendPhoneOTPRequest {
  phoneNumber: string;
}

@Injectable()
export class UserProfilePhoneService {
  private readonly logger = new Logger(UserProfilePhoneService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly profileBaseService: UserProfileBaseService,
    private readonly otpService: OTPService,
  ) {}

  /**
   * Send OTP to new phone number for verification
   */
  async sendPhoneChangeOTP(
    userId: string,
    phoneNumber: string,
  ): Promise<{ otpId: string; message: string }> {
    // Validate phone number format
    if (!this.profileBaseService['isValidPhoneNumber'](phoneNumber)) {
      throw new BadRequestException(
        'Invalid phone number format. Use E.164 format (e.g., +1234567890)',
      );
    }

    // Check if phone number is already in use
    const existingUser = await this.userRepository.findOne({
      where: { phone_number: phoneNumber },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Phone number already in use');
    }

    // Generate and send OTP using Twilio Verify
    const result = await this.otpService.generateOTP(phoneNumber);

    this.logger.log(
      `Phone change OTP sent to ${phoneNumber} for user ${userId}`,
    );

    return {
      otpId: result.otpId,
      message: 'OTP sent successfully to your new phone number',
    };
  }

  /**
   * Change phone number after OTP verification
   */
  async changePhoneNumber(
    userId: string,
    changeRequest: ChangePhoneRequest,
  ): Promise<User> {
    const { newPhoneNumber, otpId, otpCode } = changeRequest;

    // Validate phone number format
    if (!this.profileBaseService['isValidPhoneNumber'](newPhoneNumber)) {
      throw new BadRequestException(
        'Invalid phone number format. Use E.164 format (e.g., +1234567890)',
      );
    }

    // Check if new phone number is already in use
    const existingUser = await this.userRepository.findOne({
      where: { phone_number: newPhoneNumber },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Phone number already in use');
    }

    // Validate OTP using Twilio Verify
    const otpValidation = await this.otpService.validateOTP(otpId, otpCode);

    if (!otpValidation.isValid) {
      throw new BadRequestException(
        otpValidation.error || 'Invalid or expired OTP code',
      );
    }

    // Verify that the OTP phone number matches the new phone number
    if (otpValidation.phoneNumber !== newPhoneNumber) {
      throw new BadRequestException(
        'Phone number does not match the verified phone number',
      );
    }

    // Update phone number
    const user = await this.profileBaseService.getUserProfile(userId);
    user.phone_number = newPhoneNumber;
    user.is_phone_verified = true;

    const updatedUser = await this.userRepository.save(user);

    this.logger.log(
      `Phone number changed for user ${userId} to ${newPhoneNumber}`,
    );

    return updatedUser;
  }

  /**
   * Resend OTP for phone change
   */
  async resendPhoneChangeOTP(otpId: string): Promise<{ message: string }> {
    const result = await this.otpService.resendOTP(otpId);

    if (!result) {
      throw new BadRequestException('OTP expired or invalid');
    }

    this.logger.log(`Phone change OTP resent for OTP ID: ${otpId}`);

    return {
      message: 'OTP resent successfully to your phone number',
    };
  }
}