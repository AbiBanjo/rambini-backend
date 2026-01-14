import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdrawal, WithdrawalStatus, User } from '../../../../entities';

export interface FixResult {
  total_completed_withdrawals: number;
  users_affected: number;
  total_amount_to_deduct: number;
  already_fixed_count: number; // NEW: Track already fixed
  details: Array<{
    user_id: string;
    user_email: string;
    withdrawal_id: string;
    amount: number;
    current_balance: number;
    new_balance: number;
    withdrawal_date: Date;
    status: 'success' | 'error' | 'already_fixed'; // NEW: Add already_fixed status
    error_message?: string;
    wallet_debited_at?: Date; // NEW: When wallet was debited
  }>;
}

@Injectable()
export class FixCompletedWithdrawalsService {
  private readonly logger = new Logger(FixCompletedWithdrawalsService.name);

  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * DRY RUN - Analyze what needs to be fixed without making changes
   * Now checks wallet_debited_at field to identify already-fixed withdrawals
   */
  async analyzeCompletedWithdrawals(): Promise<FixResult> {
    this.logger.log('[ANALYSIS START] ========================================');
    this.logger.log('[ANALYSIS] Starting dry run analysis of completed withdrawals...');

    const result: FixResult = {
      total_completed_withdrawals: 0,
      users_affected: 0,
      total_amount_to_deduct: 0,
      already_fixed_count: 0, // NEW
      details: [],
    };

    try {
      // Find all COMPLETED withdrawals
      const completedWithdrawals = await this.withdrawalRepository.find({
        where: { status: WithdrawalStatus.COMPLETED },
        order: { created_at: 'ASC' },
      });

      this.logger.log(
        `[ANALYSIS] Found ${completedWithdrawals.length} completed withdrawals`,
      );

      const userWithdrawalsMap = new Map<string, Withdrawal[]>();

      // Group withdrawals by user
      for (const withdrawal of completedWithdrawals) {
        if (!userWithdrawalsMap.has(withdrawal.user_id)) {
          userWithdrawalsMap.set(withdrawal.user_id, []);
        }
        userWithdrawalsMap.get(withdrawal.user_id).push(withdrawal);
      }

      result.users_affected = userWithdrawalsMap.size;
      result.total_completed_withdrawals = completedWithdrawals.length;

      // Analyze each user
      for (const [userId, withdrawals] of userWithdrawalsMap.entries()) {
        const user = await this.userRepository.findOne({
          where: { id: userId },
          relations: ['wallet'],
        });
        
        if (!user) {
          this.logger.warn(`[ANALYSIS] ❌ User ${userId} not found in database`);
          
          for (const withdrawal of withdrawals) {
            result.details.push({
              user_id: userId,
              user_email: 'USER_NOT_FOUND',
              withdrawal_id: withdrawal.id,
              amount: withdrawal.amount,
              current_balance: 0,
              new_balance: 0,
              withdrawal_date: withdrawal.created_at,
              status: 'error',
              error_message: 'User not found in database',
            });
          }
          continue;
        }

        if (!user.wallet) {
          this.logger.warn(`[ANALYSIS] ❌ Wallet not found for user ${user.email} (${userId})`);
          
          for (const withdrawal of withdrawals) {
            result.details.push({
              user_id: userId,
              user_email: user.email,
              withdrawal_id: withdrawal.id,
              amount: withdrawal.amount,
              current_balance: 0,
              new_balance: 0,
              withdrawal_date: withdrawal.created_at,
              status: 'error',
              error_message: 'Wallet not found for user',
            });
          }
          continue;
        }

        const currentBalance = user.wallet.vendor_balance;

        for (const withdrawal of withdrawals) {
          // NEW: Check if already fixed by looking at wallet_debited_at
          // @ts-ignore - wallet_debited_at might not be in type yet
          if (withdrawal.wallet_debited_at) {
            result.already_fixed_count++;
            result.details.push({
              user_id: userId,
              user_email: user.email,
              withdrawal_id: withdrawal.id,
              amount: withdrawal.amount,
              current_balance: currentBalance,
              new_balance: currentBalance, // No change needed
              withdrawal_date: withdrawal.created_at,
              status: 'already_fixed',
              // @ts-ignore
              wallet_debited_at: withdrawal.wallet_debited_at,
            });
            
            this.logger.log(
              `[ANALYSIS] ℹ️  User ${user.email}: Withdrawal ${withdrawal.id} already fixed (debited at ${withdrawal.wallet_debited_at})`
            );
            continue;
          }

          // Calculate what balance would be after deduction
          const newBalance = currentBalance - withdrawal.amount;
          const hasSufficientBalance = currentBalance >= withdrawal.amount;

          result.details.push({
            user_id: userId,
            user_email: user.email,
            withdrawal_id: withdrawal.id,
            amount: withdrawal.amount,
            current_balance: currentBalance,
            new_balance: newBalance,
            withdrawal_date: withdrawal.created_at,
            status: hasSufficientBalance ? 'success' : 'error',
            error_message: hasSufficientBalance 
              ? undefined 
              : `Insufficient balance: needs ${withdrawal.amount}, has ${currentBalance}`,
          });

          if (hasSufficientBalance) {
            result.total_amount_to_deduct += withdrawal.amount;
          }
        }

        const needsFixing = withdrawals.filter(w => 
          // @ts-ignore
          !w.wallet_debited_at
        ).length;

        if (needsFixing > 0) {
          const totalToDeduct = withdrawals
            // @ts-ignore
            .filter(w => !w.wallet_debited_at)
            .reduce((sum, w) => sum + w.amount, 0);

          this.logger.log(
            `[ANALYSIS] User ${user.email}: ${needsFixing} withdrawals need fixing, ` +
            `Total: ${totalToDeduct}, Current Balance: ${currentBalance}`
          );
        }
      }

      this.logger.log('[ANALYSIS] ========================================');
      this.logger.log(`[ANALYSIS SUMMARY]`);
      this.logger.log(`Total Completed Withdrawals: ${result.total_completed_withdrawals}`);
      this.logger.log(`Already Fixed: ${result.already_fixed_count}`);
      this.logger.log(`Needs Fixing: ${result.total_completed_withdrawals - result.already_fixed_count}`);
      this.logger.log(`Users Affected: ${result.users_affected}`);
      this.logger.log(`Total Amount to Deduct: ${result.total_amount_to_deduct}`);
      this.logger.log(`Can Fix: ${result.details.filter(d => d.status === 'success').length}`);
      this.logger.log(`Errors: ${result.details.filter(d => d.status === 'error').length}`);
      this.logger.log('[ANALYSIS] ========================================');

      return result;
    } catch (error) {
      this.logger.error(`[ANALYSIS ERROR] ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * ACTUAL FIX - Deduct money from vendor wallets for completed withdrawals
   * WARNING: This makes permanent changes to the database
   * Now marks withdrawals with wallet_debited_at timestamp
   */
  async fixCompletedWithdrawals(confirmationCode: string): Promise<FixResult> {
    if (confirmationCode !== 'FIX_COMPLETED_WITHDRAWALS_2024') {
      throw new Error(
        'Invalid confirmation code. Please provide correct confirmation code to proceed.',
      );
    }

    this.logger.log('[FIX START] ========================================');
    this.logger.log('[FIX] Starting to fix completed withdrawals...');
    this.logger.warn('[FIX] ⚠️  THIS WILL MAKE PERMANENT CHANGES TO VENDOR WALLETS');

    const result: FixResult = {
      total_completed_withdrawals: 0,
      users_affected: 0,
      total_amount_to_deduct: 0,
      already_fixed_count: 0,
      details: [],
    };

    try {
      const completedWithdrawals = await this.withdrawalRepository.find({
        where: { status: WithdrawalStatus.COMPLETED },
        order: { created_at: 'ASC' },
      });

      this.logger.log(
        `[FIX] Found ${completedWithdrawals.length} completed withdrawals to process`,
      );

      const userWithdrawalsMap = new Map<string, Withdrawal[]>();

      for (const withdrawal of completedWithdrawals) {
        if (!userWithdrawalsMap.has(withdrawal.user_id)) {
          userWithdrawalsMap.set(withdrawal.user_id, []);
        }
        userWithdrawalsMap.get(withdrawal.user_id).push(withdrawal);
      }

      result.users_affected = userWithdrawalsMap.size;
      result.total_completed_withdrawals = completedWithdrawals.length;

      for (const [userId, withdrawals] of userWithdrawalsMap.entries()) {
        const user = await this.userRepository.findOne({
          where: { id: userId },
          relations: ['wallet'],
        });

        if (!user || !user.wallet) {
          this.logger.warn(`[FIX] ❌ User ${userId} or wallet not found - SKIPPING`);
          continue;
        }

        this.logger.log(`[FIX] Processing user ${user.email} (${withdrawals.length} withdrawals)`);

        const currentBalance = user.wallet.vendor_balance;
        let totalDeducted = 0;

        for (const withdrawal of withdrawals) {
          try {
            // NEW: Skip if already fixed
            // @ts-ignore
            if (withdrawal.wallet_debited_at) {
              result.already_fixed_count++;
              result.details.push({
                user_id: userId,
                user_email: user.email,
                withdrawal_id: withdrawal.id,
                amount: withdrawal.amount,
                current_balance: currentBalance,
                new_balance: currentBalance,
                withdrawal_date: withdrawal.created_at,
                status: 'already_fixed',
                // @ts-ignore
                wallet_debited_at: withdrawal.wallet_debited_at,
              });
              
              this.logger.log(
                `[FIX] ℹ️  Withdrawal ${withdrawal.id} already fixed - SKIPPING`
              );
              continue;
            }

            const amountToDeduct = withdrawal.amount;

            if (user.wallet.vendor_balance < amountToDeduct) {
              this.logger.warn(
                `[FIX] ❌ Insufficient balance for withdrawal ${withdrawal.id}. ` +
                `Balance: ${user.wallet.vendor_balance}, Needed: ${amountToDeduct}`,
              );

              result.details.push({
                user_id: userId,
                user_email: user.email,
                withdrawal_id: withdrawal.id,
                amount: amountToDeduct,
                current_balance: user.wallet.vendor_balance,
                new_balance: user.wallet.vendor_balance,
                withdrawal_date: withdrawal.created_at,
                status: 'error',
                error_message: 'Insufficient balance',
              });
              continue;
            }

            // Debit the wallet
            user.wallet.vendor_balance -= amountToDeduct;
            totalDeducted += amountToDeduct;

            // NEW: Mark withdrawal with timestamp when wallet was debited
            // @ts-ignore
            withdrawal.wallet_debited_at = new Date();
            await this.withdrawalRepository.save(withdrawal);

            this.logger.log(
              `[FIX] ✓ Debited ${amountToDeduct} from ${user.email} for withdrawal ${withdrawal.id} and marked wallet_debited_at`,
            );

            result.details.push({
              user_id: userId,
              user_email: user.email,
              withdrawal_id: withdrawal.id,
              amount: amountToDeduct,
              current_balance: currentBalance,
              new_balance: user.wallet.vendor_balance,
              withdrawal_date: withdrawal.created_at,
              status: 'success',
              // @ts-ignore
              wallet_debited_at: withdrawal.wallet_debited_at,
            });
          } catch (error) {
            this.logger.error(
              `[FIX ERROR] ❌ Failed to process withdrawal ${withdrawal.id}: ${error.message}`,
            );

            result.details.push({
              user_id: userId,
              user_email: user.email,
              withdrawal_id: withdrawal.id,
              amount: withdrawal.amount,
              current_balance: user.wallet.vendor_balance,
              new_balance: user.wallet.vendor_balance,
              withdrawal_date: withdrawal.created_at,
              status: 'error',
              error_message: error.message,
            });
          }
        }

        if (totalDeducted > 0) {
          await this.userRepository.manager.save(user.wallet);
          result.total_amount_to_deduct += totalDeducted;

          this.logger.log(
            `[FIX] ✓ Saved wallet for ${user.email}. Total deducted: ${totalDeducted}. ` +
            `New balance: ${user.wallet.vendor_balance}`,
          );
        }
      }

      this.logger.log('[FIX] ========================================');
      this.logger.log(`[FIX SUMMARY]`);
      this.logger.log(`Total Completed Withdrawals: ${result.total_completed_withdrawals}`);
      this.logger.log(`Already Fixed (Skipped): ${result.already_fixed_count}`);
      this.logger.log(`Newly Fixed: ${result.details.filter(d => d.status === 'success').length}`);
      this.logger.log(`Users Affected: ${result.users_affected}`);
      this.logger.log(`Total Amount Deducted: ${result.total_amount_to_deduct}`);
      this.logger.log(`Failed: ${result.details.filter(d => d.status === 'error').length}`);
      this.logger.log('[FIX] ========================================');

      return result;
    } catch (error) {
      this.logger.error(`[FIX ERROR] ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Fix a specific user's completed withdrawals
   */
  async fixUserCompletedWithdrawals(
    userId: string,
    confirmationCode: string,
  ): Promise<FixResult> {
    if (confirmationCode !== 'FIX_USER_WITHDRAWALS_2024') {
      throw new Error('Invalid confirmation code');
    }

    this.logger.log(`[FIX USER] Fixing withdrawals for user ${userId}`);

    const result: FixResult = {
      total_completed_withdrawals: 0,
      users_affected: 1,
      total_amount_to_deduct: 0,
      already_fixed_count: 0,
      details: [],
    };

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['wallet'],
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.wallet) {
      throw new Error('User wallet not found');
    }

    const completedWithdrawals = await this.withdrawalRepository.find({
      where: { 
        user_id: userId, 
        status: WithdrawalStatus.COMPLETED 
      },
      order: { created_at: 'ASC' },
    });

    result.total_completed_withdrawals = completedWithdrawals.length;

    const currentBalance = user.wallet.vendor_balance;

    for (const withdrawal of completedWithdrawals) {
      try {
        // NEW: Skip if already fixed
        // @ts-ignore
        if (withdrawal.wallet_debited_at) {
          result.already_fixed_count++;
          result.details.push({
            user_id: userId,
            user_email: user.email,
            withdrawal_id: withdrawal.id,
            amount: withdrawal.amount,
            current_balance: currentBalance,
            new_balance: currentBalance,
            withdrawal_date: withdrawal.created_at,
            status: 'already_fixed',
            // @ts-ignore
            wallet_debited_at: withdrawal.wallet_debited_at,
          });
          continue;
        }

        if (user.wallet.vendor_balance < withdrawal.amount) {
          result.details.push({
            user_id: userId,
            user_email: user.email,
            withdrawal_id: withdrawal.id,
            amount: withdrawal.amount,
            current_balance: user.wallet.vendor_balance,
            new_balance: user.wallet.vendor_balance,
            withdrawal_date: withdrawal.created_at,
            status: 'error',
            error_message: 'Insufficient balance',
          });
          continue;
        }

        user.wallet.vendor_balance -= withdrawal.amount;
        result.total_amount_to_deduct += withdrawal.amount;

        // NEW: Mark with timestamp
        // @ts-ignore
        withdrawal.wallet_debited_at = new Date();
        await this.withdrawalRepository.save(withdrawal);

        result.details.push({
          user_id: userId,
          user_email: user.email,
          withdrawal_id: withdrawal.id,
          amount: withdrawal.amount,
          current_balance: currentBalance,
          new_balance: user.wallet.vendor_balance,
          withdrawal_date: withdrawal.created_at,
          status: 'success',
          // @ts-ignore
          wallet_debited_at: withdrawal.wallet_debited_at,
        });
      } catch (error) {
        result.details.push({
          user_id: userId,
          user_email: user.email,
          withdrawal_id: withdrawal.id,
          amount: withdrawal.amount,
          current_balance: user.wallet.vendor_balance,
          new_balance: user.wallet.vendor_balance,
          withdrawal_date: withdrawal.created_at,
          status: 'error',
          error_message: error.message,
        });
      }
    }

    await this.userRepository.manager.save(user.wallet);

    return result;
  }

  /**
   * NEW: Manually mark a withdrawal as already fixed
   * Use this for legacy withdrawals that were fixed before wallet_debited_at was added
   */
  async markWithdrawalAsAlreadyFixed(
    withdrawalId: string,
    confirmationCode: string,
  ): Promise<{ success: boolean; message: string }> {
    if (confirmationCode !== 'MARK_AS_FIXED_2024') {
      throw new Error('Invalid confirmation code');
    }

    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new Error('Withdrawal not found');
    }

    if (withdrawal.status !== WithdrawalStatus.COMPLETED) {
      throw new Error('Withdrawal must be in COMPLETED status');
    }

    // @ts-ignore
    withdrawal.wallet_debited_at = new Date();
    await this.withdrawalRepository.save(withdrawal);

    this.logger.log(
      `[MARK FIXED] ✓ Marked withdrawal ${withdrawalId} as already fixed`
    );

    return {
      success: true,
      message: `Withdrawal ${withdrawalId} marked as already fixed`,
    };
  }
}