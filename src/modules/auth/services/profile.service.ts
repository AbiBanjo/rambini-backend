import { Injectable, Logger, BadRequestException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Wallet } from '../../../entities';
import { JWTService } from './jwt.service';
import { UserService } from '../../user/services/user.service';
import { AddressService } from '../../user/services/address.service';
import { CompleteProfileDto } from '../dto';
import { getCurrencyForCountry } from '../../../utils/currency-mapper';
import { PhoneValidator } from '../helpers/validators';
import { AuthResponseBuilder } from '../helpers/auth-response.builder';
import { OTPService } from './otp.service';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    private readonly userService: UserService,
    @Inject(forwardRef(() => AddressService))
    private readonly addressService: AddressService,
    private readonly jwtService: JWTService,
    private readonly authResponseBuilder: AuthResponseBuilder,
    private readonly otpService: OTPService,
  ) {}

  async completeProfile(userId: string, profileDto: CompleteProfileDto) {
    // Validate input data
    this.validateProfileData(profileDto);

    // ✅ CHANGED: Only validate phone if provided
    if (profileDto.phoneNumber) {
      await this.validateAndVerifyPhone(userId, profileDto);
    }

    // Update user profile
    const updatedUser = await this.updateUserProfile(userId, profileDto);

    // Create or update wallet
    await this.setupWallet(userId, profileDto.country || 'NG');

    // Create default address if provided
    if (profileDto.address) {
      await this.createAddress(userId, profileDto);
    }

    // Generate new tokens
    const tokens = this.jwtService.generateTokenPair(updatedUser);

    const phoneMessage = profileDto.phoneNumber 
      ? ` with verified phone ${profileDto.phoneNumber}`
      : ' (phone number can be added later)';

    this.logger.log(`Profile completed for user ${userId}${phoneMessage}`);

    return this.authResponseBuilder.build(updatedUser, tokens);
  }

  // ✅ NEW: Separate phone validation and verification logic
  private async validateAndVerifyPhone(userId: string, profileDto: CompleteProfileDto): Promise<void> {
    // Check if phone number is already taken
    await this.validatePhoneNumber(userId, profileDto.phoneNumber!);

    // Verify OTP is provided when phone is provided
    if (!profileDto.otpId || !profileDto.otpCode) {
      throw new BadRequestException(
        'OTP ID and OTP code are required when providing a phone number'
      );
    }

    // Check cache first - if OTP was already verified via /verify-profile-otp
    const isPreVerified = await this.otpService.isPhoneVerified(profileDto.phoneNumber!);

    if (isPreVerified) {
      this.logger.log(`Using cached OTP verification for ${profileDto.phoneNumber}`);
    } else {
      // Fallback: Validate OTP with Twilio if not cached
      this.logger.log(`OTP not in cache, validating with Twilio for ${profileDto.phoneNumber}`);
      
      const otpValidation = await this.otpService.validateOTP(
        profileDto.otpId,
        profileDto.otpCode
      );

      if (!otpValidation.isValid) {
        throw new BadRequestException(
          otpValidation.error || 'Invalid or expired OTP code'
        );
      }

      // Verify that the OTP phone number matches the profile phone number
      if (otpValidation.phoneNumber !== profileDto.phoneNumber) {
        throw new BadRequestException(
          'Phone number does not match the verified phone number'
        );
      }
    }

    // Mark phone as verified
    await this.userService.markPhoneVerified(userId);

    // Clear cache after successful verification
    await this.otpService.clearVerificationCache(profileDto.phoneNumber!);
  }

  private validateProfileData(profileDto: CompleteProfileDto): void {
    if (!profileDto.firstName?.trim() || !profileDto.lastName?.trim()) {
      throw new BadRequestException('First name and last name are required');
    }

    // ✅ CHANGED: Only validate phone format if provided
    if (profileDto.phoneNumber && !PhoneValidator.isValid(profileDto.phoneNumber)) {
      throw new BadRequestException('Invalid phone number format. Use E.164 format (e.g., +1234567890)');
    }
  }

  private async validatePhoneNumber(userId: string, phoneNumber: string): Promise<void> {
    const existingUserWithPhone = await this.userService.findByPhoneNumber(phoneNumber);
    if (existingUserWithPhone && existingUserWithPhone.id !== userId) {
      throw new ConflictException('Phone number is already taken by another user');
    }
  }

  private async updateUserProfile(userId: string, profileDto: CompleteProfileDto): Promise<User> {
    // ✅ CHANGED: Only include phone if provided
    const updateData: any = {
      first_name: profileDto.firstName,
      last_name: profileDto.lastName,
      country: profileDto.country || 'NG',
      profile_completed: true,
    };

    if (profileDto.phoneNumber) {
      updateData.phone_number = profileDto.phoneNumber;
    }

    return await this.userService.updateUser(userId, updateData);
  }

  private async setupWallet(userId: string, country: string): Promise<void> {
    const currency = getCurrencyForCountry(country);
    let wallet = await this.walletRepository.findOne({
      where: { user_id: userId }
    });

    if (!wallet) {
      wallet = this.walletRepository.create({
        user_id: userId,
        balance: 0,
        currency: currency,
      });
      await this.walletRepository.save(wallet);
      this.logger.log(`Created wallet with currency ${currency} for user ${userId}`);
    } else if (wallet.currency !== currency) {
      wallet.currency = currency;
      await this.walletRepository.save(wallet);
      this.logger.log(`Updated wallet currency to ${currency} for user ${userId}`);
    }
  }

  private async createAddress(userId: string, profileDto: CompleteProfileDto): Promise<void> {
    try {
      const addressValidation = await this.addressService.validateAddress(profileDto.address);

      if (!addressValidation.isValid) {
        this.logger.warn(`Invalid address data for user ${userId}:`, addressValidation.errors);
        throw new BadRequestException(`Invalid address data: ${addressValidation.errors.join(', ')}`);
      }

      const createdAddress = await this.addressService.createAddress(userId, {
        address_line_1: profileDto.address.address_line_1,
        address_line_2: profileDto.address.address_line_2,
        city: profileDto.address.city,
        state: profileDto.address.state,
        postal_code: profileDto.address.postal_code,
        latitude: profileDto.address.latitude,
        longitude: profileDto.address.longitude,
        is_default: profileDto.address.is_default || true,
        country: profileDto.country || 'NG',
      });

      this.logger.log(`Address created for user ${userId}: ${createdAddress.id}`);
    } catch (error) {
      this.logger.error(`Failed to create address for user ${userId}:`, error.message);
      // Don't fail the entire profile completion if address creation fails
    }
  }
}