import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { User, UserStatus } from 'src/entities';
import { UserService } from './user.service';

@Injectable()
export class AccountCleanupService {
  private readonly logger = new Logger(AccountCleanupService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userService: UserService,
  ) {}

  
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredAccounts(): Promise<void> {
    this.logger.log('Starting account cleanup job...');

    try {
      // Calculate the cutoff date (30 days ago)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      // Find users marked for deletion more than 30 days ago
      const usersToDelete = await this.userRepository.find({
        where: {
          status: UserStatus.DELETED,
          deletion_requested_at: LessThan(cutoffDate),
        },
      });

      if (usersToDelete.length === 0) {
        this.logger.log('No accounts to permanently delete');
        return;
      }

      this.logger.log(`Found ${usersToDelete.length} accounts to permanently delete`);

      let successCount = 0;
      let failureCount = 0;

      for (const user of usersToDelete) {
        try {
          // Check if user is eligible for permanent deletion
          if (user.isPermanentlyDeletable()) {
            await this.userService.permanentlyDeleteAccount(user.id);
            successCount++;
            this.logger.log(`Successfully permanently deleted account for user ${user.id}`);
          } else {
            this.logger.warn(`User ${user.id} is not eligible for permanent deletion yet`);
          }
        } catch (error) {
          failureCount++;
          this.logger.error(
            `Failed to permanently delete account for user ${user.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `Account cleanup completed: ${successCount} successful, ${failureCount} failed`,
      );
    } catch (error) {
      this.logger.error(`Account cleanup job failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Manual cleanup method that can be called via admin endpoint
   */
  async manuallyCleanupExpiredAccounts(): Promise<{ success: number; failed: number }> {
    this.logger.log('Manual account cleanup triggered...');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const usersToDelete = await this.userRepository
      .createQueryBuilder('user')
      .where('user.status = :status', { status: UserStatus.DELETED })
      .andWhere('user.deletion_requested_at IS NOT NULL')
      .andWhere('user.deletion_requested_at < :cutoffDate', { cutoffDate })
      .getMany();

    if (usersToDelete.length === 0) {
      this.logger.log('No accounts to permanently delete');
      return { success: 0, failed: 0 };
    }

    let successCount = 0;
    let failureCount = 0;

    for (const user of usersToDelete) {
      try {
        if (user.isPermanentlyDeletable()) {
          await this.userService.permanentlyDeleteAccount(user.id);
          successCount++;
        }
      } catch (error) {
        failureCount++;
        this.logger.error(`Failed to delete user ${user.id}: ${error.message}`);
      }
    }

    return { success: successCount, failed: failureCount };
  }
}

