import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { User, UserStatus, UserType, Vendor, Wallet } from '@/entities';
import { VendorClaimService } from '@/modules/auth/services/vendor-claim.service';
import { AdminCreateVendorShellDto, AdminUpdateVendorContactDto } from '../dto/admin-vendor-onboarding.dto';
import { getCurrencyForCountry } from '@/utils/currency-mapper';

@Injectable()
export class AdminVendorOnboardingService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    private readonly vendorClaimService: VendorClaimService,
  ) {}

  async createVendorShell(dto: AdminCreateVendorShellDto): Promise<Vendor> {
    const placeholderEmail = this.generatePlaceholderEmail();
    const country = dto.country || 'NG';

    const user = this.userRepository.create({
      email: placeholderEmail,
      user_type: UserType.VENDOR,
      status: UserStatus.PENDING_VERIFICATION,
      profile_completed: false,
      is_phone_verified: false,
      country,
    });

    const savedUser = await this.userRepository.save(user);

    const currency = getCurrencyForCountry(country);
    const wallet = this.walletRepository.create({
      user_id: savedUser.id,
      balance: 0,
      vendor_balance: 0,
      currency,
    });
    await this.walletRepository.save(wallet);

    const vendor = this.vendorRepository.create({
      user_id: savedUser.id,
      business_name: dto.business_name,
      certificate_number: dto.certificate_number,
      is_active: false,
    });

    return await this.vendorRepository.save(vendor);
  }

  async updateVendorContact(vendorId: string, dto: AdminUpdateVendorContactDto): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({ where: { id: vendorId }, relations: ['user'] });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const existingUser = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existingUser && existingUser.id !== vendor.user_id) {
      throw new ConflictException('Email is already taken by another user');
    }

    vendor.user.email = dto.email;
    vendor.user.email_verified_at = null;
    await this.userRepository.save(vendor.user);

    return vendor;
  }

  async sendVendorInvite(vendorId: string, overrideEmail?: string): Promise<{ claimUrl: string }> {
    const vendor = await this.vendorRepository.findOne({ where: { id: vendorId }, relations: ['user'] });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const email = overrideEmail || vendor.user?.email;
    if (!email || email.endsWith('@rambini.local')) {
      throw new BadRequestException('Vendor email is required before sending invite');
    }

    return await this.vendorClaimService.sendVendorClaimInvite(vendor.user_id, vendor.id, email);
  }

  private generatePlaceholderEmail(): string {
    return `vendor+${randomUUID()}@rambini.local`;
  }
}
