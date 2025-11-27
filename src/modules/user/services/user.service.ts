// src/modules/user/services/user.service.ts
import { Injectable } from '@nestjs/common';
import { User, UserType } from 'src/entities';
import { UpdateUserDto } from '../dto';
import { UserBaseService } from './user-base.service';
import { UserUpdateService } from './user-update.service';
import { UserDeletionService } from './user-deletion.service';
import { UserOTPService } from './user-otp.service';

/**
 * Main UserService that delegates to specialized services
 * This acts as a facade to maintain backward compatibility
 */
@Injectable()
export class UserService {
  constructor(
    private readonly userBaseService: UserBaseService,
    private readonly userUpdateService: UserUpdateService,
    private readonly userDeletionService: UserDeletionService,
    private readonly userOTPService: UserOTPService,
  ) {}

  // Base user operations
  async createUser(userData: Partial<User>): Promise<User> {
    return this.userBaseService.createUser(userData);
  }

  async findById(id: string): Promise<User> {
    return this.userBaseService.findById(id);
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return this.userBaseService.findByPhoneNumber(phoneNumber);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userBaseService.findByEmail(email);
  }

  async findActiveUsers(): Promise<User[]> {
    return this.userBaseService.findActiveUsers();
  }

  async findUsersByType(userType: UserType): Promise<User[]> {
    return this.userBaseService.findUsersByType(userType);
  }

  async markPhoneVerified(id: string): Promise<User> {
    return this.userBaseService.markPhoneVerified(id);
  }

  async markEmailVerified(id: string): Promise<User> {
    return this.userBaseService.markEmailVerified(id);
  }

  async updateLastActive(id: string): Promise<void> {
    return this.userBaseService.updateLastActive(id);
  }

  async completeProfile(id: string): Promise<User> {
    return this.userBaseService.completeProfile(id);
  }

  async suspendUser(id: string): Promise<User> {
    return this.userBaseService.suspendUser(id);
  }

  async activateUser(id: string): Promise<User> {
    return this.userBaseService.activateUser(id);
  }

  // Update operations
  async updateUser(id: string, updateData: UpdateUserDto): Promise<User> {
    return this.userUpdateService.updateUser(id, updateData);
  }

  // Deletion operations
  async deleteUser(id: string): Promise<void> {
    return this.userDeletionService.deleteUser(id);
  }

  async deleteUserAccount(id: string, reason: string): Promise<void> {
    return this.userDeletionService.deleteUserAccount(id, reason);
  }

  async reactivateAccount(id: string): Promise<User> {
    return this.userDeletionService.reactivateAccount(id);
  }

  async permanentlyDeleteAccount(id: string): Promise<void> {
    return this.userDeletionService.permanentlyDeleteAccount(id);
  }

  // OTP operations
  async generateOTP(email: string): Promise<{ otpId: string }> {
    return this.userOTPService.generateOTP(email);
  }
}