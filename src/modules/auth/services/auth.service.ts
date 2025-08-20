import { Injectable, Logger, ConflictException, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserType, UserStatus, Wallet, Currency } from '../../../entities';
import { OTPService } from './otp.service';
import { SMSService } from './sms.service';
import { JWTService, TokenPair } from './jwt.service';
import { UserService } from '../../user/services/user.service';
import { AddressService } from '../../user/services/address.service';
import { RegisterDto, VerifyOtpDto, CompleteProfileDto } from '../dto';

export interface AuthResponse {
  user: {
    id: string;
    phoneNumber: string;
    userType: UserType;
    profileCompleted: boolean;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  tokens: TokenPair;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    private readonly userService: UserService,
    private readonly addressService: AddressService,
    private readonly otpService: OTPService,
    private readonly smsService: SMSService,
    private readonly jwtService: JWTService,
  ) {}

  async register(registerRequest: RegisterDto): Promise<{ otpId: string; message: string }> {
    const { phoneNumber } = registerRequest;

    // Validate phone number format (E.164)
    if (!this.isValidPhoneNumber(phoneNumber)) {
      throw new BadRequestException('Invalid phone number format. Use E.164 format (e.g., +1234567890)');
    }

    // Check if user already exists
    const existingUser = await this.userService.findByPhoneNumber(phoneNumber);

    if (existingUser) {
      throw new ConflictException('Phone number already registered');
    }

    // Generate OTP
    const { otpId, otpCode } = await this.otpService.generateOTP(phoneNumber);

    // Send OTP via SMS
    const smsSent = await this.smsService.sendOTP(phoneNumber, otpCode);
    
    if (!smsSent) {
      this.logger.warn(`Failed to send SMS to ${phoneNumber}, but OTP was generated`);
      throw new BadRequestException('Failed to send SMS');
    }

    return {
      otpId,
      message: 'OTP sent successfully',
    };
  }

  async login(phoneNumber: string): Promise<{ otpId: string; message: string }> {
    // Validate phone number format (E.164)
    if (!this.isValidPhoneNumber(phoneNumber)) {
      throw new BadRequestException('Invalid phone number format. Use E.164 format (e.g., +1234567890)');
    }

    // Check if user exists
    const existingUser = await this.userService.findByPhoneNumber(phoneNumber);

    if (!existingUser) {
      throw new NotFoundException('User not found. Please register first.');
    }

    // Check if user is active
    if (existingUser.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active. Please contact support.');
    }

    // Generate OTP
    const { otpId, otpCode } = await this.otpService.generateOTP(phoneNumber);

    // Send OTP via SMS
    const smsSent = await this.smsService.sendOTP(phoneNumber, otpCode);
    
    if (!smsSent) {
      this.logger.warn(`Failed to send SMS to ${phoneNumber}, but OTP was generated`);
      throw new BadRequestException('Failed to send SMS');
    }

    this.logger.log(`Login OTP sent to ${phoneNumber}`);

    return {
      otpId,
      message: 'OTP sent successfully for login',
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

      // Create wallet for user
      const wallet = this.walletRepository.create({
        user_id: user.id,
        balance: 0,
        currency: Currency.NGN,
      });

      await this.walletRepository.save(wallet);

      this.logger.log(`Created new user ${user.id} with wallet`);
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
      },
      tokens,
    };
  }

  async completeProfile(userId: string, profileRequest: CompleteProfileDto): Promise<AuthResponse> {
    // Validate input data
    if (!profileRequest.firstName?.trim() || !profileRequest.lastName?.trim()) {
      throw new BadRequestException('First name and last name are required');
    }

    // Validate email format if provided
    if (profileRequest.email && !this.isValidEmail(profileRequest.email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Update user profile and mark as completed in a single operation
    const updatedUser = await this.userService.updateUser(userId, {
      first_name: profileRequest.firstName,
      last_name: profileRequest.lastName,
      email: profileRequest.email,
      profile_completed: true,
    });

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

  private isValidEmail(email: string): boolean {
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
} 