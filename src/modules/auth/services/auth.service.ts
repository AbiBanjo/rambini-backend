import { Injectable, Logger, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus, UserType } from '../../../entities';
import { JWTService } from './jwt.service';
import { UserService } from '../../user/services/user.service';
import { EmailAuthService } from './email-auth.service';
import { PasswordService } from './password.service';
import { SocialAuthService } from './social-auth.service';
import { ProfileService } from './profile.service';
import { OTPService } from './otp.service';
import { SMSService } from './sms.service';
import { LoginDto, VerifyOtpDto, CompleteProfileDto } from '../dto';
import { AuthResponseBuilder } from '../helpers/auth-response.builder';
import { EmailValidator } from '../helpers/validators';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userService: UserService,
    private readonly jwtService: JWTService,
    private readonly emailAuthService: EmailAuthService,
    private readonly passwordService: PasswordService,
    private readonly socialAuthService: SocialAuthService,
    private readonly profileService: ProfileService,
    private readonly otpService: OTPService,
    private readonly smsService: SMSService,
    private readonly authResponseBuilder: AuthResponseBuilder,
  ) {}

  // ==================== Email/Password Registration ====================
  async register(registerDto: any) {
    return this.emailAuthService.register(registerDto);
  }

  async verifyEmail(verifyEmailDto: any) {
    return this.emailAuthService.verifyEmail(verifyEmailDto);
  }

  async resendVerificationEmail(email: string, otpId?: string) {
    return this.emailAuthService.resendVerificationEmail({ email, otpId });
  }

  // ==================== Login ====================
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Validate email format
    if (!EmailValidator.isValid(email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Find user by email
    let user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user has a password set
    if (!user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Handle deleted account reactivation
    if (user.status === UserStatus.DELETED) {
      user = await this.handleDeletedAccount(user);
    }

    // Validate user status
    this.validateUserStatus(user);

    // Update last active timestamp
    user.updateLastActive();
    await this.userRepository.save(user);

    // Generate JWT tokens
    const tokens = this.jwtService.generateTokenPair(user);

    this.logger.log(`User logged in: ${email}`);

    return this.authResponseBuilder.build(user, tokens);
  }

  // ==================== Phone OTP Flow (Legacy) ====================
  async verifyOTP(verifyRequest: VerifyOtpDto) {
    const { otpId, otpCode } = verifyRequest;

    // Validate OTP
    const validation = await this.otpService.validateOTP(otpId, otpCode);

    if (!validation.isValid) {
      throw new UnauthorizedException(validation.error || 'Invalid OTP');
    }

    const { phoneNumber } = validation;

    // Check if user exists
    let user = await this.userService.findByPhoneNumber(phoneNumber);

    if (!user) {
      // Create new user
      user = await this.userService.createUser({
        phone_number: phoneNumber,
        user_type: UserType.CUSTOMER,
        status: UserStatus.ACTIVE,
        is_phone_verified: true,
        profile_completed: false,
      });

      this.logger.log(`Created new user ${user.id}`);
    } else {
      // Update existing user verification status
      user = await this.userService.markPhoneVerified(user.id);
    }

    // Generate JWT tokens
    const tokens = this.jwtService.generateTokenPair(user);

    return this.authResponseBuilder.build(user, tokens);
  }

  async resendOTP(otpId: string): Promise<{ message: string }> {
    const result = await this.otpService.resendOTP(otpId);

    if (!result) {
      throw new BadRequestException('OTP expired or invalid');
    }

    const { phoneNumber, otpCode } = result;

    // Send OTP via SMS (only if using old OTP service, Twilio Verify handles this automatically)
    if (otpCode) {
      const smsSent = await this.smsService.sendOTP(phoneNumber, otpCode);

      if (!smsSent) {
        this.logger.warn(`Failed to send SMS to ${phoneNumber}, but OTP was generated`);
        throw new BadRequestException('Failed to send SMS');
      }
    }

    this.logger.log(`OTP resent for OTP ID: ${otpId}`);

    return { message: 'OTP resent successfully' };
  }

  // ==================== Send OTP for Profile Completion ====================
  async sendProfileOTP(phoneNumber: string): Promise<{ otpId: string; message: string }> {
    // Validate phone number format
    if (!phoneNumber.startsWith('+')) {
      throw new BadRequestException('Phone number must be in E.164 format (e.g., +2348012345678)');
    }

    // Generate and send OTP using Twilio Verify
    const result = await this.otpService.generateOTP(phoneNumber);

    this.logger.log(`Profile OTP sent to ${phoneNumber}`);

    return {
      otpId: result.otpId,
      message: 'OTP sent successfully to your phone number',
    };
  }

  // ✅ NEW: Verify Profile OTP immediately (before profile completion)
  async verifyProfileOTP(
    phoneNumber: string,
    otpCode: string
  ): Promise<{ isValid: boolean; error?: string }> {
    // Validate phone number format
    if (!phoneNumber.startsWith('+')) {
      return {
        isValid: false,
        error: 'Phone number must be in E.164 format (e.g., +2348012345678)'
      };
    }

    // Delegate to OTPService which handles Twilio verification and Redis caching
    const validation = await this.otpService.validateOTPByPhone(phoneNumber, otpCode);

    if (validation.isValid) {
      this.logger.log(`Profile OTP verified for ${phoneNumber}`);
    } else {
      this.logger.warn(`Profile OTP verification failed for ${phoneNumber}`);
    }

    return validation;
  }

  // ==================== Profile Completion ====================
  async completeProfile(userId: string, profileDto: CompleteProfileDto) {
    return this.profileService.completeProfile(userId, profileDto);
  }

  // ==================== Password Management ====================
  async forgotPassword(forgotPasswordDto: any) {
    return this.passwordService.forgotPassword(forgotPasswordDto);
  }

  async resendForgotPasswordOTP(resendDto: any) {
    return this.passwordService.resendForgotPasswordOTP(resendDto);
  }

  async resetPassword(resetPasswordDto: any) {
    return this.passwordService.resetPassword(resetPasswordDto);
  }

  async changePassword(userId: string, changePasswordDto: any) {
    return this.passwordService.changePassword(userId, changePasswordDto);
  }

  // ==================== Social Authentication ====================
  async googleSignIn(googleAuthDto: any) {
    return this.socialAuthService.googleSignIn(googleAuthDto);
  }

  async appleSignIn(appleAuthDto: any) {
    return this.socialAuthService.appleSignIn(appleAuthDto);
  }

  // ==================== Token Management ====================
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const newAccessToken = this.jwtService.refreshAccessToken(refreshToken);

    if (!newAccessToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return { accessToken: newAccessToken };
  }

  async validateUser(userId: string): Promise<User | null> {
    try {
      return await this.userService.findById(userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  // ==================== Private Helper Methods ====================
  private async handleDeletedAccount(user: User): Promise<User> {
    if (user.canBeReactivated()) {
      user.reactivate();
      await this.userRepository.save(user);
      const reactivatedUser = await this.userService.findByEmail(user.email);
      this.logger.log(`Reactivated deleted account for user: ${reactivatedUser.id}`);
      return reactivatedUser;
    } else {
      throw new BadRequestException('This account was permanently deleted and cannot be restored. Please contact support to create a new account.');
    }
  }

  private validateUserStatus(user: User): void {
    if (user.status !== UserStatus.ACTIVE && user.status !== UserStatus.PENDING_VERIFICATION) {
      throw new UnauthorizedException('Account is not active. Please contact support.');
    }
  }
}