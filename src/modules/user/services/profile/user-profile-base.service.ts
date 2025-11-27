// src/modules/user/services/profile/user-profile-base.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from 'src/entities';

@Injectable()
export class UserProfileBaseService {
  protected readonly logger = new Logger(UserProfileBaseService.name);

  constructor(
    @InjectRepository(User)
    protected readonly userRepository: Repository<User>,
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

  async validateProfile(userId: string): Promise<{
    isValid: boolean;
    missingFields: string[];
  }> {
    const user = await this.getUserProfile(userId);

    const requiredFields = ['first_name', 'last_name', 'phone_number'];
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!user[field]) {
        missingFields.push(field);
      }
    }

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

  protected isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  protected isValidPhoneNumber(phoneNumber: string): boolean {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }
}