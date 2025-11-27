// src/modules/user/services/account-cleanup.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { User, UserStatus } from 'src/entities';
import { UserDeletionService } from './user-deletion.service';

export interface CleanupResult {
  success: number;
  failed: number;
  total: number;
  errors: Array<{ userId: string; error: string }>;
}

@Injectable()
export class AccountCleanupService {
  private readonly logger = new Logger(AccountCleanupService.name);
  private readonly GRACE_PERIOD_DAYS = 30;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userDeletionService: UserDeletionService,
  ) {}

  /**
   * Automated daily cleanup job
   * Runs every day at 2 AM to permanently delete accounts past grace period
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredAccounts(): Promise<void> {
    this.logger.log('Starting automated account cleanup job...');

    try {
      const result = await this.performCleanup();
      
      this.logger.log(
        `Automated cleanup completed: ${result.success} successful, ${result.failed} failed out of ${result.total} accounts`,
      );

      if (result.failed > 0) {
        this.logger.warn(
          `Failed deletions: ${JSON.stringify(result.errors, null, 2)}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Automated account cleanup job failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Manual cleanup method that can be called via admin endpoint
   */
  async manuallyCleanupExpiredAccounts(): Promise<CleanupResult> {
    this.logger.log('Manual account cleanup triggered...');
    return await this.performCleanup();
  }

  /**
   * Get list of accounts scheduled for deletion
   */
  async getAccountsScheduledForDeletion(): Promise<User[]> {
    const cutoffDate = this.getCutoffDate();

    return await this.userRepository
      .createQueryBuilder('user')
      .where('user.status = :status', { status: UserStatus.DELETED })
      .andWhere('user.deletion_requested_at IS NOT NULL')
      .andWhere('user.deletion_requested_at < :cutoffDate', { cutoffDate })
      .getMany();
  }

  /**
   * Get count of accounts scheduled for deletion
   */
  async getScheduledDeletionCount(): Promise<number> {
    const cutoffDate = this.getCutoffDate();

    return await this.userRepository
      .createQueryBuilder('user')
      .where('user.status = :status', { status: UserStatus.DELETED })
      .andWhere('user.deletion_requested_at IS NOT NULL')
      .andWhere('user.deletion_requested_at < :cutoffDate', { cutoffDate })
      .getCount();
  }

  /**
   * Core cleanup logic shared by automated and manual cleanup
   */
  private async performCleanup(): Promise<CleanupResult> {
    const usersToDelete = await this.getAccountsScheduledForDeletion();

    if (usersToDelete.length === 0) {
      this.logger.log('No accounts to permanently delete');
      return { success: 0, failed: 0, total: 0, errors: [] };
    }

    this.logger.log(
      `Found ${usersToDelete.length} accounts to permanently delete`,
    );

    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ userId: string; error: string }> = [];

    for (const user of usersToDelete) {
      try {
        // Double-check eligibility before deletion
        if (user.isPermanentlyDeletable()) {
          await this.userDeletionService.permanentlyDeleteAccount(user.id);
          successCount++;
          this.logger.log(
            `Successfully permanently deleted account for user ${user.id}`,
          );
        } else {
          const message = `User ${user.id} is not eligible for permanent deletion yet`;
          this.logger.warn(message);
          failureCount++;
          errors.push({ userId: user.id, error: message });
        }
      } catch (error) {
        failureCount++;
        const errorMessage = error.message || 'Unknown error';
        errors.push({ userId: user.id, error: errorMessage });
        
        this.logger.error(
          `Failed to permanently delete account for user ${user.id}: ${errorMessage}`,
          error.stack,
        );
      }
    }

    return {
      success: successCount,
      failed: failureCount,
      total: usersToDelete.length,
      errors,
    };
  }

  /**
   * Calculate the cutoff date for deletion (30 days ago)
   */
  private getCutoffDate(): Date {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.GRACE_PERIOD_DAYS);
    return cutoffDate;
  }

  /**
   * Get days remaining until account is permanently deleted
   */
  async getDaysUntilDeletion(userId: string): Promise<number | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId, status: UserStatus.DELETED },
    });

    if (!user || !user.deletion_requested_at) {
      return null;
    }

    const deletionDate = new Date(user.deletion_requested_at);
    deletionDate.setDate(deletionDate.getDate() + this.GRACE_PERIOD_DAYS);

    const now = new Date();
    const daysRemaining = Math.ceil(
      (deletionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return Math.max(0, daysRemaining);
  }
}