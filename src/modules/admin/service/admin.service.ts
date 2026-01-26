// src/modules/admin/services/admin.service.ts
import { Vendor } from '@/entities';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddressFormatter } from '../../../utils/address-formatter';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
  ) {}

  async getAllVendors(): Promise<Vendor[]> {
    const vendors = await this.vendorRepository.find({
      relations: ['address', 'user'],
      order: { created_at: 'DESC' },
    });

    // Enrich each vendor with complete address details
    return vendors.map(vendor => this.enrichVendorWithAddress(vendor));
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

  /**
   * Enrich vendor object with complete address information
   */
  private enrichVendorWithAddress(vendor: Vendor): Vendor {
    if (vendor.address) {
      // Add formatted full address
      (vendor as any).fullAddress = AddressFormatter.formatFullAddress(vendor.address);
      
      // Add individual address components
      (vendor as any).street = vendor.address.address_line_1 || '';
      (vendor as any).city = vendor.address.city || '';
      (vendor as any).state = vendor.address.state || '';
      (vendor as any).postalCode = vendor.address.postal_code || '';
      (vendor as any).country = vendor.address.country || '';
      
      // Add user information if available
      if (vendor.user) {
        (vendor as any).email = vendor.user.email;
        (vendor as any).phone = vendor.user.phone_number;
        (vendor as any).userName = vendor.user.full_name;
      }
    }

    return vendor;
  }
}