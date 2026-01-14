import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Withdrawal,
  WithdrawalStatus,
  User,
} from '../../../../entities';
import { WithdrawalRepository } from '../../repositories/withdrawal.repository';
import { WithdrawalEmailNotificationService } from '../../../notification/services/withdrawal-email-notification.service';
import { AdminWithdrawalActionDto, WithdrawalResponseDto } from '../../dto';

@Injectable()
export class WithdrawalAdminService {
  private readonly logger = new Logger(WithdrawalAdminService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly withdrawalRepo: WithdrawalRepository,
    private readonly withdrawalEmailService: WithdrawalEmailNotificationService,
  ) {}

  /**
   * Get all withdrawals
   */
  async getAllWithdrawals(): Promise<Withdrawal[]> {
    return await this.withdrawalRepo.findAll();
  }

  /**
   * Get withdrawals by status
   */
  async getWithdrawalsByStatus(status: WithdrawalStatus): Promise<Withdrawal[]> {
    return await this.withdrawalRepo.findByStatus(status);
  }

  /**
   * Get withdrawal statistics
   */
  async getWithdrawalStats() {
    const [
      totalPending,
      totalProcessing,
      totalCompleted,
      totalRejected,
      totalFailed,
      totalAmountCompleted,
      totalAmountPending,
      totalAmountProcessing,
    ] = await Promise.all([
      this.withdrawalRepo.countByStatus(WithdrawalStatus.PENDING),
      this.withdrawalRepo.countByStatus(WithdrawalStatus.PROCESSING),
      this.withdrawalRepo.countByStatus(WithdrawalStatus.COMPLETED),
      this.withdrawalRepo.countByStatus(WithdrawalStatus.REJECTED),
      this.withdrawalRepo.countByStatus(WithdrawalStatus.FAILED),
      this.withdrawalRepo.getTotalWithdrawnByStatus(
        WithdrawalStatus.COMPLETED,
      ),
      this.withdrawalRepo.getTotalWithdrawnByStatus(WithdrawalStatus.PENDING),
      this.withdrawalRepo.getTotalWithdrawnByStatus(
        WithdrawalStatus.PROCESSING,
      ),
    ]);

    return {
      pending: totalPending,
      processing: totalProcessing,
      completed: totalCompleted,
      rejected: totalRejected,
      failed: totalFailed,
      total_amount_completed: totalAmountCompleted,
      total_amount_pending: totalAmountPending,
      total_amount_processing: totalAmountProcessing,
      total_requests:
        totalPending +
        totalProcessing +
        totalCompleted +
        totalRejected +
        totalFailed,
    };
  }

  /**
   * Get all pending withdrawals
   */
  async getAllPendingWithdrawals(): Promise<Withdrawal[]> {
    return await this.withdrawalRepo.findAllPending();
  }

  /**
   * Get all processing withdrawals
   */
  async getAllProcessingWithdrawals(): Promise<Withdrawal[]> {
    return await this.withdrawalRepo.findAllProcessing();
  }

  /**
   * Mark withdrawal as completed (money already debited)
   */
  async markWithdrawalAsDone(
    withdrawalId: string,
    adminId: string,
    actionData: AdminWithdrawalActionDto,
  ): Promise<Withdrawal> {
    this.logger.log(
      `[WITHDRAWAL COMPLETE] ========================================`,
    );
    this.logger.log(
      `[WITHDRAWAL COMPLETE] Admin ${adminId} completing withdrawal ${withdrawalId}`,
    );

    const withdrawal = await this.withdrawalRepo.findById(withdrawalId);
    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    if (withdrawal.is_final_status) {
      throw new BadRequestException('Withdrawal is already in final status');
    }

    this.logger.log(
      `[WITHDRAWAL COMPLETE] Current status: ${withdrawal.status}`,
    );

    // Money was already debited when request was created
    this.logger.log(
      `[WITHDRAWAL COMPLETE] Money already debited during request. No wallet change needed.`,
    );

    // Update withdrawal status
    await this.withdrawalRepo.updateStatus(
      withdrawalId,
      WithdrawalStatus.COMPLETED,
      adminId,
      actionData.notes,
      actionData.transaction_reference,
    );

    this.logger.log(
      `[WITHDRAWAL COMPLETE] ✓ Status updated to COMPLETED`,
    );

    // Get updated withdrawal and user
    const updatedWithdrawal = await this.withdrawalRepo.findById(withdrawalId);

    // Send notification to user
    try {
      await this.withdrawalEmailService.sendWithdrawalCompletedEmail(
        updatedWithdrawal,
        updatedWithdrawal.user,
      );
      this.logger.log(
        `[WITHDRAWAL COMPLETE] ✓ Completion email sent to user`,
      );
    } catch (error) {
      this.logger.error(
        `[WITHDRAWAL COMPLETE ERROR] ⚠️ Failed to send email: ${error.message}`,
      );
    }

    this.logger.log(
      `[WITHDRAWAL COMPLETE] ✓ Withdrawal ${withdrawalId} completed by admin ${adminId}`,
    );
    this.logger.log(
      `[WITHDRAWAL COMPLETE] ========================================`,
    );

    return updatedWithdrawal;
  }

  /**
   * Mark withdrawal as failed and refund money
   */
  async markWithdrawalAsFailed(
    withdrawalId: string,
    adminId: string,
    actionData: AdminWithdrawalActionDto,
  ): Promise<Withdrawal> {
    this.logger.log(
      `[WITHDRAWAL FAILED] ========================================`,
    );
    this.logger.log(
      `[WITHDRAWAL FAILED] Admin ${adminId} marking withdrawal ${withdrawalId} as failed`,
    );

    const withdrawal = await this.withdrawalRepo.findById(withdrawalId);
    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    if (withdrawal.is_final_status) {
      throw new BadRequestException('Withdrawal is already in final status');
    }

    this.logger.log(
      `[WITHDRAWAL FAILED] Current status: ${withdrawal.status}, Amount: ${withdrawal.amount}`,
    );

    // Refund the money back to vendor's wallet
    await this.refundWithdrawal(withdrawal);

    // Update withdrawal status
    await this.withdrawalRepo.updateStatus(
      withdrawalId,
      WithdrawalStatus.FAILED,
      adminId,
      actionData.notes,
    );

    this.logger.log(
      `[WITHDRAWAL FAILED] ✓ Status updated to FAILED`,
    );

    // Get updated withdrawal
    const updatedWithdrawal = await this.withdrawalRepo.findById(withdrawalId);

    // Send notification to user
    try {
      await this.withdrawalEmailService.sendWithdrawalFailedEmail(
        updatedWithdrawal,
        updatedWithdrawal.user,
      );
      this.logger.log(
        `[WITHDRAWAL FAILED] ✓ Failed email sent to user`,
      );
    } catch (error) {
      this.logger.error(
        `[WITHDRAWAL FAILED ERROR] ⚠️ Failed to send email: ${error.message}`,
      );
    }

    this.logger.log(
      `[WITHDRAWAL FAILED] ✓ Withdrawal ${withdrawalId} marked as failed by admin ${adminId}. Money refunded.`,
    );
    this.logger.log(
      `[WITHDRAWAL FAILED] ========================================`,
    );

    return updatedWithdrawal;
  }

  /**
   * Mark withdrawal as rejected and refund money
   */
  async markWithdrawalAsRejected(
    withdrawalId: string,
    adminId: string,
    actionData: AdminWithdrawalActionDto,
  ): Promise<Withdrawal> {
    this.logger.log(
      `[WITHDRAWAL REJECTED] ========================================`,
    );
    this.logger.log(
      `[WITHDRAWAL REJECTED] Admin ${adminId} rejecting withdrawal ${withdrawalId}`,
    );

    const withdrawal = await this.withdrawalRepo.findById(withdrawalId);
    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    if (withdrawal.is_final_status) {
      throw new BadRequestException('Withdrawal is already in final status');
    }

    this.logger.log(
      `[WITHDRAWAL REJECTED] Current status: ${withdrawal.status}, Amount: ${withdrawal.amount}`,
    );

    // Refund the money back to vendor's wallet
    await this.refundWithdrawal(withdrawal);

    // Update withdrawal status
    await this.withdrawalRepo.updateStatus(
      withdrawalId,
      WithdrawalStatus.REJECTED,
      adminId,
      actionData.notes,
    );

    this.logger.log(
      `[WITHDRAWAL REJECTED] ✓ Status updated to REJECTED`,
    );

    // Get updated withdrawal
    const updatedWithdrawal = await this.withdrawalRepo.findById(withdrawalId);

    // Send notification to user
    try {
      await this.withdrawalEmailService.sendWithdrawalRejectedEmail(
        updatedWithdrawal,
        updatedWithdrawal.user,
      );
      this.logger.log(
        `[WITHDRAWAL REJECTED] ✓ Rejection email sent to user`,
      );
    } catch (error) {
      this.logger.error(
        `[WITHDRAWAL REJECTED ERROR] ⚠️ Failed to send email: ${error.message}`,
      );
    }

    this.logger.log(
      `[WITHDRAWAL REJECTED] ✓ Withdrawal ${withdrawalId} rejected by admin ${adminId}. Money refunded.`,
    );
    this.logger.log(
      `[WITHDRAWAL REJECTED] ========================================`,
    );

    return updatedWithdrawal;
  }

  /**
   * Private helper: Refund withdrawal to user's wallet
   */
  private async refundWithdrawal(withdrawal: Withdrawal): Promise<void> {
    this.logger.log(
      `[REFUND] Attempting to refund ${withdrawal.amount} back to user ${withdrawal.user_id}`,
    );

    try {
      // Get user with wallet
      const user = await this.userRepository.findOne({
        where: { id: withdrawal.user_id },
        relations: ['wallet'],
      });

      if (!user || !user.wallet) {
        throw new BadRequestException('User or wallet not found');
      }

      // Credit vendor wallet
      user.wallet.creditVendor(withdrawal.amount);
      await this.userRepository.manager.save(user.wallet);

      this.logger.log(
        `[REFUND] ✓ Successfully refunded ${withdrawal.amount} to user ${withdrawal.user_id}`,
      );
      this.logger.log(
        `[REFUND] New vendor balance: ${user.wallet.vendor_balance}`,
      );
    } catch (error) {
      this.logger.error(
        `[REFUND ERROR] ❌ Failed to refund: ${error.message}`,
      );
      throw new BadRequestException(`Failed to refund money: ${error.message}`);
    }
  }
}