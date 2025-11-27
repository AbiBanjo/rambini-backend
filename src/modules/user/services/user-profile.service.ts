// src/modules/user/services/user-profile.service.ts
import { Injectable } from '@nestjs/common';
import { User } from 'src/entities';
import { UserProfileBaseService } from './profile/user-profile-base.service';
import { UserProfileUpdateService, UpdateProfileRequest } from './profile/user-profile-update.service';
import { UserProfilePhoneService, ChangePhoneRequest } from './profile/user-profile-phone.service';
import { UserProfilePictureService } from './profile/user-profile-picture.service';

/**
 * Main UserProfileService that delegates to specialized profile services
 * This acts as a facade to maintain backward compatibility
 */
@Injectable()
export class UserProfileService {
  constructor(
    private readonly profileBaseService: UserProfileBaseService,
    private readonly profileUpdateService: UserProfileUpdateService,
    private readonly profilePhoneService: UserProfilePhoneService,
    private readonly profilePictureService: UserProfilePictureService,
  ) {}

  // Base profile operations
  async getUserProfile(userId: string): Promise<User> {
    return this.profileBaseService.getUserProfile(userId);
  }

  async validateProfile(userId: string): Promise<{
    isValid: boolean;
    missingFields: string[];
  }> {
    return this.profileBaseService.validateProfile(userId);
  }

  async getUserStats(userId: string): Promise<{
    totalOrders: number;
    totalSpent: number;
    memberSince: Date;
    lastOrderDate?: Date;
  }> {
    return this.profileBaseService.getUserStats(userId);
  }

  // Profile update operations
  async updateUserProfile(
    userId: string,
    updateRequest: UpdateProfileRequest,
  ): Promise<User> {
    return this.profileUpdateService.updateUserProfile(userId, updateRequest);
  }

  // Phone operations
  async sendPhoneChangeOTP(
    userId: string,
    phoneNumber: string,
  ): Promise<{ otpId: string; message: string }> {
    return this.profilePhoneService.sendPhoneChangeOTP(userId, phoneNumber);
  }

  async changePhoneNumber(
    userId: string,
    changeRequest: ChangePhoneRequest,
  ): Promise<User> {
    return this.profilePhoneService.changePhoneNumber(userId, changeRequest);
  }

  async resendPhoneChangeOTP(otpId: string): Promise<{ message: string }> {
    return this.profilePhoneService.resendPhoneChangeOTP(otpId);
  }

  // Picture operations
  async uploadProfilePicture(
    userId: string,
    file: Express.Multer.File,
  ): Promise<User> {
    return this.profilePictureService.uploadProfilePicture(userId, file);
  }

  async deleteProfilePicture(userId: string): Promise<User> {
    return this.profilePictureService.deleteProfilePicture(userId);
  }
}

// Re-export types for convenience
export { UpdateProfileRequest, ChangePhoneRequest };