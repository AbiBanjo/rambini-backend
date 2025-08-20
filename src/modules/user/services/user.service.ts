import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserType, UserStatus } from 'src/entities';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createUser(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return await this.userRepository.save(user);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { phone_number: phoneNumber } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    // Check for email conflicts if email is being updated
    if (updateData.email) {
      const existingUserWithEmail = await this.findByEmail(updateData.email);
      if (existingUserWithEmail && existingUserWithEmail.id !== id) {
        throw new ConflictException('Email is already taken by another user');
      }
      
      // If the email is the same as the current user's email, remove it from updateData to avoid unnecessary update
      const currentUser = await this.findById(id);
      if (currentUser.email === updateData.email) {
        delete updateData.email;
      }
    }

    const user = await this.findById(id);
    Object.assign(user, updateData);
    return await this.userRepository.save(user);
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.findById(id);
    user.delete();
    await this.userRepository.save(user);
  }

  async markPhoneVerified(id: string): Promise<User> {
    const user = await this.findById(id);
    user.markPhoneVerified();
    return await this.userRepository.save(user);
  }

  async markEmailVerified(id: string): Promise<User> {
    const user = await this.findById(id);
    user.markEmailVerified();
    return await this.userRepository.save(user);
  }

  async updateLastActive(id: string): Promise<void> {
    const user = await this.findById(id);
    user.updateLastActive();
    await this.userRepository.save(user);
  }

  async completeProfile(id: string): Promise<User> {
    const user = await this.findById(id);
    user.completeProfile();
    return await this.userRepository.save(user);
  }

  async suspendUser(id: string): Promise<User> {
    const user = await this.findById(id);
    user.suspend();
    return await this.userRepository.save(user);
  }

  async activateUser(id: string): Promise<User> {
    const user = await this.findById(id);
    user.activate();
    return await this.userRepository.save(user);
  }

  async findActiveUsers(): Promise<User[]> {
    return await this.userRepository.find({ where: { status: UserStatus.ACTIVE } });
  }

  async findUsersByType(userType: UserType): Promise<User[]> {
    return await this.userRepository.find({ where: { user_type: userType } });
  }
} 