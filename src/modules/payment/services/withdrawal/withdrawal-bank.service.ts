import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Bank } from '../../../../entities';
import { BankRepository } from '../../repositories/bank.repository';
import { BankCreateDto, BankUpdateDto, BankResponseDto } from '../../dto';

@Injectable()
export class WithdrawalBankService {
  private readonly logger = new Logger(WithdrawalBankService.name);

  constructor(
    private readonly bankRepo: BankRepository,
  ) {}

  /**
   * Create a new bank account for a user
   */
  async createBank(
    userId: string,
    bankData: BankCreateDto,
  ): Promise<Bank> {
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
    return bank;
  }

  /**
   * Get all bank accounts for a user
   */
  async getUserBanks(userId: string): Promise<Bank[]> {
    this.logger.log(`Getting banks for user ${userId}`);
    return await this.bankRepo.findByUserId(userId);
  }

  /**
   * Get a specific bank account by ID
   */
  async getBankById(userId: string, bankId: string): Promise<Bank> {
    this.logger.log(`Getting bank ${bankId} for user ${userId}`);
    const bank = await this.bankRepo.findByUserIdAndId(userId, bankId);
    if (!bank) {
      throw new NotFoundException('Bank not found');
    }
    return bank;
  }

  /**
   * Update a bank account
   */
  async updateBank(
    userId: string,
    bankId: string,
    bankData: BankUpdateDto,
  ): Promise<Bank> {
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
    return updatedBank;
  }

  /**
   * Delete a bank account
   */
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

  /**
   * Map bank entity to response DTO
   */
  mapBankToResponseDto(bank: Bank): BankResponseDto {
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