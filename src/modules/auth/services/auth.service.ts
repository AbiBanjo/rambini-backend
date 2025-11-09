import { Injectable, Logger, ConflictException, UnauthorizedException, BadRequestException, NotFoundException, Inject, forwardRef, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserType, UserStatus, Wallet, Currency, AuthProvider } from '../../../entities';
import { OTPService } from './otp.service';
import { SMSService } from './sms.service';
import { JWTService, TokenPair } from './jwt.service';
import { GoogleAuthService } from './google-auth.service';
import { AppleAuthService } from './apple-auth.service';
import { UserService } from '../../user/services/user.service';
import { AddressService } from '../../user/services/address.service';
import { EmailNotificationService } from '../../notification/services/email-notification.service';
import { RegisterDto, VerifyOtpDto, CompleteProfileDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto, VerifyEmailDto, LoginDto, GoogleAuthDto, AppleAuthDto } from '../dto';
import { getCurrencyForCountry } from '../../../utils/currency-mapper';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';

export interface AuthResponse {
  user: {
    id: string;
    phoneNumber?: string;
    userType: UserType;
    profileCompleted: boolean;
    firstName?: string;
    lastName?: string;
    email: string;
    country?: string;
    emailVerified: boolean;
  };
  tokens: TokenPair;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userService: UserService,
    @Inject(forwardRef(() => AddressService))
    private readonly addressService: AddressService,
    private readonly otpService: OTPService,
    private readonly smsService: SMSService,
    private readonly jwtService: JWTService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly configService: ConfigService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly appleAuthService: AppleAuthService,
  ) {}

  async register(registerRequest: RegisterDto): Promise<{ otpId: string; message: string }> {
    const { email, password } = registerRequest;

    // Validate email format
    if (!this.isValidEmail(email)) {
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

    // Create user with unverified email
    const user = await this.userService.createUser({
      email,
      password: hashedPassword,
      user_type: UserType.CUSTOMER,
      status: UserStatus.PENDING_VERIFICATION,
      profile_completed: false,
    });

    // Generate email verification OTP
    const { otpId, otpCode } = await this.otpService.generateEmailOTP(email, 'email_verification');

    // Send verification email with OTP
    await this.sendVerificationEmail(user.email, otpCode);

    this.logger.log(`User registered with email: ${email}, ID: ${user.id}`);

    return {
      otpId,
      message: 'Registration successful. Please check your email for the verification OTP.',
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Validate email format
    if (!this.isValidEmail(email)) {
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

    // Check if user account was deleted and can be reactivated
    if (user.status === UserStatus.DELETED) {
      if (user.canBeReactivated()) {
        user.reactivate();
        await this.userRepository.save(user);
        user = await this.userService.findByEmail(email);
        this.logger.log(`Reactivated deleted account for user: ${user.id}`);
      } else {
        throw new BadRequestException('This account was permanently deleted and cannot be restored. Please contact support to create a new account.');
      }
    }

    // Check if user is active (after potential reactivation)
    if (user.status !== UserStatus.ACTIVE && user.status !== UserStatus.PENDING_VERIFICATION) {
      throw new UnauthorizedException('Account is not active. Please contact support.');
    }

    // Update last active timestamp
    user.updateLastActive();
    await this.userRepository.save(user);

    // Generate JWT tokens
    const tokens = this.jwtService.generateTokenPair(user);

    this.logger.log(`User logged in: ${email}`);

    return {
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        userType: user.user_type,
        profileCompleted: user.profile_completed,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        country: user.country,
        emailVerified: !!user.email_verified_at,
      },
      tokens,
    };
  }

  async verifyOTP(verifyRequest: VerifyOtpDto): Promise<AuthResponse> {
    const { otpId, otpCode } = verifyRequest;

    // Validate OTP
    const validation = await this.otpService.validateOTP(otpId, otpCode);
    
    if (!validation.isValid) {
      throw new UnauthorizedException(validation.error || 'Invalid OTP');
    }

    const { phoneNumber } = validation;

    // Check if user was created during registration
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

    return {
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        userType: user.user_type,
        profileCompleted: user.profile_completed,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        country: user.country,
        emailVerified: !!user.email_verified_at,
      },
      tokens,
    };
  }

  async completeProfile(userId: string, profileRequest: CompleteProfileDto): Promise<AuthResponse> {
    // Validate input data
    if (!profileRequest.firstName?.trim() || !profileRequest.lastName?.trim()) {
      throw new BadRequestException('First name and last name are required');
    }

    // Validate phone number format
    if (!this.isValidPhoneNumber(profileRequest.phoneNumber)) {
      throw new BadRequestException('Invalid phone number format. Use E.164 format (e.g., +1234567890)');
    }

    // Check if phone number is already taken
    const existingUserWithPhone = await this.userService.findByPhoneNumber(profileRequest.phoneNumber);
    if (existingUserWithPhone && existingUserWithPhone.id !== userId) {
      throw new ConflictException('Phone number is already taken by another user');
    }

    // Update user profile and mark as completed in a single operation
    const updatedUser = await this.userService.updateUser(userId, {
      first_name: profileRequest.firstName,
      last_name: profileRequest.lastName,
      phone_number: profileRequest.phoneNumber,
      country: profileRequest.country,
      profile_completed: true,
    });

    // Mark phone as verified if phone number was added
    if (profileRequest.phoneNumber) {
      await this.userService.markPhoneVerified(userId);
    }

    // Create or update wallet with country-based currency
    const currency = getCurrencyForCountry(profileRequest.country);
    let wallet = await this.walletRepository.findOne({
      where: { user_id: userId }
    });
    
    if (!wallet) {
      // Create new wallet for user
      wallet = this.walletRepository.create({
        user_id: userId,
        balance: 0,
        currency: currency,
      });
      await this.walletRepository.save(wallet);
      this.logger.log(`Created wallet with currency ${currency} for user ${userId}`);
    } else if (wallet.currency !== currency) {
      // Update existing wallet currency
      wallet.currency = currency;
      await this.walletRepository.save(wallet);
      this.logger.log(`Updated wallet currency to ${currency} for user ${userId}`);
    }

    // Create default address if provided
    if (profileRequest.address) {
      try {
        // Validate address data
        const addressValidation = await this.addressService.validateAddress(profileRequest.address);
        
        if (!addressValidation.isValid) {
          this.logger.warn(`Invalid address data for user ${userId}:`, addressValidation.errors);
          throw new BadRequestException(`Invalid address data: ${addressValidation.errors.join(', ')}`);
        }

        // Create address using AddressService
        const createdAddress = await this.addressService.createAddress(userId, {
          address_line_1: profileRequest.address.address_line_1,
          address_line_2: profileRequest.address.address_line_2,
          city: profileRequest.address.city,
          state: profileRequest.address.state,
          postal_code: profileRequest.address.postal_code,
          latitude: profileRequest.address.latitude,
          longitude: profileRequest.address.longitude,
          is_default: profileRequest.address.is_default || true, // Set as default if it's the first address
          country: profileRequest.country || 'NG',
        });

        this.logger.log(`Address created for user ${userId}: ${createdAddress.id}`);
      } catch (error) {
        this.logger.error(`Failed to create address for user ${userId}:`, error.message);
        // Don't fail the entire profile completion if address creation fails
        // Just log the error and continue
      }
    }

    // Generate new tokens
    const tokens = this.jwtService.generateTokenPair(updatedUser);

    return {
      user: {
        id: updatedUser.id,
        phoneNumber: updatedUser.phone_number,
        userType: updatedUser.user_type,
        profileCompleted: updatedUser.profile_completed,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        email: updatedUser.email,
        country: updatedUser.country,
        emailVerified: !!updatedUser.email_verified_at,
      },
      tokens,
    };
  }

  async resendOTP(otpId: string): Promise<{ message: string }> {
    const result = await this.otpService.resendOTP(otpId);
    
    if (!result) {
      throw new BadRequestException('OTP expired or invalid');
    }

    const { phoneNumber, otpCode } = result;

    // Get phone number from OTP data to send SMS
    // This would require a method to get OTP data without validation
      // Send OTP via SMS
    const smsSent = await this.smsService.sendOTP(phoneNumber, otpCode);
    
      if (!smsSent) {
        this.logger.warn(`Failed to send SMS to ${phoneNumber}, but OTP was generated`);
        throw new BadRequestException('Failed to send SMS');
      }
  

    this.logger.log(`OTP resent for OTP ID: ${otpId}`);

    return { message: 'OTP resent successfully' };
  }

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

  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic E.164 format validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<AuthResponse> {
    const { email, otpId, otpCode } = verifyEmailDto;

    // Validate OTP
    const validation = await this.otpService.validateEmailOTP(otpId, otpCode, 'email_verification');
    
    if (!validation.isValid) {
      throw new BadRequestException(validation.error || 'Invalid OTP');
    }

    // Verify that the email matches
    if (validation.email !== email) {
      throw new BadRequestException('Email does not match the OTP');
    }

    // Find user by email
    let user = await this.userService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already verified
    if (user.email_verified_at) {
      throw new BadRequestException('Email is already verified');
    }

    // Mark email as verified and update status
    user.markEmailVerified();
    if (user.status === UserStatus.PENDING_VERIFICATION) {
      user.status = UserStatus.ACTIVE;
    }
    await this.userRepository.save(user);

    // Reload user to get updated state
    user = await this.userService.findById(user.id);

    // Generate JWT tokens
    const tokens = this.jwtService.generateTokenPair(user);

    this.logger.log(`Email verified for user: ${user.id}`);

    return {
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        userType: user.user_type,
        profileCompleted: user.profile_completed,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        country: user.country,
        emailVerified: !!user.email_verified_at,
      },
      tokens,
    };
  }

  async resendVerificationEmail(email: string, otpId?: string): Promise<{ otpId: string; message: string }> {
    // Find user by email
    const user = await this.userService.findByEmail(email);
    if (!user) {
      const { otpId: newOtpId } = await this.otpService.generateEmailOTP(email, 'email_verification');
      return { 
        otpId: newOtpId,
        message: 'If the email exists, a verification OTP has been sent' 
      };
    }

    // Check if already verified
    if (user.email_verified_at) {
      throw new BadRequestException('Email is already verified');
    }

    // Resend OTP if otpId provided, otherwise generate new one
    let otpCode: string;
    let finalOtpId: string;

    if (otpId) {
      const resendResult = await this.otpService.resendEmailOTP(otpId, 'email_verification');
      if (resendResult) {
        otpCode = resendResult.otpCode;
        finalOtpId = otpId;
      } else {
        // OTP expired, generate new one
        const newOtp = await this.otpService.generateEmailOTP(email, 'email_verification');
        otpCode = newOtp.otpCode;
        finalOtpId = newOtp.otpId;
      }
    } else {
      // Generate new OTP
      const newOtp = await this.otpService.generateEmailOTP(email, 'email_verification');
      otpCode = newOtp.otpCode;
      finalOtpId = newOtp.otpId;
    }

    // Send verification email
    await this.sendVerificationEmail(user.email, otpCode);

    return { 
      otpId: finalOtpId,
      message: 'Verification email sent successfully' 
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ otpId: string; message: string }> {
    const { email } = forgotPasswordDto;

    // Find user by email
    const user = await this.userService.findByEmail(email);
    if (!user) {
     //  throw error
      throw new ForbiddenException("user with email does not exist")
    }

    // Generate password reset OTP
    const { otpId, otpCode } = await this.otpService.generateEmailOTP(email, 'password_reset');

    // Send password reset email with OTP
    await this.sendPasswordResetEmail(user.email, otpCode);

    this.logger.log(`Password reset OTP generated for user: ${user.id}`);

    return { 
      otpId,
      message: 'password reset OTP has been sent' 
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { email, otpId, otpCode, password } = resetPasswordDto;

    // Validate OTP
    const validation = await this.otpService.validateEmailOTP(otpId, otpCode, 'password_reset');
    
    if (!validation.isValid) {
      throw new BadRequestException(validation.error || 'Invalid or expired OTP');
    }

    // Verify that the email matches
    if (validation.email !== email) {
      throw new BadRequestException('Email does not match the OTP');
    }

    // Find user by email
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Hash new password
    const saltRounds = this.configService.get<number>('security.bcryptRounds') || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update password
    user.password = hashedPassword;
    await this.userRepository.save(user);

    this.logger.log(`Password reset for user: ${user.id}`);

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Find user
    const user = await this.userService.findById(userId);

    // Check if user has a password set
    if (!user.password) {
      throw new BadRequestException('Password not set. Please use password reset.');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = this.configService.get<number>('security.bcryptRounds') || 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedPassword;
    await this.userRepository.save(user);

    this.logger.log(`Password changed for user: ${user.id}`);

    return { message: 'Password changed successfully' };
  }

  private async sendVerificationEmail(email: string, otpCode: string): Promise<void> {
    const emailData = {
      to: email,
      subject: 'Verify Your Email - Rambini',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; margin-bottom: 20px;">Verify Your Email</h2>
            <p>Thank you for registering with Rambini!</p>
            <p>Your email verification code is:</p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; display: inline-block;">
                ${otpCode}
              </div>
            </div>
            <p>Enter this code in the app to verify your email address.</p>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              This code will expire in 10 minutes. If you didn't create an account, please ignore this email.
            </p>
          </div>
        </div>
      `,
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

  private async sendPasswordResetEmail(email: string, otpCode: string): Promise<void> {
    const emailData = {
      to: email,
      subject: 'Reset Your Password - Rambini',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; margin-bottom: 20px;">Reset Your Password</h2>
            <p>You requested to reset your password for your Rambini account.</p>
            <p>Your password reset code is:</p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; display: inline-block;">
                ${otpCode}
              </div>
            </div>
            <p>Enter this code along with your new password to reset your account password.</p>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              This code will expire in 10 minutes. If you didn't request a password reset, please ignore this email.
            </p>
          </div>
        </div>
      `,
      text: `Reset Your Password\n\nYou requested to reset your password for your Rambini account.\n\nYour password reset code is: ${otpCode}\n\nEnter this code along with your new password to reset your account password.\n\nThis code will expire in 10 minutes. If you didn't request a password reset, please ignore this email.`,
    };

    try {
      await this.emailNotificationService.sendEmail(emailData);
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error.message);
      throw new BadRequestException('Failed to send password reset email');
    }
  }

  async googleSignIn(googleAuthDto: GoogleAuthDto): Promise<AuthResponse> {
    const { idToken, firstName, lastName } = googleAuthDto;

    // Verify Google ID token
    const googleUserInfo = await this.googleAuthService.verifyIdToken(idToken);

    // Check if user exists with this Google ID
    let user = await this.userRepository.findOne({
      where: {
        provider_id: googleUserInfo.sub,
        auth_provider: AuthProvider.GOOGLE,
      },
    });

    if (!user) {
      // Check if user exists with this email
      const existingUser = await this.userService.findByEmail(googleUserInfo.email);

      if (existingUser) {
        // If user exists with LOCAL auth, link the Google account
        if (existingUser.auth_provider === AuthProvider.LOCAL) {
          // Link Google account to existing user
          existingUser.auth_provider = AuthProvider.GOOGLE;
          existingUser.provider_id = googleUserInfo.sub;
          existingUser.provider_email = googleUserInfo.email;
          
          // Auto-verify email if not already verified
          if (!existingUser.email_verified_at) {
            existingUser.markEmailVerified();
          }
          
          user = await this.userRepository.save(existingUser);
          this.logger.log(`Linked Google account to existing user: ${user.id}`);
        } else {
          // User exists with different provider
          throw new ConflictException(
            `Email is already registered with ${existingUser.auth_provider} authentication. Please sign in using ${existingUser.auth_provider}.`
          );
        }
      } else {
        // Create new user
        const nameParts = (googleUserInfo.name || '').split(' ');
        const userFirstName = firstName || googleUserInfo.given_name || nameParts[0] || '';
        const userLastName = lastName || googleUserInfo.family_name || nameParts.slice(1).join(' ') || '';

        user = await this.userService.createUser({
          email: googleUserInfo.email,
          first_name: userFirstName || undefined,
          last_name: userLastName || undefined,
          auth_provider: AuthProvider.GOOGLE,
          provider_id: googleUserInfo.sub,
          provider_email: googleUserInfo.email,
          user_type: UserType.CUSTOMER,
          status: UserStatus.ACTIVE,
          email_verified_at: googleUserInfo.email_verified ? new Date() : undefined,
          image_url: googleUserInfo.picture,
          profile_completed: !!(userFirstName && userLastName),
        });

        // Create wallet for new user
        const currency = getCurrencyForCountry(user.country || 'NG');
        const wallet = this.walletRepository.create({
          user_id: user.id,
          balance: 0,
          currency: currency,
        });
        await this.walletRepository.save(wallet);

        this.logger.log(`Created new user via Google Sign In: ${user.id}`);
      }
    } else {
      // Update existing user info if needed
      if (googleUserInfo.picture && !user.image_url) {
        user.image_url = googleUserInfo.picture;
      }
      
      // Update email verification status
      if (googleUserInfo.email_verified && !user.email_verified_at) {
        user.markEmailVerified();
      }
      
      user.updateLastActive();
      user = await this.userRepository.save(user);
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE && user.status !== UserStatus.PENDING_VERIFICATION) {
      throw new UnauthorizedException('Account is not active. Please contact support.');
    }

    // Generate JWT tokens
    const tokens = this.jwtService.generateTokenPair(user);

    this.logger.log(`User signed in via Google: ${user.email}`);

    return {
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        userType: user.user_type,
        profileCompleted: user.profile_completed,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        country: user.country,
        emailVerified: !!user.email_verified_at,
      },
      tokens,
    };
  }

  async appleSignIn(appleAuthDto: AppleAuthDto): Promise<AuthResponse> {
    const { identityToken, firstName, lastName, email } = appleAuthDto;

    // Verify Apple identity token
    const appleUserInfo = await this.appleAuthService.verifyIdentityToken(identityToken);

    // Use email from token if not provided in DTO
    const userEmail = email || appleUserInfo.email || appleUserInfo.sub;

    if (!userEmail) {
      throw new BadRequestException('Email is required for Apple Sign In'); 
    }

    // Check if user exists with this Apple ID
    let user = await this.userRepository.findOne({
      where: {
        provider_id: appleUserInfo.sub,
        auth_provider: AuthProvider.APPLE,
      },
    });

    if (!user) {
      // Check if user exists with this email
      const existingUser = await this.userService.findByEmail(userEmail);

      if (existingUser) {
        // If user exists with LOCAL auth, link the Apple account
        if (existingUser.auth_provider === AuthProvider.LOCAL) {
          // Link Apple account to existing user
          existingUser.auth_provider = AuthProvider.APPLE;
          existingUser.provider_id = appleUserInfo.sub;
          existingUser.provider_email = userEmail;
          
          // Auto-verify email if not already verified
          if (!existingUser.email_verified_at) {
            existingUser.markEmailVerified();
          }
          
          user = await this.userRepository.save(existingUser);
          this.logger.log(`Linked Apple account to existing user: ${user.id}`);
        } else {
          // User exists with different provider
          throw new ConflictException(
            `Email is already registered with ${existingUser.auth_provider} authentication. Please sign in using ${existingUser.auth_provider}.`
          );
        }
      } else {
        // Create new user
        const userFirstName = firstName || appleUserInfo.name?.firstName || '';
        const userLastName = lastName || appleUserInfo.name?.lastName || '';

        user = await this.userService.createUser({
          email: userEmail,
          first_name: userFirstName || undefined,
          last_name: userLastName || undefined,
          auth_provider: AuthProvider.APPLE,
          provider_id: appleUserInfo.sub,
          provider_email: userEmail,
          user_type: UserType.CUSTOMER,
          status: UserStatus.ACTIVE,
          email_verified_at: appleUserInfo.email_verified ? new Date() : undefined,
          profile_completed: !!(userFirstName && userLastName),
        });

        // Create wallet for new user
        const currency = getCurrencyForCountry(user.country || 'NG');
        const wallet = this.walletRepository.create({
          user_id: user.id,
          balance: 0,
          currency: currency,
        });
        await this.walletRepository.save(wallet);

        this.logger.log(`Created new user via Apple Sign In: ${user.id}`);
      }
    } else {
      // Update existing user info if needed
      // Apple provides name only on first sign-in, so we preserve existing name
      if (firstName && !user.first_name) {
        user.first_name = firstName;
      }
      if (lastName && !user.last_name) {
        user.last_name = lastName;
      }
      
      // Update email verification status
      if (appleUserInfo.email_verified && !user.email_verified_at) {
        user.markEmailVerified();
      }
      
      user.updateLastActive();
      user = await this.userRepository.save(user);
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE && user.status !== UserStatus.PENDING_VERIFICATION) {
      throw new UnauthorizedException('Account is not active. Please contact support.');
    }

    // Generate JWT tokens
    const tokens = this.jwtService.generateTokenPair(user);

    this.logger.log(`User signed in via Apple: ${user.email}`);

    return {
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        userType: user.user_type,
        profileCompleted: user.profile_completed,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        country: user.country,
        emailVerified: !!user.email_verified_at,
      },
      tokens,
    };
  }

  private isValidEmail(email: string): boolean {
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
} 