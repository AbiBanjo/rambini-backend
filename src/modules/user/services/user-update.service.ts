// src/modules/user/services/user-update.service.ts
import {
  Injectable,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities';
import { UpdateUserDto } from '../dto';
import { OTPService } from '@/modules/auth/services/otp.service';
import { UserBaseService } from './user-base.service';

@Injectable()
export class UserUpdateService {
  private readonly logger = new Logger(UserUpdateService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userBaseService: UserBaseService,
    private readonly otpService: OTPService,
  ) {}

  async updateUser(id: string, updateData: UpdateUserDto): Promise<User> {
    const { otpId, otpCode, ...userUpdateData } = updateData;

    // Handle email update with OTP validation
    if (userUpdateData.email) {
      await this.validateAndUpdateEmail(id, userUpdateData, otpId, otpCode);
    }

    // Handle phone number update with OTP validation
    if (userUpdateData.phone_number) {
      await this.validateAndUpdatePhone(id, userUpdateData, otpId, otpCode);
    }

    const user = await this.userBaseService.findById(id);
    Object.assign(user, userUpdateData);
    return await this.userRepository.save(user);
  }

  private async validateAndUpdateEmail(
    userId: string,
    userUpdateData: any,
    otpId?: string,
    otpCode?: string,
  ): Promise<void> {
    const existingUserWithEmail = await this.userBaseService.findByEmail(
      userUpdateData.email,
    );

    if (existingUserWithEmail && existingUserWithEmail.id !== userId) {
      throw new ConflictException('Email is already taken by another user');
    }

    if (!otpId || !otpCode) {
      throw new BadRequestException(
        'OTP ID and OTP code are required when updating email',
      );
    }

    const { isValid } = await this.otpService.validateEmailOTP(
      otpId,
      otpCode,
      'password_reset',
    );

    if (!isValid) {
      throw new BadRequestException('Invalid OTP');
    }

    // Remove email from update if it's the same as current
    const currentUser = await this.userBaseService.findById(userId);
    if (currentUser.email === userUpdateData.email) {
      delete userUpdateData.email;
    }
  }

  private async validateAndUpdatePhone(
    userId: string,
    userUpdateData: any,
    otpId?: string,
    otpCode?: string,
  ): Promise<void> {
    const existingUserWithPhoneNumber =
      await this.userBaseService.findByPhoneNumber(userUpdateData.phone_number);

    if (
      existingUserWithPhoneNumber &&
      existingUserWithPhoneNumber.id !== userId
    ) {
      throw new ConflictException(
        'Phone number is already taken by another user',
      );
    }

    if (!otpId || !otpCode) {
      throw new BadRequestException(
        'OTP ID and OTP code are required when updating phone number',
      );
    }

    const { isValid, error } = await this.otpService.validateOTP(
      otpId,
      otpCode,
    );

    if (!isValid) {
      throw new BadRequestException(error || 'Invalid OTP');
    }

    // Remove phone from update if it's the same as current
    const currentUser = await this.userBaseService.findById(userId);
    if (currentUser.phone_number === userUpdateData.phone_number) {
      delete userUpdateData.phone_number;
    }
  }
}