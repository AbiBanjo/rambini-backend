import { Injectable, Logger, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdrawal, WithdrawalStatus, User, Currency, Country, Bank } from '../../../entities';
import { WithdrawalRepository } from '../repositories/withdrawal.repository';
import { BankRepository } from '../repositories/bank.repository';
import { RedisService } from '../../../database/redis.service';
import { EmailNotificationService } from '../../notification/services/email-notification.service';
import { NotificationService } from '../../notification/notification.service';
import { WalletPaymentService } from './wallet-payment.service';
import { WithdrawalOtpRequestDto, WithdrawalRequestDto, WithdrawalResponseDto, AdminWithdrawalActionDto, BankCreateDto, BankUpdateDto, BankResponseDto } from '../dto';

export interface OTPData {
  userId: string;
  otpCode: string;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
}

@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 3;

  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Bank)
    private readonly bankRepository: Repository<Bank>,
    private readonly withdrawalRepo: WithdrawalRepository,
    private readonly bankRepo: BankRepository,
    private readonly redisService: RedisService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly notificationService: NotificationService,
    private readonly walletPaymentService: WalletPaymentService,
  ) {}

  async generateWithdrawalOTP(userId: string, amount: number): Promise<{ otpId: string; message: string }> {
    this.logger.log(`Generating withdrawal OTP for user ${userId} with amount ${amount}`);
    // Check if user has any active withdrawal request
    const activeWithdrawal = await this.withdrawalRepo.findActiveByUserId(userId);
    if (activeWithdrawal) {
      throw new BadRequestException('You have a pending or processing withdrawal request. Please wait for it to be completed.');
    }


    this.logger.log(`User ${userId} has no active withdrawal request`);
    // Get user details
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['wallet'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.email) {
      throw new BadRequestException('User email is required for withdrawal OTP');
    }

    // Check if user has sufficient balance
    if (!user.wallet || user.wallet.balance <= amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    this.logger.log(`User ${userId} has sufficient balance`);
    this.logger.log(`Generating OTP for user ${userId}`);
    // Generate OTP
    // const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpCode = "123456";
    const otpId = `withdrawal_otp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    const otpData: OTPData = {
      userId,
      otpCode,
      createdAt: now,
      expiresAt,
      attempts: 0,
    };

    // Store OTP in Redis with expiration
    const key = `withdrawal_otp:${otpId}`;
    await this.redisService.setex(key, this.OTP_EXPIRY_MINUTES * 60, JSON.stringify(otpData));

    // Send OTP via email
    await this.sendWithdrawalOTPEmail(user, otpCode);

    this.logger.log(`Withdrawal OTP generated for user ${userId}: ${otpCode}`);

    return {
      otpId,
      message: 'Withdrawal OTP sent to your email successfully',
    };
  }

  async requestWithdrawal(userId: string, withdrawalData: WithdrawalRequestDto): Promise<WithdrawalResponseDto> {
    // Validate OTP
    const otpValidation = await this.validateWithdrawalOTP(withdrawalData.otp_id, withdrawalData.otp_code);
    if (!otpValidation.isValid) {
      throw new UnauthorizedException(otpValidation.error || 'Invalid OTP');
    }

    // Check if user has any active withdrawal request
    const activeWithdrawal = await this.withdrawalRepo.findActiveByUserId(userId);
    if (activeWithdrawal) {
      throw new BadRequestException('You have a pending or processing withdrawal request. Please wait for it to be completed.');
    }

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

    // Validate country and currency match
    const expectedCurrency = this.getCurrencyForCountry(withdrawalData.country);
    if (withdrawalData.currency !== expectedCurrency) {
      throw new BadRequestException(`Currency ${withdrawalData.currency} is not supported for country ${withdrawalData.country}`);
    }

    // Calculate fee
    // const fee = this.calculateWithdrawalFee(withdrawalData.amount, withdrawalData.currency);
    const totalAmount = withdrawalData.amount 

    // Check if user has sufficient balance
    if (user.wallet.balance < totalAmount) {
      throw new BadRequestException(`Insufficient balance. Required: ${totalAmount} ${withdrawalData.currency}, Available: ${user.wallet.balance} ${user.wallet.currency}`);
    }

    // Create withdrawal request
    const withdrawal = await this.withdrawalRepo.create({
      user_id: userId,
      amount: withdrawalData.amount,
      currency: withdrawalData.currency,
      country: withdrawalData.country,
      fee: 0,
      bank_name: withdrawalData.bank_name,
      account_number: withdrawalData.account_number,
      account_name: withdrawalData.account_name,
      recipient_type: withdrawalData.recipient_type || withdrawalData.recipient_type_uk,
      routing_number: withdrawalData.routing_number,
      account_type: withdrawalData.account_type,
      recipient_address: withdrawalData.recipient_address,
      recipient_city: withdrawalData.recipient_city,
      recipient_state: withdrawalData.recipient_state,
      recipient_zip_code: withdrawalData.recipient_zip_code,
      sort_code: withdrawalData.sort_code,
      is_otp_verified: true,
    });

    // Send notification to admin
    await this.sendWithdrawalRequestEmailToAdmin(withdrawal);

    this.logger.log(`Withdrawal request created: ${withdrawal.id} for user ${userId}`);

    return this.mapToResponseDto(withdrawal);
  }

  async validateWithdrawalOTP(otpId: string, otpCode: string): Promise<{ isValid: boolean; error?: string }> {
    const key = `withdrawal_otp:${otpId}`;
    const otpDataString = await this.redisService.get(key);

    if (!otpDataString) {
      return { isValid: false, error: 'OTP expired or invalid' };
    }

    const otpData: OTPData = JSON.parse(otpDataString);

    // Check if OTP is expired
    if (new Date() > new Date(otpData.expiresAt)) {
      await this.redisService.del(key);
      return { isValid: false, error: 'OTP expired' };
    }

    // Check attempts
    if (otpData.attempts >= this.MAX_ATTEMPTS) {
      await this.redisService.del(key);
      return { isValid: false, error: 'Maximum OTP attempts exceeded' };
    }

    // Verify OTP code
    if (otpCode !== otpData.otpCode) {
      otpData.attempts += 1;
      await this.redisService.setex(key, this.OTP_EXPIRY_MINUTES * 60, JSON.stringify(otpData));
      return { isValid: false, error: 'Invalid OTP code' };
    }

    // OTP is valid, clean up
    await this.redisService.del(key);
    return { isValid: true };
  }

  async getWithdrawalsByUser(userId: string): Promise<WithdrawalResponseDto[]> {
    const withdrawals = await this.withdrawalRepo.findByUserId(userId);
    return withdrawals.map(withdrawal => this.mapToResponseDto(withdrawal));
  }

  async getWithdrawalById(id: string): Promise<WithdrawalResponseDto> {
    const withdrawal = await this.withdrawalRepo.findById(id);
    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }
    return this.mapToResponseDto(withdrawal);
  }

  // Admin methods
  async getAllPendingWithdrawals(): Promise<WithdrawalResponseDto[]> {
    const withdrawals = await this.withdrawalRepo.findAllPending();
    return withdrawals.map(withdrawal => this.mapToResponseDto(withdrawal));
  }

  async getAllProcessingWithdrawals(): Promise<WithdrawalResponseDto[]> {
    const withdrawals = await this.withdrawalRepo.findAllProcessing();
    return withdrawals.map(withdrawal => this.mapToResponseDto(withdrawal));
  }

  async markWithdrawalAsDone(
    withdrawalId: string, 
    adminId: string, 
    actionData: AdminWithdrawalActionDto
  ): Promise<WithdrawalResponseDto> {
    const withdrawal = await this.withdrawalRepo.findById(withdrawalId);
    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    if (withdrawal.is_final_status) {
      throw new BadRequestException('Withdrawal is already in final status');
    }

    // Update withdrawal status
    await this.withdrawalRepo.updateStatus(
      withdrawalId,
      WithdrawalStatus.COMPLETED,
      adminId,
      actionData.notes,
      actionData.transaction_reference
    );

    // Deduct amount from user's wallet
    await this.walletPaymentService.debitWalletForWithdrawal(
      withdrawal.user_id,
      withdrawal.amount + withdrawal.fee,
      `Withdrawal ${withdrawal.id}`
    );

    // Send notification to user
    await this.sendWithdrawalCompletedEmail(withdrawal);

    this.logger.log(`Withdrawal ${withdrawalId} marked as completed by admin ${adminId}`);

    return this.mapToResponseDto(await this.withdrawalRepo.findById(withdrawalId));
  }

  async markWithdrawalAsFailed(
    withdrawalId: string, 
    adminId: string, 
    actionData: AdminWithdrawalActionDto
  ): Promise<WithdrawalResponseDto> {
    const withdrawal = await this.withdrawalRepo.findById(withdrawalId);
    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    if (withdrawal.is_final_status) {
      throw new BadRequestException('Withdrawal is already in final status');
    }

    // Update withdrawal status
    await this.withdrawalRepo.updateStatus(
      withdrawalId,
      WithdrawalStatus.FAILED,
      adminId,
      actionData.notes
    );

    // Send notification to user
    await this.sendWithdrawalFailedEmail(withdrawal);

    this.logger.log(`Withdrawal ${withdrawalId} marked as failed by admin ${adminId}`);

    return this.mapToResponseDto(await this.withdrawalRepo.findById(withdrawalId));
  }

  async markWithdrawalAsRejected(
    withdrawalId: string, 
    adminId: string, 
    actionData: AdminWithdrawalActionDto
  ): Promise<WithdrawalResponseDto> {
    const withdrawal = await this.withdrawalRepo.findById(withdrawalId);
    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    if (withdrawal.is_final_status) {
      throw new BadRequestException('Withdrawal is already in final status');
    }

    // Update withdrawal status
    await this.withdrawalRepo.updateStatus(
      withdrawalId,
      WithdrawalStatus.REJECTED,
      adminId,
      actionData.notes
    );

    // Send notification to user
    await this.sendWithdrawalRejectedEmail(withdrawal);

    this.logger.log(`Withdrawal ${withdrawalId} marked as rejected by admin ${adminId}`);

    return this.mapToResponseDto(await this.withdrawalRepo.findById(withdrawalId));
  }

  // Bank management methods
  async createBank(userId: string, bankData: BankCreateDto): Promise<BankResponseDto> {
    this.logger.log(`Creating bank for user ${userId}`);

    // Check if bank with same account number already exists for this user
    const existingBank = await this.bankRepo.findByAccountNumber(userId, bankData.account_number);
    if (existingBank) {
      throw new BadRequestException('Bank account with this account number already exists');
    }

    // Check if bank with same name and bank name already exists
    const existingBankByName = await this.bankRepo.findByBankNameAndAccountNumber(
      userId, 
      bankData.bank_name, 
      bankData.account_number
    );
    if (existingBankByName) {
      throw new BadRequestException('Bank account with this name and bank already exists');
    }

    const bank = await this.bankRepo.create({
      user_id: userId,
      name: bankData.name,
      bank_name: bankData.bank_name,
      account_number: bankData.account_number,
    });

    this.logger.log(`Bank created: ${bank.id} for user ${userId}`);
    return this.mapBankToResponseDto(bank);
  }

  async getUserBanks(userId: string): Promise<BankResponseDto[]> {
    this.logger.log(`Getting banks for user ${userId}`);
    const banks = await this.bankRepo.findByUserId(userId);
    return banks.map(bank => this.mapBankToResponseDto(bank));
  }

  async getBankById(userId: string, bankId: string): Promise<BankResponseDto> {
    this.logger.log(`Getting bank ${bankId} for user ${userId}`);
    const bank = await this.bankRepo.findByUserIdAndId(userId, bankId);
    if (!bank) {
      throw new NotFoundException('Bank not found');
    }
    return this.mapBankToResponseDto(bank);
  }

  async updateBank(userId: string, bankId: string, bankData: BankUpdateDto): Promise<BankResponseDto> {
    this.logger.log(`Updating bank ${bankId} for user ${userId}`);

    const existingBank = await this.bankRepo.findByUserIdAndId(userId, bankId);
    if (!existingBank) {
      throw new NotFoundException('Bank not found');
    }

    // Check if updating account number would create a duplicate
    if (bankData.account_number && bankData.account_number !== existingBank.account_number) {
      const duplicateBank = await this.bankRepo.findByAccountNumber(userId, bankData.account_number);
      if (duplicateBank && duplicateBank.id !== bankId) {
        throw new BadRequestException('Bank account with this account number already exists');
      }
    }

    // Check if updating bank name and account number would create a duplicate
    if (bankData.bank_name && bankData.account_number) {
      const duplicateBank = await this.bankRepo.findByBankNameAndAccountNumber(
        userId, 
        bankData.bank_name, 
        bankData.account_number
      );
      if (duplicateBank && duplicateBank.id !== bankId) {
        throw new BadRequestException('Bank account with this name and bank already exists');
      }
    }

    const updatedBank = await this.bankRepo.update(bankId, bankData);
    this.logger.log(`Bank updated: ${bankId} for user ${userId}`);
    return this.mapBankToResponseDto(updatedBank);
  }

  async deleteBank(userId: string, bankId: string): Promise<{ message: string }> {
    this.logger.log(`Deleting bank ${bankId} for user ${userId}`);

    const existingBank = await this.bankRepo.findByUserIdAndId(userId, bankId);
    if (!existingBank) {
      throw new NotFoundException('Bank not found');
    }

    const deleted = await this.bankRepo.delete(bankId);
    if (!deleted) {
      throw new BadRequestException('Failed to delete bank');
    }

    this.logger.log(`Bank deleted: ${bankId} for user ${userId}`);
    return { message: 'Bank deleted successfully' };
  }

  private async sendWithdrawalOTPEmail(user: User, otpCode: string): Promise<void> {
    try {
      const notification = await this.notificationService.createNotification(
        user.id,
        'WITHDRAWAL_OTP' as any,
        'Withdrawal OTP',
        `Your withdrawal verification code is: ${otpCode}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`,
        {
          data: { otpCode, expiryMinutes: this.OTP_EXPIRY_MINUTES },
          deliveryMethod: 'EMAIL' as any,
        }
      );

      await this.emailNotificationService.sendEmailNotification(notification, user, {
        otpCode,
        expiryMinutes: this.OTP_EXPIRY_MINUTES,
      });
    } catch (error) {
      this.logger.error(`Failed to send withdrawal OTP email: ${error.message}`, error.stack);
    }
  }

  private async sendWithdrawalRequestEmailToAdmin(withdrawal: Withdrawal): Promise<void> {
    try {
      // Create a notification for admin
      const adminNotification = await this.notificationService.createNotification(
        'admin', // This would be the admin user ID
        'ADMIN_WITHDRAWAL_REQUEST' as any,
        'New Withdrawal Request',
        `New withdrawal request from ${withdrawal.user.full_name} for ${withdrawal.formatted_amount}`,
        {
          data: {
            withdrawalId: withdrawal.id,
            userName: withdrawal.user.full_name,
            userEmail: withdrawal.user.email,
            amount: withdrawal.amount,
            currency: withdrawal.currency,
            country: withdrawal.country,
            bankName: withdrawal.bank_name,
            accountNumber: withdrawal.account_number,
            date: withdrawal.created_at.toISOString(),
            baseUrl: process.env.APP_URL || 'http://localhost:3000',
          },
          deliveryMethod: 'EMAIL' as any,
        }
      );

      // Create a mock admin user for email sending
      const adminUser = {
        id: 'admin',
        email: process.env.ADMIN_EMAIL || 'admin@rambini.com',
        first_name: 'Admin',
        last_name: 'User',
        full_name: 'Admin User',
      } as User;

      await this.emailNotificationService.sendEmailNotification(adminNotification, adminUser, {
        withdrawalId: withdrawal.id,
        userName: withdrawal.user.full_name,
        userEmail: withdrawal.user.email,
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        country: withdrawal.country,
        bankName: withdrawal.bank_name,
        accountNumber: withdrawal.account_number,
        date: withdrawal.created_at.toISOString(),
        baseUrl: process.env.APP_URL || 'http://localhost:3000',
      });

      this.logger.log(`Withdrawal request notification sent to admin for withdrawal: ${withdrawal.id}`);
    } catch (error) {
      this.logger.error(`Failed to send withdrawal request email to admin: ${error.message}`, error.stack);
    }
  }

  private async sendWithdrawalCompletedEmail(withdrawal: Withdrawal): Promise<void> {
    try {
      const notification = await this.notificationService.createNotification(
        withdrawal.user_id,
        'WITHDRAWAL_COMPLETED' as any,
        'Withdrawal Completed',
        `Your withdrawal of ${withdrawal.formatted_amount} has been completed successfully.`,
        {
          data: { 
            amount: withdrawal.amount,
            currency: withdrawal.currency,
            transactionRef: withdrawal.transaction_reference,
          },
          deliveryMethod: 'EMAIL' as any,
        }
      );

      await this.emailNotificationService.sendEmailNotification(notification, withdrawal.user);
    } catch (error) {
      this.logger.error(`Failed to send withdrawal completed email: ${error.message}`, error.stack);
    }
  }

  private async sendWithdrawalFailedEmail(withdrawal: Withdrawal): Promise<void> {
    try {
      const notification = await this.notificationService.createNotification(
        withdrawal.user_id,
        'WITHDRAWAL_FAILED' as any,
        'Withdrawal Failed',
        `Your withdrawal of ${withdrawal.formatted_amount} has failed. ${withdrawal.admin_notes || ''}`,
        {
          data: { 
            amount: withdrawal.amount,
            currency: withdrawal.currency,
            reason: withdrawal.admin_notes,
          },
          deliveryMethod: 'EMAIL' as any,
        }
      );

      await this.emailNotificationService.sendEmailNotification(notification, withdrawal.user);
    } catch (error) {
      this.logger.error(`Failed to send withdrawal failed email: ${error.message}`, error.stack);
    }
  }

  private async sendWithdrawalRejectedEmail(withdrawal: Withdrawal): Promise<void> {
    try {
      const notification = await this.notificationService.createNotification(
        withdrawal.user_id,
        'WITHDRAWAL_REJECTED' as any,
        'Withdrawal Rejected',
        `Your withdrawal of ${withdrawal.formatted_amount} has been rejected. ${withdrawal.admin_notes || ''}`,
        {
          data: { 
            amount: withdrawal.amount,
            currency: withdrawal.currency,
            reason: withdrawal.admin_notes,
          },
          deliveryMethod: 'EMAIL' as any,
        }
      );

      await this.emailNotificationService.sendEmailNotification(notification, withdrawal.user);
    } catch (error) {
      this.logger.error(`Failed to send withdrawal rejected email: ${error.message}`, error.stack);
    }
  }

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

  private calculateWithdrawalFee(amount: number, currency: Currency): number {
    // Simple fee calculation - in real implementation, this would be more complex
    switch (currency) {
      case Currency.NGN:
        return Math.min(amount * 0.01, 100); // 1% or max 100 NGN
      case Currency.USD:
        return Math.min(amount * 0.01, 5); // 1% or max $5
      case Currency.GBP:
        return Math.min(amount * 0.01, 3); // 1% or max £3
      default:
        return amount * 0.01; // 1% default
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

  private mapBankToResponseDto(bank: Bank): BankResponseDto {
    return {
      id: bank.id,
      user_id: bank.user_id,
      name: bank.name,
      bank_name: bank.bank_name,
      account_number: bank.masked_account_number,
      display_name: bank.display_name,
      created_at: bank.created_at,
      updated_at: bank.updated_at,
    };
  }
}
