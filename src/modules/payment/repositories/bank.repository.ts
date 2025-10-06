import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bank } from '../../../entities';

@Injectable()
export class BankRepository {
  constructor(
    @InjectRepository(Bank)
    private readonly bankRepository: Repository<Bank>,
  ) {}

  async create(bankData: Partial<Bank>): Promise<Bank> {
    const bank = this.bankRepository.create(bankData);
    return await this.bankRepository.save(bank);
  }

  async findById(id: string): Promise<Bank | null> {
    return await this.bankRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async findByUserId(userId: string): Promise<Bank[]> {
    return await this.bankRepository.find({
      where: { user_id: userId },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  async findByUserIdAndId(userId: string, id: string): Promise<Bank | null> {
    return await this.bankRepository.findOne({
      where: { id, user_id: userId },
      relations: ['user'],
    });
  }

  async update(id: string, bankData: Partial<Bank>): Promise<Bank | null> {
    await this.bankRepository.update(id, bankData);
    return await this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.bankRepository.delete(id);
    return result.affected > 0;
  }

  async findByAccountNumber(userId: string, accountNumber: string): Promise<Bank | null> {
    return await this.bankRepository.findOne({
      where: { user_id: userId, account_number: accountNumber },
      relations: ['user'],
    });
  }

  async findByBankNameAndAccountNumber(userId: string, bankName: string, accountNumber: string): Promise<Bank | null> {
    return await this.bankRepository.findOne({
      where: { 
        user_id: userId, 
        bank_name: bankName, 
        account_number: accountNumber 
      },
      relations: ['user'],
    });
  }
}

