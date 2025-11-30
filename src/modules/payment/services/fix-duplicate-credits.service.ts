// File: src/modules/payment/services/fix-duplicate-credits.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet, Transaction, TransactionType, TransactionStatus } from 'src/entities';

@Injectable()
export class FixDuplicateCreditsService {
  private readonly logger = new Logger(FixDuplicateCreditsService.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async fixDuplicateCredits(vendorUserId: string): Promise<{
    duplicatesFound: number;
    amountToDeduct: number;
    fixedBalance: number;
  }> {
    this.logger.log(`Fixing duplicate credits for vendor user: ${vendorUserId}`);

    // Get vendor wallet
    const wallet = await this.walletRepository.findOne({
      where: { user_id: vendorUserId },
    });

    if (!wallet) {
      throw new Error('Vendor wallet not found');
    }

    // Use vendor_balance for vendors, regular balance for customers
    const currentBalance = wallet.vendor_balance || wallet.balance;
    this.logger.log(`Current wallet balance: ${currentBalance} (vendor_balance: ${wallet.vendor_balance}, balance: ${wallet.balance})`);

    // Find duplicate credit transactions
    const duplicateTransactions = await this.transactionRepository
      .createQueryBuilder('t')
      .select('t.reference_id', 'reference_id')
      .addSelect('t.amount', 'amount')
      .addSelect('COUNT(*)', 'count')
      .where('t.wallet_id = :walletId', { walletId: wallet.id })
      .andWhere('t.transaction_type = :type', { type: TransactionType.CREDIT })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .groupBy('t.reference_id')
      .addGroupBy('t.amount')
      .having('COUNT(*) > 1')
      .getRawMany();

    this.logger.log(`Found ${duplicateTransactions.length} duplicate payment references`);

    let totalDuplicateAmount = 0;
    const duplicatesToRemove: string[] = [];

    for (const dup of duplicateTransactions) {
      const duplicateCount = parseInt(dup.count) - 1; // Keep one, remove others
      const amountPerDuplicate = parseFloat(dup.amount);
      
      this.logger.log(
        `Reference ${dup.reference_id}: ${dup.count} credits of ${amountPerDuplicate} each. Removing ${duplicateCount} duplicates.`
      );

      totalDuplicateAmount += amountPerDuplicate * duplicateCount;

      // Find the duplicate transactions (keep the first one, mark others)
      const transactions = await this.transactionRepository.find({
        where: {
          wallet_id: wallet.id,
          reference_id: dup.reference_id,
          transaction_type: TransactionType.CREDIT,
          status: TransactionStatus.COMPLETED,
        },
        order: { created_at: 'ASC' },
      });

      // Keep the first, mark the rest as duplicates
      for (let i = 1; i < transactions.length; i++) {
        duplicatesToRemove.push(transactions[i].id);
      }
    }

    this.logger.log(`Total duplicate amount to deduct: ${totalDuplicateAmount}`);

    // Create a correction transaction
    if (totalDuplicateAmount > 0) {
      const newBalance = currentBalance - totalDuplicateAmount;
      
      const correctionTransaction = this.transactionRepository.create({
        wallet_id: wallet.id,
        transaction_type: TransactionType.DEBIT,
        amount: totalDuplicateAmount,
        balance_before: currentBalance,
        balance_after: newBalance,
        description: `Balance correction - removing duplicate credits from ${duplicateTransactions.length} orders`,
        reference_id: `CORRECTION_${Date.now()}`,
        status: TransactionStatus.COMPLETED,
        processed_at: new Date(),
        metadata: {
          correction_type: 'duplicate_credit_removal',
          duplicate_count: duplicateTransactions.length,
          transactions_removed: duplicatesToRemove,
          field_corrected: wallet.vendor_balance ? 'vendor_balance' : 'balance',
        },
      });

      await this.transactionRepository.save(correctionTransaction);

      // Update the correct balance field
      if (wallet.vendor_balance) {
        wallet.vendor_balance = newBalance;
      } else {
        wallet.balance = newBalance;
      }
      
      if (newBalance < 0) {
        this.logger.warn(`⚠️ Wallet balance would be negative: ${newBalance}`);
      }
      await this.walletRepository.save(wallet);

      // Mark duplicate transactions as reversed
      for (const txId of duplicatesToRemove) {
        const transaction = await this.transactionRepository.findOne({
          where: { id: txId },
        });
        
        if (transaction) {
          transaction.reversed_at = new Date();
          transaction.reversal_reason = 'Duplicate credit detected and corrected';
          transaction.metadata = {
            ...transaction.metadata,
            correction_applied: true,
          };
          await this.transactionRepository.save(transaction);
        }
      }

      this.logger.log(`✅ Wallet balance corrected: ${newBalance}`);
    }

    return {
      duplicatesFound: duplicateTransactions.length,
      amountToDeduct: totalDuplicateAmount,
      fixedBalance: currentBalance - totalDuplicateAmount,
    };
  }

  // Method to check for duplicates without fixing
  async checkForDuplicates(vendorUserId: string): Promise<any[]> {
    const wallet = await this.walletRepository.findOne({
      where: { user_id: vendorUserId },
    });

    if (!wallet) {
      throw new Error('Vendor wallet not found');
    }

    const duplicateTransactions = await this.transactionRepository
      .createQueryBuilder('t')
      .select('t.reference_id', 'reference_id')
      .addSelect('t.amount', 'amount')
      .addSelect('t.description', 'description')
      .addSelect('MIN(t.created_at)', 'first_credit_at')
      .addSelect('MAX(t.created_at)', 'last_credit_at')
      .addSelect('COUNT(*)', 'count')
      .where('t.wallet_id = :walletId', { walletId: wallet.id })
      .andWhere('t.transaction_type = :type', { type: TransactionType.CREDIT })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .groupBy('t.reference_id')
      .addGroupBy('t.amount')
      .addGroupBy('t.description')
      .having('COUNT(*) > 1')
      .getRawMany();

    return duplicateTransactions;
  }

  // Verify detailed transaction history for a specific reference
  async verifyDuplicateDetails(vendorUserId: string, referenceId: string): Promise<any> {
    const wallet = await this.walletRepository.findOne({
      where: { user_id: vendorUserId },
    });

    if (!wallet) {
      throw new Error('Vendor wallet not found');
    }

    // Get all transactions with this reference
    const transactions = await this.transactionRepository.find({
      where: {
        wallet_id: wallet.id,
        reference_id: referenceId,
        transaction_type: TransactionType.CREDIT,
        status: TransactionStatus.COMPLETED,
      },
      order: { created_at: 'ASC' },
    });

    if (transactions.length === 0) {
      return {
        referenceId,
        message: 'No transactions found with this reference',
      };
    }

    const firstTransaction = transactions[0];
    const duplicates = transactions.slice(1);

    return {
      referenceId,
      totalCredits: transactions.length,
      isDuplicate: transactions.length > 1,
      amount: firstTransaction.amount,
      description: firstTransaction.description,
      correctCredit: {
        id: firstTransaction.id,
        amount: firstTransaction.amount,
        created_at: firstTransaction.created_at,
        balance_before: firstTransaction.balance_before,
        balance_after: firstTransaction.balance_after,
        status: 'WILL_BE_KEPT',
      },
      duplicateCredits: duplicates.map((dup, index) => ({
        id: dup.id,
        amount: dup.amount,
        created_at: dup.created_at,
        balance_before: dup.balance_before,
        balance_after: dup.balance_after,
        status: 'WILL_BE_REMOVED',
        duplicateNumber: index + 2,
      })),
      summary: {
        correctAmount: firstTransaction.amount,
        duplicateAmount: duplicates.reduce((sum, d) => sum + Number(d.amount), 0),
        totalOverpaid: duplicates.reduce((sum, d) => sum + Number(d.amount), 0),
        duplicateCount: duplicates.length,
      },
    };
  }

  // Preview what will be fixed
  async previewFix(vendorUserId: string): Promise<any> {
    const wallet = await this.walletRepository.findOne({
      where: { user_id: vendorUserId },
    });

    if (!wallet) {
      throw new Error('Vendor wallet not found');
    }

    // Use vendor_balance for vendors, regular balance for customers
    const currentBalance = wallet.vendor_balance || wallet.balance;

    const duplicateRefs = await this.checkForDuplicates(vendorUserId);

    const details = await Promise.all(
      duplicateRefs.map(dup => 
        this.verifyDuplicateDetails(vendorUserId, dup.reference_id)
      )
    );

    const totalDuplicateAmount = details.reduce(
      (sum, detail) => sum + detail.summary.totalOverpaid,
      0
    );

    const totalDuplicates = details.reduce(
      (sum, detail) => sum + detail.summary.duplicateCount,
      0
    );

    const balanceAfterFix = currentBalance - totalDuplicateAmount;

    return {
      vendorUserId,
      currentWalletBalance: currentBalance,
      balanceField: wallet.vendor_balance ? 'vendor_balance' : 'balance',
      balanceAfterFix,
      totalPaymentReferences: duplicateRefs.length,
      totalDuplicateTransactions: totalDuplicates,
      totalAmountToDeduct: totalDuplicateAmount,
      details,
      warning: balanceAfterFix < 0 
        ? '⚠️ WARNING: Balance will be negative after fix!' 
        : null,
    };
  }
}