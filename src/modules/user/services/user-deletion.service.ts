// src/modules/user/services/user-deletion.service.ts
import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  User,
  UserType,
  UserStatus,
  CartItem,
  MenuItem,
  Vendor,
  Wallet,
} from 'src/entities';
import { UserBaseService } from './user-base.service';
import { EmailNotificationService } from '@/modules/notification/services/email-notification.service';

@Injectable()
export class UserDeletionService {
  private readonly logger = new Logger(UserDeletionService.name);

  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    private readonly dataSource: DataSource,
    private readonly userBaseService: UserBaseService,
    private readonly emailNotificationService: EmailNotificationService,
  ) {}

  async deleteUser(id: string): Promise<void> {
    const user = await this.userBaseService.findById(id);
    await this.validateDeletion(id, user);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.performDeletion(queryRunner, id, user);
      await queryRunner.commitTransaction();

      this.logger.log(
        `User ${id} account deleted. Reason: By ADMIN.`,
      );

      await this.sendDeletionEmail(user);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteUserAccount(id: string, reason: string): Promise<void> {
    const user = await this.userBaseService.findById(id);
    await this.validateDeletion(id, user);
    await this.checkExistingDeletionRequest(user);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      user.requestDeletion();
      await queryRunner.manager.save(user);
      await queryRunner.commitTransaction();

      this.logger.log(
        `User ${id} account marked for deletion. Reason: ${reason}. Can be reactivated within 30 days.`,
      );

      await this.sendDeletionEmail(user);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async reactivateAccount(id: string): Promise<User> {
    const user = await this.userBaseService.findById(id);

    if (user.status !== UserStatus.DELETED) {
      throw new BadRequestException('Account is not marked for deletion');
    }

    if (!user.canBeReactivated()) {
      throw new BadRequestException(
        'Account cannot be reactivated. The 30-day grace period has expired or deletion was not requested properly.',
      );
    }

    user.reactivate();
    const reactivatedUser = await this.userBaseService['userRepository'].save(user);

    this.logger.log(`User ${id} account reactivated successfully.`);
    return reactivatedUser;
  }

  async permanentlyDeleteAccount(id: string): Promise<void> {
    const user = await this.userBaseService.findById(id);

    if (!user.isPermanentlyDeletable()) {
      throw new BadRequestException(
        'Account cannot be permanently deleted yet. Either it is not marked for deletion or the 30-day grace period has not expired.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.performDeletion(queryRunner, id, user);
      await queryRunner.manager.delete(User, { id });
      await queryRunner.commitTransaction();

      this.logger.log(
        `User ${id} account permanently deleted after 30-day grace period.`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async validateDeletion(id: string, user: User): Promise<void> {
    const wallet = await this.walletRepository.findOne({
      where: { user_id: id },
    });

    if (!wallet) return;

    if (wallet.balance > 0) {
      throw new BadRequestException(
        `Cannot delete account with existing customer balance of ${wallet.formatted_balance}. Please withdraw your funds before deleting your account.`,
      );
    }

    if (user.user_type === UserType.VENDOR && wallet.vendor_balance > 0) {
      const vendorBalanceFormatted = `${wallet.currency} ${wallet.vendor_balance.toFixed(2)}`;
      throw new BadRequestException(
        `Cannot delete account with existing vendor balance of ${vendorBalanceFormatted}. Please withdraw your vendor earnings before deleting your account.`,
      );
    }
  }

  private async checkExistingDeletionRequest(user: User): Promise<void> {
    if (user.status === UserStatus.DELETED && user.deletion_requested_at) {
      const daysSinceDeletion = Math.floor(
        (new Date().getTime() -
          new Date(user.deletion_requested_at).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (daysSinceDeletion <= 30) {
        throw new BadRequestException(
          `Account is already scheduled for deletion. You have ${30 - daysSinceDeletion} days remaining to reactivate your account.`,
        );
      }
    }
  }

  private async performDeletion(
    queryRunner: any,
    userId: string,
    user: User,
  ): Promise<void> {
    await queryRunner.manager.delete(CartItem, { user_id: userId });

    if (user.user_type === UserType.VENDOR) {
      const vendor = await queryRunner.manager.findOne(Vendor, {
        where: { user_id: userId },
      });

      if (vendor) {
        await queryRunner.manager.delete(MenuItem, { vendor_id: vendor.id });
        await queryRunner.manager.delete(Vendor, { id: vendor.id });
      }
    }

    await queryRunner.manager.delete(Wallet, { user_id: userId });
  }

  private async sendDeletionEmail(user: User): Promise<void> {
    try {
      const emailSent =
        await this.emailNotificationService.sendAccountDeletionEmail(user);

      if (emailSent) {
        this.logger.log(
          `Account deletion email sent successfully to user ${user.id}`,
        );
      } else {
        this.logger.warn(
          `Account deletion email could not be sent to user ${user.id}. Account deletion completed successfully.`,
        );
      }
    } catch (emailError) {
      this.logger.warn(
        `Failed to send account deletion email to user ${user.id}: ${emailError.message}. Account deletion completed successfully.`,
      );
    }
  }
}