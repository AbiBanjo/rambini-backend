import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
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
  Bank,
} from '../../../entities';
import { WithdrawalRepository } from '../repositories/withdrawal.repository';
import { BankRepository } from '../repositories/bank.repository';
import { RedisService } from '../../../database/redis.service';
import { WithdrawalEmailNotificationService } from '../../notification/services/withdrawal-email-notification.service';
import { WalletPaymentService } from './wallet-payment.service';
import {
  WithdrawalOtpRequestDto,
  WithdrawalRequestDto,
  WithdrawalResponseDto,
  AdminWithdrawalActionDto,
  BankCreateDto,
  BankUpdateDto,
  BankResponseDto,
} from '../dto';

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
    private readonly withdrawalEmailService: WithdrawalEmailNotificationService,
    private readonly walletPaymentService: WalletPaymentService,
  ) {}

  async generateWithdrawalOTP(
    userId: string,
    amount: number,
  ): Promise<{ otpId: string; message: string }> {
    this.logger.log(
      `Generating withdrawal OTP for user ${userId} with amount ${amount}`,
    );
    
    // Check if user has any active withdrawal request
    const activeWithdrawal = await this.withdrawalRepo.findActiveByUserId(userId);
    if (activeWithdrawal) {
      throw new BadRequestException(
        'You have a pending or processing withdrawal request. Please wait for it to be completed.',
      );
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
      throw new BadRequestException(
        'User email is required for withdrawal OTP',
      );
    }

    // Check if user has sufficient balance
    if (!user.wallet || user.wallet.vendor_balance < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    this.logger.log(`User ${userId} has sufficient balance`);
    this.logger.log(`Generating OTP for user ${userId}`);
    
    // Generate random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    const otpId = `withdrawal_otp_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.OTP_EXPIRY_MINUTES * 60 * 1000,
    );

    const otpData: OTPData = {
      userId,
      otpCode,
      createdAt: now,
      expiresAt,
      attempts: 0,
    };

    // Store OTP in Redis with expiration
    const key = `withdrawal_otp:${otpId}`;
    await this.redisService.setex(
      key,
      this.OTP_EXPIRY_MINUTES * 60,
      JSON.stringify(otpData),
    );

    // Send OTP via email with retry logic
    let emailSent = false;
    let emailError: Error | null = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.withdrawalEmailService.sendWithdrawalOTPEmail(
          user,
          otpCode,
          this.OTP_EXPIRY_MINUTES,
        );
        emailSent = true;
        this.logger.log(`Withdrawal OTP email sent successfully on attempt ${attempt}`);
        break;
      } catch (error) {
        emailError = error;
        this.logger.warn(
          `Failed to send OTP email (attempt ${attempt}/3): ${error.message}`,
        );
        
        // Wait before retrying (exponential backoff: 1s, 2s, 4s)
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }

    // Log final result but don't fail the entire operation
    if (!emailSent) {
      this.logger.error(
        `Failed to send withdrawal OTP email after 3 attempts: ${emailError?.message}`,
        emailError?.stack,
      );
    }

    this.logger.log(`Withdrawal OTP generated for user ${userId}: ${otpCode}`);

    return {
      otpId,
      message: emailSent 
        ? 'Withdrawal OTP sent to your email successfully'
        : 'Withdrawal OTP generated. Please check your email or contact support if you did not receive it.',
    };
  }

  async requestWithdrawal(
    userId: string,
    withdrawalData: WithdrawalRequestDto,
  ): Promise<WithdrawalResponseDto> {
    // Validate OTP
    const otpValidation = await this.validateWithdrawalOTP(
      withdrawalData.otp_id,
      withdrawalData.otp_code,
    );
    if (!otpValidation.isValid) {
      throw new ForbiddenException(otpValidation.error || 'Invalid OTP');
    }

    // Check if user has any active withdrawal request
    const activeWithdrawal = await this.withdrawalRepo.findActiveByUserId(
      userId,
    );
    if (activeWithdrawal) {
      throw new BadRequestException(
        'You have a pending or processing withdrawal request. Please wait for it to be completed.',
      );
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
      throw new BadRequestException(
        `Currency ${withdrawalData.currency} is not supported for country ${withdrawalData.country}`,
      );
    }

    const totalAmount = withdrawalData.amount;

    // Check if user has sufficient balance
    if (user.wallet.vendor_balance < totalAmount) {
      throw new BadRequestException(
        `Insufficient balance. Required: ${totalAmount} ${withdrawalData.currency}, Available: ${user.wallet.balance} ${user.wallet.currency}`,
      );
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
    });

    // Send notification to admin
    await this.withdrawalEmailService.sendWithdrawalRequestToAdmin(withdrawal);

    this.logger.log(
      `Withdrawal request created: ${withdrawal.id} for user ${userId}`,
    );

    return this.mapToResponseDto(withdrawal);
  }

  async validateWithdrawalOTP(
    otpId: string,
    otpCode: string,
  ): Promise<{ isValid: boolean; error?: string }> {
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
      await this.redisService.setex(
        key,
        this.OTP_EXPIRY_MINUTES * 60,
        JSON.stringify(otpData),
      );
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
    actionData: AdminWithdrawalActionDto,
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
      actionData.transaction_reference,
    );

    // Deduct amount from user's wallet
    await this.walletPaymentService.debitWalletForWithdrawal(
      withdrawal.user_id,
      withdrawal.amount + withdrawal.fee,
      `Withdrawal ${withdrawal.id}`,
    );

    // Get updated withdrawal and user
    const updatedWithdrawal = await this.withdrawalRepo.findById(withdrawalId);
    
    // Send notification to user
    await this.withdrawalEmailService.sendWithdrawalCompletedEmail(
      updatedWithdrawal,
      updatedWithdrawal.user,
    );

    this.logger.log(
      `Withdrawal ${withdrawalId} marked as completed by admin ${adminId}`,
    );

    return this.mapToResponseDto(updatedWithdrawal);
  }

  async markWithdrawalAsFailed(
    withdrawalId: string,
    adminId: string,
    actionData: AdminWithdrawalActionDto,
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
      actionData.notes,
    );

    // Get updated withdrawal
    const updatedWithdrawal = await this.withdrawalRepo.findById(withdrawalId);

    // Send notification to user
    await this.withdrawalEmailService.sendWithdrawalFailedEmail(
      updatedWithdrawal,
      updatedWithdrawal.user,
    );

    this.logger.log(
      `Withdrawal ${withdrawalId} marked as failed by admin ${adminId}`,
    );

    return this.mapToResponseDto(updatedWithdrawal);
  }

  async markWithdrawalAsRejected(
    withdrawalId: string,
    adminId: string,
    actionData: AdminWithdrawalActionDto,
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
      actionData.notes,
    );

    // Get updated withdrawal
    const updatedWithdrawal = await this.withdrawalRepo.findById(withdrawalId);

    // Send notification to user
    await this.withdrawalEmailService.sendWithdrawalRejectedEmail(
      updatedWithdrawal,
      updatedWithdrawal.user,
    );

    this.logger.log(
      `Withdrawal ${withdrawalId} marked as rejected by admin ${adminId}`,
    );

    return this.mapToResponseDto(updatedWithdrawal);
  }

  // Bank management methods
  async createBank(
    userId: string,
    bankData: BankCreateDto,
  ): Promise<BankResponseDto> {
    this.logger.log(`Creating bank for user ${userId}`);

    const existingBank = await this.bankRepo.findByAccountNumber(
      userId,
      bankData.account_number,
    );
    if (existingBank) {
      throw new BadRequestException(
        'Bank account with this account number already exists',
      );
    }

    const existingBankByName =
      await this.bankRepo.findByBankNameAndAccountNumber(
        userId,
        bankData.bank_name,
        bankData.account_number,
      );
    if (existingBankByName) {
      throw new BadRequestException(
        'Bank account with this name and bank already exists',
      );
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

  async updateBank(
    userId: string,
    bankId: string,
    bankData: BankUpdateDto,
  ): Promise<BankResponseDto> {
    this.logger.log(`Updating bank ${bankId} for user ${userId}`);

    const existingBank = await this.bankRepo.findByUserIdAndId(userId, bankId);
    if (!existingBank) {
      throw new NotFoundException('Bank not found');
    }

    if (
      bankData.account_number &&
      bankData.account_number !== existingBank.account_number
    ) {
      const duplicateBank = await this.bankRepo.findByAccountNumber(
        userId,
        bankData.account_number,
      );
      if (duplicateBank && duplicateBank.id !== bankId) {
        throw new BadRequestException(
          'Bank account with this account number already exists',
        );
      }
    }

    if (bankData.bank_name && bankData.account_number) {
      const duplicateBank = await this.bankRepo.findByBankNameAndAccountNumber(
        userId,
        bankData.bank_name,
        bankData.account_number,
      );
      if (duplicateBank && duplicateBank.id !== bankId) {
        throw new BadRequestException(
          'Bank account with this name and bank already exists',
        );
      }
    }

    const updatedBank = await this.bankRepo.update(bankId, bankData);
    this.logger.log(`Bank updated: ${bankId} for user ${userId}`);
    return this.mapBankToResponseDto(updatedBank);
  }

  async deleteBank(
    userId: string,
    bankId: string,
  ): Promise<{ message: string }> {
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