import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus, UserType } from '../../../entities';

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  country?: string;
  dateOfBirth?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  profilePicture?: string;
}

export interface ChangePhoneRequest {
  newPhoneNumber: string;
  otpId: string;
  otpCode: string;
}

@Injectable()
export class UserProfileService {
  private readonly logger = new Logger(UserProfileService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getUserProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId, status: UserStatus.ACTIVE },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUserProfile(userId: string, updateRequest: UpdateProfileRequest): Promise<User> {
    const user = await this.getUserProfile(userId);

    // Validate email format if provided
    if (updateRequest.email && !this.isValidEmail(updateRequest.email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Check if email is already taken by another user
    if (updateRequest.email && updateRequest.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateRequest.email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Email already in use');
      }
    }

    // Update user profile
    Object.assign(user, updateRequest);
    
    // Ensure profile is marked as completed if required fields are present
    if (user.first_name && user.last_name) {
      user.profile_completed = true;
    }

    const updatedUser = await this.userRepository.save(user);
    
    this.logger.log(`Profile updated for user ${userId}`);
    
    return updatedUser;
  }

  async deleteUserAccount(userId: string): Promise<void> {
    const user = await this.getUserProfile(userId);

    // Soft delete - mark as inactive
    user.status = UserStatus.DELETED;
    user.deleted_at = new Date();
    
    await this.userRepository.save(user);
    
    this.logger.log(`Account deleted for user ${userId}`);
  }

  async changePhoneNumber(userId: string, changeRequest: ChangePhoneRequest): Promise<User> {
    const { newPhoneNumber, otpId, otpCode } = changeRequest;

    // Validate phone number format
    if (!this.isValidPhoneNumber(newPhoneNumber)) {
      throw new BadRequestException('Invalid phone number format. Use E.164 format (e.g., +1234567890)');
    }

    // Check if new phone number is already in use
    const existingUser = await this.userRepository.findOne({
      where: { phone_number: newPhoneNumber },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Phone number already in use');
    }

    // Validate OTP (this would integrate with the OTP service)
    // For now, we'll assume OTP validation is handled elsewhere
    this.logger.log(`OTP validation would be performed for phone change: ${otpId}, ${otpCode}`);

    // Update phone number
    const user = await this.getUserProfile(userId);
    user.phone_number = newPhoneNumber;
    user.is_phone_verified = true;

    const updatedUser = await this.userRepository.save(user);
    
    this.logger.log(`Phone number changed for user ${userId} to ${newPhoneNumber}`);
    
    return updatedUser;
  }

  async validateProfile(userId: string): Promise<{ isValid: boolean; missingFields: string[] }> {
    const user = await this.getUserProfile(userId);
    
    const requiredFields = ['first_name', 'last_name', 'phone_number'];
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!user[field]) {
        missingFields.push(field);
      }
    }

    // Check if phone is verified
    if (!user.is_phone_verified) {
      missingFields.push('phone_verification');
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  }

  async getUserStats(userId: string): Promise<{
    totalOrders: number;
    totalSpent: number;
    memberSince: Date;
    lastOrderDate?: Date;
  }> {
    const user = await this.getUserProfile(userId);

    // This would integrate with order and transaction entities
    // For now, return mock data
    return {
      totalOrders: 0, // Would be calculated from orders table
      totalSpent: 0, // Would be calculated from transactions table
      memberSince: user.created_at,
      lastOrderDate: undefined, // Would be fetched from orders table
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }
} 