import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Withdrawal,
  WithdrawalStatus,
  User,
  Currency,
  Country,
} from '../../../../entities';
import { WithdrawalRepository } from '../../repositories/withdrawal.repository';
import { WithdrawalEmailNotificationService } from '../../../notification/services/withdrawal-email-notification.service';
import { WalletPaymentService } from './../wallet-payment.service';
import { WithdrawalOtpService } from './withdrawal-otp.service';
import { WithdrawalAdminService } from './withdrawal-admin.service';
import { WithdrawalBankService } from './withdrawal-bank.service';
import {
  WithdrawalOtpRequestDto,
  WithdrawalRequestDto,
  WithdrawalResponseDto,
  AdminWithdrawalActionDto,
  BankCreateDto,
  BankUpdateDto,
  BankResponseDto,
} from '../../dto';

@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);

  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly withdrawalRepo: WithdrawalRepository,
    private readonly withdrawalEmailService: WithdrawalEmailNotificationService,
    private readonly walletPaymentService: WalletPaymentService,
    private readonly otpService: WithdrawalOtpService,
    private readonly adminService: WithdrawalAdminService,
    private readonly bankService: WithdrawalBankService,
  ) {}

  // ==================== OTP METHODS ====================
  
  /**
   * Generate OTP for withdrawal request
   */
  async generateWithdrawalOTP(
    userId: string,
    amount: number,
  ): Promise<{ otpId: string; message: string }> {
    return await this.otpService.generateWithdrawalOTP(userId, amount);
  }

  /**
   * Validate withdrawal OTP
   */
  async validateWithdrawalOTP(
    otpId: string,
    otpCode: string,
  ): Promise<{ isValid: boolean; error?: string }> {
    return await this.otpService.validateWithdrawalOTP(otpId, otpCode);
  }

  // ==================== WITHDRAWAL REQUEST METHODS ====================

  /**
   * Request withdrawal - Debit wallet immediately
   */
  async requestWithdrawal(
    userId: string,
    withdrawalData: WithdrawalRequestDto,
  ): Promise<WithdrawalResponseDto> {
    this.logger.log(`[WITHDRAWAL START] ========================================`);
    this.logger.log(
      `[WITHDRAWAL START] User ${userId} requesting withdrawal of ${withdrawalData.amount} ${withdrawalData.currency}`,
    );

    // Validate OTP
    const otpValidation = await this.validateWithdrawalOTP(
      withdrawalData.otp_id,
      withdrawalData.otp_code,
    );
    if (!otpValidation.isValid) {
      throw new ForbiddenException(otpValidation.error || 'Invalid OTP');
    }

    this.logger.log(`[WITHDRAWAL OTP] ✓ OTP validated successfully`);

    // Check if user has any active withdrawal request
    const activeWithdrawal = await this.withdrawalRepo.findActiveByUserId(
      userId,
    );
    if (activeWithdrawal) {
      throw new BadRequestException(
        'You have a pending or processing withdrawal request. Please wait for it to be completed.',
      );
    }

    this.logger.log(
      `[WITHDRAWAL CHECK] ✓ No active withdrawal found for user ${userId}`,
    );

    // Get user details
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['wallet'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.wallet) {
      throw new BadRequestException('User wallet not found');
    }

    this.logger.log(
      `[WITHDRAWAL USER] User found: ${user.email}, Wallet balance: ${user.wallet.vendor_balance}`,
    );

    // Validate country and currency match
    const expectedCurrency = this.getCurrencyForCountry(withdrawalData.country);
    if (withdrawalData.currency !== expectedCurrency) {
      throw new BadRequestException(
        `Currency ${withdrawalData.currency} is not supported for country ${withdrawalData.country}`,
      );
    }

    const totalAmount = withdrawalData.amount;

    // Check if user has sufficient balance
    if (user.wallet.vendor_balance < totalAmount) {
      throw new BadRequestException(
        `Insufficient balance. Required: ${totalAmount} ${withdrawalData.currency}, Available: ${user.wallet.vendor_balance} ${user.wallet.currency}`,
      );
    }

    this.logger.log(
      `[WITHDRAWAL BALANCE] ✓ Sufficient balance available: ${user.wallet.vendor_balance}`,
    );

    // Debit wallet IMMEDIATELY when withdrawal is requested
    this.logger.log(
      `[WALLET DEBIT] Attempting to debit ${totalAmount} from user ${userId} wallet`,
    );

    try {
      await this.walletPaymentService.debitWalletForWithdrawal(
        userId,
        totalAmount,
        `Withdrawal request - Processing`,
      );

      this.logger.log(
        `[WALLET DEBIT] ✓ Successfully debited ${totalAmount} from user ${userId} wallet`,
      );
    } catch (error) {
      this.logger.error(
        `[WALLET DEBIT ERROR] ❌ Failed to debit wallet: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to process withdrawal: ${error.message}`,
      );
    }

    // Create withdrawal request with PROCESSING status
    this.logger.log(
      `[WITHDRAWAL CREATE] Creating withdrawal record with PROCESSING status`,
    );

    const withdrawal = await this.withdrawalRepo.create({
      user_id: userId,
      amount: withdrawalData.amount,
      currency: withdrawalData.currency,
      country: withdrawalData.country,
      fee: 0,
      bank_name: withdrawalData.bank_name,
      account_number: withdrawalData.account_number,
      account_name: withdrawalData.account_name,
      recipient_type:
        withdrawalData.recipient_type || withdrawalData.recipient_type_uk,
      routing_number: withdrawalData.routing_number,
      account_type: withdrawalData.account_type,
      recipient_address: withdrawalData.recipient_address,
      recipient_city: withdrawalData.recipient_city,
      recipient_state: withdrawalData.recipient_state,
      recipient_zip_code: withdrawalData.recipient_zip_code,
      sort_code: withdrawalData.sort_code,
      is_otp_verified: true,
      status: WithdrawalStatus.PROCESSING,
    });

    this.logger.log(
      `[WITHDRAWAL CREATED] ✓ Withdrawal ${withdrawal.id} created with PROCESSING status`,
    );

    // Send notification to admin
    try {
      await this.withdrawalEmailService.sendWithdrawalRequestToAdmin(
        withdrawal,
      );
      this.logger.log(
        `[WITHDRAWAL EMAIL] ✓ Admin notification sent for withdrawal ${withdrawal.id}`,
      );
    } catch (error) {
      this.logger.error(
        `[WITHDRAWAL EMAIL ERROR] ⚠️ Failed to send admin notification: ${error.message}`,
      );
    }

    this.logger.log(`[WITHDRAWAL SUMMARY] ========================================`);
    this.logger.log(`[WITHDRAWAL SUMMARY] Withdrawal Created Successfully`);
    this.logger.log(`[WITHDRAWAL SUMMARY] Withdrawal ID: ${withdrawal.id}`);
    this.logger.log(`[WITHDRAWAL SUMMARY] User ID: ${userId}`);
    this.logger.log(`[WITHDRAWAL SUMMARY] Amount: ${totalAmount} ${withdrawalData.currency}`);
    this.logger.log(`[WITHDRAWAL SUMMARY] Status: PROCESSING`);
    this.logger.log(`[WITHDRAWAL SUMMARY] Wallet Debited: YES`);
    this.logger.log(`[WITHDRAWAL SUMMARY] Admin Notified: YES`);
    this.logger.log(`[WITHDRAWAL SUMMARY] ========================================`);

    return this.mapToResponseDto(withdrawal);
  }

  // ==================== QUERY METHODS ====================

  /**
   * Get withdrawals by user
   */
  async getWithdrawalsByUser(userId: string): Promise<WithdrawalResponseDto[]> {
    const withdrawals = await this.withdrawalRepo.findByUserId(userId);
    return withdrawals.map(withdrawal => this.mapToResponseDto(withdrawal));
  }

  /**
   * Get withdrawal by ID
   */
  async getWithdrawalById(id: string): Promise<WithdrawalResponseDto> {
    const withdrawal = await this.withdrawalRepo.findById(id);
    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }
    return this.mapToResponseDto(withdrawal);
  }

  // ==================== ADMIN METHODS ====================

  /**
   * Get all withdrawals
   */
  async getAllWithdrawals(): Promise<WithdrawalResponseDto[]> {
    const withdrawals = await this.adminService.getAllWithdrawals();
    return withdrawals.map(withdrawal => this.mapToResponseDto(withdrawal));
  }

  /**
   * Get withdrawals by status
   */
  async getWithdrawalsByStatus(
    status: WithdrawalStatus,
  ): Promise<WithdrawalResponseDto[]> {
    const withdrawals = await this.adminService.getWithdrawalsByStatus(status);
    return withdrawals.map(withdrawal => this.mapToResponseDto(withdrawal));
  }

  /**
   * Get withdrawal statistics
   */
  async getWithdrawalStats() {
    return await this.adminService.getWithdrawalStats();
  }

  /**
   * Get all pending withdrawals
   */
  async getAllPendingWithdrawals(): Promise<WithdrawalResponseDto[]> {
    const withdrawals = await this.adminService.getAllPendingWithdrawals();
    return withdrawals.map(withdrawal => this.mapToResponseDto(withdrawal));
  }

  /**
   * Get all processing withdrawals
   */
  async getAllProcessingWithdrawals(): Promise<WithdrawalResponseDto[]> {
    const withdrawals = await this.adminService.getAllProcessingWithdrawals();
    return withdrawals.map(withdrawal => this.mapToResponseDto(withdrawal));
  }

  /**
   * Mark withdrawal as completed
   */
  async markWithdrawalAsDone(
    withdrawalId: string,
    adminId: string,
    actionData: AdminWithdrawalActionDto,
  ): Promise<WithdrawalResponseDto> {
    const withdrawal = await this.adminService.markWithdrawalAsDone(
      withdrawalId,
      adminId,
      actionData,
    );
    return this.mapToResponseDto(withdrawal);
  }

  /**
   * Mark withdrawal as failed and refund money
   */
  async markWithdrawalAsFailed(
    withdrawalId: string,
    adminId: string,
    actionData: AdminWithdrawalActionDto,
  ): Promise<WithdrawalResponseDto> {
    const withdrawal = await this.adminService.markWithdrawalAsFailed(
      withdrawalId,
      adminId,
      actionData,
    );
    return this.mapToResponseDto(withdrawal);
  }

  /**
   * Mark withdrawal as rejected and refund money
   */
  async markWithdrawalAsRejected(
    withdrawalId: string,
    adminId: string,
    actionData: AdminWithdrawalActionDto,
  ): Promise<WithdrawalResponseDto> {
    const withdrawal = await this.adminService.markWithdrawalAsRejected(
      withdrawalId,
      adminId,
      actionData,
    );
    return this.mapToResponseDto(withdrawal);
  }

  // ==================== BANK MANAGEMENT METHODS ====================

  async createBank(
    userId: string,
    bankData: BankCreateDto,
  ): Promise<BankResponseDto> {
    const bank = await this.bankService.createBank(userId, bankData);
    return this.bankService.mapBankToResponseDto(bank);
  }

  async getUserBanks(userId: string): Promise<BankResponseDto[]> {
    const banks = await this.bankService.getUserBanks(userId);
    return banks.map(bank => this.bankService.mapBankToResponseDto(bank));
  }

  async getBankById(userId: string, bankId: string): Promise<BankResponseDto> {
    const bank = await this.bankService.getBankById(userId, bankId);
    return this.bankService.mapBankToResponseDto(bank);
  }

  async updateBank(
    userId: string,
    bankId: string,
    bankData: BankUpdateDto,
  ): Promise<BankResponseDto> {
    const bank = await this.bankService.updateBank(userId, bankId, bankData);
    return this.bankService.mapBankToResponseDto(bank);
  }

  async deleteBank(
    userId: string,
    bankId: string,
  ): Promise<{ message: string }> {
    return await this.bankService.deleteBank(userId, bankId);
  }

  // ==================== HELPER METHODS ====================

  private getCurrencyForCountry(country: Country): Currency {
    switch (country) {
      case Country.NIGERIA:
        return Currency.NGN;
      case Country.UNITED_STATES:
        return Currency.USD;
      case Country.UNITED_KINGDOM:
        return Currency.GBP;
      default:
        throw new BadRequestException(`Unsupported country: ${country}`);
    }
  }

  private mapToResponseDto(withdrawal: Withdrawal): WithdrawalResponseDto {
    return {
      id: withdrawal.id,
      user_id: withdrawal.user_id,
      amount: withdrawal.amount,
      currency: withdrawal.currency,
      country: withdrawal.country,
      status: withdrawal.status,
      fee: withdrawal.fee,
      net_amount: withdrawal.net_amount,
      bank_name: withdrawal.bank_name,
      account_number: this.maskAccountNumber(withdrawal.account_number),
      is_otp_verified: withdrawal.is_otp_verified,
      created_at: withdrawal.created_at,
      processed_at: withdrawal.processed_at,
      admin_notes: withdrawal.admin_notes,
      transaction_reference: withdrawal.transaction_reference,
    };
  }

  private maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) {
      return '*'.repeat(accountNumber.length);
    }
    return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
  }
}