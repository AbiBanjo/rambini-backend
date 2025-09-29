import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User, UserType, UserStatus, CartItem, MenuItem, Vendor } from 'src/entities';
import { UpdateUserDto } from '../dto';
import { OTPService } from '@/modules/auth/services/otp.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    private readonly dataSource: DataSource,
    private readonly otpService: OTPService,
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

  async updateUser(id: string, updateData: UpdateUserDto): Promise<User> {
    // Extract OTP fields from updateData
    const { otpCode, otpId, ...userUpdateData } = updateData;

    // Check for email conflicts if email is being updated
    if (userUpdateData.email) {
      const existingUserWithEmail = await this.findByEmail(userUpdateData.email);
      if (existingUserWithEmail && existingUserWithEmail.id !== id) {
        throw new ConflictException('Email is already taken by another user');
      }

      // If the email is the same as the current user's email, remove it from updateData to avoid unnecessary update
      const currentUser = await this.findById(id);
      if (currentUser.email === userUpdateData.email) {
        delete userUpdateData.email;
      }
    }

    if (userUpdateData.phone_number) {
      const existingUserWithPhoneNumber = await this.findByPhoneNumber(userUpdateData.phone_number);
      if (existingUserWithPhoneNumber && existingUserWithPhoneNumber.id !== id) {
        throw new ConflictException('Phone number is already taken by another user');
      }
      
      // Validate OTP if both otpId and otpCode are provided
      if (!otpId || !otpCode) {
        throw new BadRequestException('OTP ID and OTP code are required when updating phone number');
      }
      
      const { isValid } = await this.otpService.validateOTP(otpId, otpCode);
      if (!isValid) {
        throw new BadRequestException('Invalid OTP');
      }
    }

    const user = await this.findById(id);
    Object.assign(user, userUpdateData);
    return await this.userRepository.save(user);
  }


  async deleteUser(id: string): Promise<void> {
    const user = await this.findById(id);
    user.delete();
    await this.userRepository.save(user);
  }

  async deleteUserAccount(id: string, reason: string): Promise<void> {
    const user = await this.findById(id);
    
    // Use a transaction to ensure all deletions are atomic
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Delete cart items for the user
      await queryRunner.manager.delete(CartItem, { user_id: id });
      
      // 2. If user is a vendor, delete their menu items
      if (user.user_type === UserType.VENDOR) {
        const vendor = await queryRunner.manager.findOne(Vendor, { 
          where: { user_id: id } 
        });
        
        if (vendor) {
          // Delete all menu items for this vendor
          await queryRunner.manager.delete(MenuItem, { vendor_id: vendor.id });
        }
      }
      
      // 3. Finally, delete the user profile (soft delete by setting status to DELETED)
      user.delete();
      await queryRunner.manager.save(user);
      
      await queryRunner.commitTransaction();
      
      // Log the deletion for audit purposes
      console.log(`User ${id} account deleted. Reason: ${reason}`);
      
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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

  async generateOTP(phoneNumber: string): Promise<{ otpId: string }> {
    const { otpId, otpCode } = await this.otpService.generateOTP(phoneNumber);
    return {otpId}
  }
    // use otp service to generate OTP

} 