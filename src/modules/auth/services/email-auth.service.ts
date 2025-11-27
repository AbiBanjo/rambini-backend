import { Injectable, Logger, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserType, UserStatus } from '../../../entities';
import { OTPService } from './otp.service';
import { JWTService, TokenPair } from './jwt.service';
import { UserService } from '../../user/services/user.service';
import { EmailNotificationService } from '../../notification/services/email-notification.service';
import { RegisterDto, VerifyEmailDto, ResendVerificationEmailDto } from '../dto';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@/database/redis.service';
import { AuthResponseBuilder } from '../helpers/auth-response.builder';
import { EmailValidator } from '../helpers/validators';
import { EmailTemplates } from '../helpers/email-templates';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class EmailAuthService {
  private readonly logger = new Logger(EmailAuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userService: UserService,
    private readonly otpService: OTPService,
    private readonly jwtService: JWTService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly authResponseBuilder: AuthResponseBuilder,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ otpId: string; message: string }> {
    const { email, password } = registerDto;

    // Validate email format
    if (!EmailValidator.isValid(email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Check if user already exists
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const saltRounds = this.configService.get<number>('security.bcryptRounds') || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Cache registration data
    const cacheKey = `registration:pending:${email}`;
    const registrationData = {
      email,
      password: hashedPassword,
      user_type: UserType.CUSTOMER,
      status: UserStatus.PENDING_VERIFICATION,
      profile_completed: false,
      createdAt: new Date().toISOString(),
    };

    await this.redisService.setex(
      cacheKey,
      10 * 60, // 10 minutes
      JSON.stringify(registrationData),
    );

    // Generate email verification OTP
    const { otpId, otpCode } = await this.otpService.generateEmailOTP(email, 'email_verification');

    // Send verification email with OTP
    await this.sendVerificationEmail(email, otpCode);

    this.logger.log(`Pending registration cached for ${email}`);

    return {
      otpId,
      message: 'Registration successful. Please check your email for the verification OTP.',
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<any> {
    const { email, otpId, otpCode } = verifyEmailDto;

    // Validate OTP
    const validation = await this.otpService.validateEmailOTP(
      otpId,
      otpCode,
      'email_verification',
    );

    if (!validation.isValid) {
      throw new BadRequestException(validation.error || 'Invalid OTP');
    }

    if (validation.email !== email) {
      throw new BadRequestException('OTP email mismatch');
    }

    // Fetch pending registration from Redis
    const cacheKey = `registration:pending:${email}`;
    const cachedDataRaw = await this.redisService.get(cacheKey);

    if (!cachedDataRaw) {
      throw new BadRequestException(
        'Registration has expired or was not initiated. Please register again.'
      );
    }

    const cachedData = JSON.parse(cachedDataRaw);

    // Prevent duplicate registration
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Create user in DB
    const user = await this.userService.createUser({
      ...cachedData,
      email_verified_at: new Date(),
      status: UserStatus.ACTIVE,
    });

    // Remove cache
    await this.redisService.del(cacheKey);

    // Generate tokens
    const tokens = this.jwtService.generateTokenPair(user);

    this.logger.log(`Email verified & user created: ${user.id}`);

    return this.authResponseBuilder.build(user, tokens);
  }

  async resendVerificationEmail(
    resendDto: ResendVerificationEmailDto
  ): Promise<{ otpId: string; message: string }> {
    const { email, otpId } = resendDto;

    const cacheKey = `registration:pending:${email}`;
    const cachedDataRaw = await this.redisService.get(cacheKey);

    // Security: Don't reveal if email exists
    if (!cachedDataRaw) {
      return {
        otpId: '',
        message: 'If the email exists, a verification OTP has been sent'
      };
    }

    let otpCode: string;
    let finalOtpId: string;

    if (otpId) {
      const resendResult = await this.otpService.resendEmailOTP(otpId, 'email_verification');

      if (resendResult) {
        otpCode = resendResult.otpCode;
        finalOtpId = otpId;
      } else {
        const newOtp = await this.otpService.generateEmailOTP(email, 'email_verification');
        otpCode = newOtp.otpCode;
        finalOtpId = newOtp.otpId;
      }
    } else {
      const newOtp = await this.otpService.generateEmailOTP(email, 'email_verification');
      otpCode = newOtp.otpCode;
      finalOtpId = newOtp.otpId;
    }

    await this.sendVerificationEmail(email, otpCode);

    return {
      otpId: finalOtpId,
      message: 'Verification email sent successfully'
    };
  }

  private async sendVerificationEmail(email: string, otpCode: string): Promise<void> {
    const emailData = {
      to: email,
      subject: 'Verify Your Email - Rambini',
      html: EmailTemplates.verification(otpCode),
      text: `Verify Your Email\n\nThank you for registering with Rambini!\n\nYour email verification code is: ${otpCode}\n\nEnter this code in the app to verify your email address.\n\nThis code will expire in 10 minutes. If you didn't create an account, please ignore this email.`,
    };

    try {
      await this.emailNotificationService.sendEmail(emailData);
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}:`, error.message);
      throw new BadRequestException('Failed to send verification email');
    }
  }
}