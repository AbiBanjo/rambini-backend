import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User, UserType, UserStatus, CartItem, MenuItem, Vendor, Wallet } from 'src/entities';
import { UpdateUserDto } from '../dto';
import { OTPService } from '@/modules/auth/services/otp.service';
import { EmailNotificationService } from '@/modules/notification/services/email-notification.service';
import { SMSService } from '@/modules/auth/services/sms.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    private readonly dataSource: DataSource,
    private readonly otpService: OTPService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly smsService: SMSService,
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
    
    // Check if user has money in their wallet
    const wallet = await this.walletRepository.findOne({ where: { user_id: id } });
    
    if (wallet) {
      // Check customer balance
      if (wallet.balance > 0) {
        throw new BadRequestException(
          `Cannot delete account with existing customer balance of ${wallet.formatted_balance}. Please withdraw your funds before deleting your account.`
        );
      }
      
      // Check vendor balance if user is a vendor
      if (user.user_type === UserType.VENDOR && wallet.vendor_balance > 0) {
        const vendorBalanceFormatted = `${wallet.currency} ${wallet.vendor_balance.toFixed(2)}`;
        throw new BadRequestException(
          `Cannot delete account with existing vendor balance of ${vendorBalanceFormatted}. Please withdraw your vendor earnings before deleting your account.`
        );
      }
    }
    
    // Check if account is already marked for deletion within 30 days
    if (user.status === UserStatus.DELETED && user.deletion_requested_at) {
      const daysSinceDeletion = Math.floor(
        (new Date().getTime() - new Date(user.deletion_requested_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceDeletion <= 30) {
        throw new BadRequestException(
          `Account is already scheduled for deletion. You have ${30 - daysSinceDeletion} days remaining to reactivate your account.`
        );
      }
    }
    
    // Use a transaction to ensure all operations are atomic
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Soft delete: Mark account for deletion with 30-day grace period
      user.requestDeletion();
      await queryRunner.manager.save(user);
      
      await queryRunner.commitTransaction();
      
      // Log the deletion request for audit purposes
      this.logger.log(`User ${id} account marked for deletion. Reason: ${reason}. Can be reactivated within 30 days.`);
      
      // Send email notification to the user
      // Email failure should not block account deletion
      try {
        const emailSent = await this.emailNotificationService.sendAccountDeletionEmail(user);
        if (emailSent) {
          this.logger.log(`Account deletion email sent successfully to user ${id}`);
        } else {
          this.logger.warn(
            `Account deletion email could not be sent to user ${id} (email service returned false). Account deletion completed successfully.`
          );
        }
      } catch (emailError) {
        this.logger.warn(
          `Failed to send account deletion email to user ${id}: ${emailError.message}. Account deletion completed successfully.`
        );
        // Don't throw error - the account deletion is already processed
      }
      
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
    // send OTP to phone number
    await this.smsService.sendOTP(phoneNumber, otpCode);
    return {otpId}
  }
    // use otp service to generate OTP

  async reactivateAccount(id: string): Promise<User> {
    const user = await this.findById(id);
    
    if (user.status !== UserStatus.DELETED) {
      throw new BadRequestException('Account is not marked for deletion');
    }
    
    if (!user.canBeReactivated()) {
      throw new BadRequestException(
        'Account cannot be reactivated. The 30-day grace period has expired or deletion was not requested properly.'
      );
    }
    
    user.reactivate();
    const reactivatedUser = await this.userRepository.save(user);
    
    console.log(`User ${id} account reactivated successfully.`);
    return reactivatedUser;
  }

  async permanentlyDeleteAccount(id: string): Promise<void> {
    const user = await this.findById(id);
    
    if (!user.isPermanentlyDeletable()) {
      throw new BadRequestException(
        'Account cannot be permanently deleted yet. Either it is not marked for deletion or the 30-day grace period has not expired.'
      );
    }
    
    // Use a transaction to ensure all deletions are atomic
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Delete cart items for the user
      await queryRunner.manager.delete(CartItem, { user_id: id });
      
      // 2. If user is a vendor, delete their menu items and vendor profile
      if (user.user_type === UserType.VENDOR) {
        const vendor = await queryRunner.manager.findOne(Vendor, { 
          where: { user_id: id } 
        });
        
        if (vendor) {
          // Delete all menu items for this vendor
          await queryRunner.manager.delete(MenuItem, { vendor_id: vendor.id });
          
          // Delete the vendor profile
          await queryRunner.manager.delete(Vendor, { id: vendor.id });
        }
      }
      
      // 3. Delete wallet if exists
      await queryRunner.manager.delete(Wallet, { user_id: id });
      
      // 4. Finally, permanently delete the user (hard delete)
      await queryRunner.manager.delete(User, { id });
      
      await queryRunner.commitTransaction();
      
      // Log the permanent deletion for audit purposes
      this.logger.log(`User ${id} account permanently deleted after 30-day grace period.`);
      
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

} 