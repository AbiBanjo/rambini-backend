import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor, UserType } from '../../../entities';
import { CreateVendorDto } from '../dto/create-vendor.dto';
import { AddressService } from '../../user/services/address.service';
import { AddressType } from '../../../entities/address.entity';
import { ErrorHandlerService } from '../../../common/services';
import { UserService } from '../../user/services/user.service';

@Injectable()
export class VendorService {
  private readonly logger = new Logger(VendorService.name);

  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    private readonly addressService: AddressService,
    private readonly userService: UserService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  async createVendor(userId: string, createVendorDto: CreateVendorDto): Promise<Vendor> {
    // Check if user already has a vendor profile
    const existingVendor = await this.vendorRepository.findOne({
      where: { user_id: userId }
    });

    if (existingVendor) {
      throw new ConflictException('User already has a vendor profile');
    }

    // Create vendor address using address service
    const address = await this.addressService.createAddress(userId, {
      address_line_1: createVendorDto.address_line_1,
      address_line_2: createVendorDto.address_line_2,
      city: createVendorDto.city,
      state: createVendorDto.state,
      postal_code: createVendorDto.postal_code,
      country: createVendorDto.country || 'NG',
      latitude: createVendorDto.latitude,
      longitude: createVendorDto.longitude,
      address_type: AddressType.VENDOR,
      is_default: false, // Vendor address is not default
    });

    // Create vendor profile
    const vendor = this.vendorRepository.create({
      user_id: userId,
      business_name: createVendorDto.business_name,
      certificate_number: createVendorDto.certificate_number,
      address_id: address.id,
      is_active: true,
    });

    // change user role to vendor
    await this.userService.updateUser(userId, { user_type: UserType.VENDOR });

    return await this.vendorRepository.save(vendor);
  }

  async getVendorByUserId(userId: string): Promise<Vendor | null> {
    return await this.vendorRepository.findOne({
      where: { user_id: userId },
      relations: ['address'], // Include address details
    });
  }

  async updateVendor(userId: string, updateData: Partial<CreateVendorDto>): Promise<Vendor> {
    const vendor = await this.getVendorByUserId(userId);
    
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // Update vendor business name if provided
    if (updateData.business_name) {
      vendor.business_name = updateData.business_name;
    }

    // Update address if any address fields are provided
    if (updateData.address_line_1 || updateData.city || updateData.state) {
      const addressUpdateData = {
        address_line_1: updateData.address_line_1,
        address_line_2: updateData.address_line_2,
        city: updateData.city,
        state: updateData.state,
        postal_code: updateData.postal_code,
        country: updateData.country,
        latitude: updateData.latitude,
        longitude: updateData.longitude,
        landmark: updateData.landmark,
      };

      // Remove undefined values
      Object.keys(addressUpdateData).forEach(key => {
        if (addressUpdateData[key] === undefined) {
          delete addressUpdateData[key];
        }
      });

      if (Object.keys(addressUpdateData).length > 0) {
        await this.addressService.updateAddress(userId, vendor.address_id, addressUpdateData);
      }
    }

    return await this.vendorRepository.save(vendor);
  }

  async activateVendor(userId: string): Promise<Vendor> {
    const vendor = await this.getVendorByUserId(userId);
    
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    vendor.activate();
    return await this.vendorRepository.save(vendor);
  }

  async deactivateVendor(userId: string): Promise<Vendor> {
    const vendor = await this.getVendorByUserId(userId);
    
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    vendor.is_active = false;
    return await this.vendorRepository.save(vendor);
  }

  // Admin methods for vendor management
  async getAllVendors(): Promise<Vendor[]> {
    return await this.vendorRepository.find({
      relations: ['address'], // Include address details
      order: { created_at: 'DESC' }
    });
  }

  // i should add where orderId is null here 
  async getVendorById(vendorId: string): Promise<Vendor | null> {
    return await this.vendorRepository.findOne({
      where: { id: vendorId },
      relations: ['address', 'user'], // Include address details
    });
  }

  async getVendorByIdForDelivery(vendorId: string): Promise<Vendor | null> {
    return await this.vendorRepository.findOne({
      where: { id: vendorId },
      relations: ['address', 'user'], // Include address details
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