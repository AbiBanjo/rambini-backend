import { Vendor } from '@/entities';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
  ) {}

  async getAllVendors(): Promise<Vendor[]> {
    return await this.vendorRepository.find({
      relations: ['address'], // Include address details
      order: { created_at: 'DESC' },
    });
  }

  async getVerificationStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const [total, active, inactive] = await Promise.all([
      this.vendorRepository.count(),
      this.vendorRepository.count({ where: { is_active: true } }),
      this.vendorRepository.count({ where: { is_active: false } }),
    ]);

    return {
      total,
      active,
      inactive,
    };
  }
}
