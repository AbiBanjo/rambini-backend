// src/modules/user/services/profile/user-profile-update.service.ts
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

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  country?: string;
  dateOfBirth?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  profilePicture?: string;
}

@Injectable()
export class UserProfileUpdateService {
  private readonly logger = new Logger(UserProfileUpdateService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly profileBaseService: UserProfileBaseService,
  ) {}

  async updateUserProfile(
    userId: string,
    updateRequest: UpdateProfileRequest,
  ): Promise<User> {
    const user = await this.profileBaseService.getUserProfile(userId);

    // Validate email format if provided
    if (updateRequest.email && !this.profileBaseService['isValidEmail'](updateRequest.email)) {
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
}