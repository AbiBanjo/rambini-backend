// src/modules/vendor/services/vendor.service.ts
import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor, UserType, User, NotificationType } from '../../../entities';
import { CreateVendorDto } from '../dto/create-vendor.dto';
import { AddressService } from '../../user/services/address.service';
import { AddressType } from '../../../entities/address.entity';
import { ErrorHandlerService } from '../../../common/services';
import { UserService } from '../../user/services/user.service';
import { EmailNotificationService } from '../../notification/services/email-notification.service';
import { NotificationService } from '../../notification/notification.service';
import { AddressFormatter } from '../../../utils/address-formatter';
import { fetchPage } from '@/utils/pagination.utils';

@Injectable()
export class VendorService {
  private readonly logger = new Logger(VendorService.name);
  // Enable verbose logging only in development
  private readonly enableAddressLogging =
    process.env.NODE_ENV === 'development';

  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    private readonly addressService: AddressService,
    private readonly userService: UserService,
    private readonly errorHandler: ErrorHandlerService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly notificationService: NotificationService,
  ) {}

  async createVendor(
    user: User,
    createVendorDto: CreateVendorDto,
  ): Promise<Vendor> {
    // Check if user already has a vendor profile
    const existingVendor = await this.vendorRepository.findOne({
      where: { user_id: user.id },
    });

    if (existingVendor) {
      throw new ConflictException('User already has a vendor profile');
    }

    // Create vendor address using address service
    const address = await this.addressService.createAddress(user.id, {
      address_line_1: createVendorDto.address_line_1,
      address_line_2: createVendorDto.address_line_2,
      city: createVendorDto.city,
      state: createVendorDto.state,
      postal_code: createVendorDto.postal_code,
      country: createVendorDto.country || 'NG',
      latitude: createVendorDto.latitude,
      longitude: createVendorDto.longitude,
      address_type: AddressType.VENDOR,
      is_default: false,
    });

    // Create vendor profile
    const vendor = this.vendorRepository.create({
      user_id: user.id,
      business_name: createVendorDto.business_name,
      certificate_number: createVendorDto.certificate_number,
      address_id: address.id,
      is_active: true,
    });

    // Save vendor first
    const savedVendor = await this.vendorRepository.save(vendor);

    // Change user role to vendor
    await this.userService.updateUser(user.id, { user_type: UserType.VENDOR });

    // Send email notification to the vendor
    await this.notificationService.sendEmailNotification(
      user.id,
      NotificationType.VENDOR_PROFILE_CREATED,
      'Vendor Profile Created',
      'Your vendor profile has been created successfully',
      {
        vendor_name: createVendorDto.business_name,
      },
    );

    // Fetch the vendor with relations to enrich with address
    const vendorWithRelations = await this.vendorRepository.findOne({
      where: { id: savedVendor.id },
      relations: ['address', 'user'],
    });

    return this.enrichVendorWithAddressDetails(vendorWithRelations);
  }

  async getVendorByUserId(userId: string): Promise<Vendor | null> {
    const vendor = await this.vendorRepository.findOne({
      where: { user_id: userId },
      relations: ['address', 'user'],
    });

    return vendor ? this.enrichVendorWithAddressDetails(vendor) : null;
  }

  async getVendorById(vendorId: string): Promise<Vendor | null> {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
      relations: ['address', 'user', 'menu'],
    });

    return vendor ? this.enrichVendorWithAddressDetails(vendor) : null;
  }

  async getVendorByIdForDelivery(vendorId: string): Promise<Vendor | null> {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
      relations: ['address', 'user'],
    });

    return vendor ? this.enrichVendorWithAddressDetails(vendor) : null;
  }

  // async getAllVendors(): Promise<Vendor[]> {
  //   const vendors = await this.vendorRepository.find({
  //     relations: ['address', 'user'],
  //     order: { created_at: 'DESC' },
  //   });

  //   return vendors.map(vendor => this.enrichVendorWithAddressDetails(vendor));
  // }

  async getActiveVendors(): Promise<Vendor[]> {
    const vendors = await this.vendorRepository.find({
      where: { is_active: true },
      relations: ['address', 'user'],
      order: { created_at: 'DESC' },
    });

    return vendors.map(vendor => this.enrichVendorWithAddressDetails(vendor));
  }

  /**
   * Enrich vendor object with complete address details
   * Uses the improved AddressFormatter with smart logging
   */
  private enrichVendorWithAddressDetails(vendor: Vendor): Vendor {
    if (!vendor || !vendor.address) return vendor;

    // Use AddressFormatter with optional logging (throttled automatically)
    const fullAddress = AddressFormatter.formatFullAddress(
      {
        address_line_1: vendor.address.address_line_1,
        address_line_2: vendor.address.address_line_2,
        city: vendor.address.city,
        state: vendor.address.state,
        postal_code: vendor.address.postal_code,
        country: vendor.address.country,
      },
      {
        enableLogging: this.enableAddressLogging,
        logger: this.logger,
      },
    );

    (vendor as any).fullAddress = fullAddress;

    // Add formatted address with line breaks for display
    (vendor as any).formattedAddress =
      AddressFormatter.formatAddressWithLineBreaks(
        {
          address_line_1: vendor.address.address_line_1,
          address_line_2: vendor.address.address_line_2,
          city: vendor.address.city,
          state: vendor.address.state,
          postal_code: vendor.address.postal_code,
          country: vendor.address.country,
        },
        {
          enableLogging: this.enableAddressLogging,
          logger: this.logger,
        },
      );

    // Add individual address components (cleaned automatically)
    const addressComponents = AddressFormatter.extractAddressComponents(
      {
        address_line_1: vendor.address.address_line_1,
        address_line_2: vendor.address.address_line_2,
        city: vendor.address.city,
        state: vendor.address.state,
        postal_code: vendor.address.postal_code,
        country: vendor.address.country,
        latitude: vendor.address.latitude,
        longitude: vendor.address.longitude,
      },
      {
        enableLogging: this.enableAddressLogging,
        logger: this.logger,
      },
    );

    (vendor as any).addressComponents = addressComponents;

    return vendor;
  }

  /**
   * Clean corrupted address data for a single vendor
   * Removes old/duplicate data from address_line_2 if it looks like a full address
   */
  async cleanVendorAddress(vendorId: string): Promise<void> {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
      relations: ['address'],
    });

    if (!vendor || !vendor.address) {
      this.logger.warn(`No address found for vendor ${vendorId}`);
      return;
    }

    const address = vendor.address;

    // Use AddressFormatter to check if address_line_2 is corrupted
    const cleanedLine2 = AddressFormatter.cleanAddressLine2(
      address.address_line_1,
      address.address_line_2,
      address.city,
      address.state,
      address.country,
    );

    // If cleanAddressLine2 returned null but address_line_2 exists, it's corrupted
    const isCorrupted = address.address_line_2 && !cleanedLine2;

    if (isCorrupted) {
      this.logger.log(
        `Cleaning corrupted address_line_2 for vendor ${vendorId}: "${address.address_line_2}"`,
      );

      // Clear the corrupted address_line_2
      await this.addressService.updateAddress(vendor.user_id, address.id, {
        address_line_2: null,
      });

      this.logger.log(`✅ Cleaned address for vendor ${vendorId}`);
    }
  }

  /**
   * Clean all vendor addresses (run once to fix database)
   * Returns summary of cleaning operation
   */
  async cleanAllVendorAddresses(): Promise<{
    cleaned: number;
    total: number;
    corrupted: string[];
  }> {
    this.logger.log('Starting address cleanup for all vendors...');

    const vendors = await this.vendorRepository.find({
      relations: ['address'],
    });

    let cleaned = 0;
    const corruptedAddresses: string[] = [];

    for (const vendor of vendors) {
      if (vendor.address?.address_line_2) {
        // Check if it's corrupted using AddressFormatter
        const cleanedLine2 = AddressFormatter.cleanAddressLine2(
          vendor.address.address_line_1,
          vendor.address.address_line_2,
          vendor.address.city,
          vendor.address.state,
          vendor.address.country,
        );

        const isCorrupted = !cleanedLine2;

        if (isCorrupted) {
          try {
            corruptedAddresses.push(
              `${vendor.business_name}: "${vendor.address.address_line_2}"`,
            );
            await this.cleanVendorAddress(vendor.id);
            cleaned++;
          } catch (error) {
            this.logger.error(
              `Failed to clean address for vendor ${vendor.id}:`,
              error,
            );
          }
        }
      }
    }

    this.logger.log(
      `✅ Address cleanup complete: ${cleaned}/${vendors.length} addresses cleaned`,
    );

    return {
      cleaned,
      total: vendors.length,
      corrupted: corruptedAddresses,
    };
  }

  async updateVendor(
    userId: string,
    updateData: Partial<CreateVendorDto>,
  ): Promise<Vendor> {
    const vendor = await this.getVendorByUserId(userId);

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // Update vendor business name if provided
    if (updateData.business_name) {
      vendor.business_name = updateData.business_name;
    }

    // Update certificate number if provided
    if (updateData.certificate_number) {
      vendor.certificate_number = updateData.certificate_number;
    }

    // Update address if any address fields are provided
    if (updateData.address_line_1 || updateData.city || updateData.state) {
      const addressUpdateData: any = {};

      if (updateData.address_line_1)
        addressUpdateData.address_line_1 = updateData.address_line_1;
      if (updateData.address_line_2 !== undefined)
        addressUpdateData.address_line_2 = updateData.address_line_2;
      if (updateData.city) addressUpdateData.city = updateData.city;
      if (updateData.state) addressUpdateData.state = updateData.state;
      if (updateData.postal_code)
        addressUpdateData.postal_code = updateData.postal_code;
      if (updateData.country) addressUpdateData.country = updateData.country;
      if (updateData.latitude !== undefined)
        addressUpdateData.latitude = updateData.latitude;
      if (updateData.longitude !== undefined)
        addressUpdateData.longitude = updateData.longitude;

      if (Object.keys(addressUpdateData).length > 0) {
        await this.addressService.updateAddress(
          userId,
          vendor.address_id,
          addressUpdateData,
        );
      }
    }

    // Save and return enriched vendor
    const savedVendor = await this.vendorRepository.save(vendor);

    // Reload with relations
    const updatedVendor = await this.vendorRepository.findOne({
      where: { id: savedVendor.id },
      relations: ['address', 'user'],
    });

    return this.enrichVendorWithAddressDetails(updatedVendor);
  }

  async activateVendor(userId: string): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { user_id: userId },
      relations: ['address', 'user'],
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    vendor.activate();
    const savedVendor = await this.vendorRepository.save(vendor);

    return this.enrichVendorWithAddressDetails(savedVendor);
  }

  async deactivateVendor(userId: string): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { user_id: userId },
      relations: ['address', 'user'],
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    vendor.is_active = false;
    return await this.vendorRepository.save(vendor);
  }

  // Admin methods for vendor management
  // async getAllVendors(): Promise<Vendor[]> {
  //   return await this.vendorRepository.find({
  //     relations: ['address'], // Include address details
  //     order: { created_at: 'DESC' }
  //   });
  // }

  async getAllVendors(page = 1, limit = 10) {
    const qb = this.vendorRepository
      .createQueryBuilder('vendor')
      .leftJoinAndSelect('vendor.address', 'address')
      .where('vendor.deleted_at IS NULL')
      .orderBy('vendor.created_at', 'DESC');
    return await fetchPage(qb, {
      page,
      count: limit,
    });
  }

  // // i should add where orderId is null here
  // async getVendorById(vendorId: string): Promise<Vendor | null> {
  //   return await this.vendorRepository.findOne({
  //     where: { id: vendorId },
  //     relations: ['address', 'user', 'menu'], // Include address details
  //   });
  // }

  // async getVendorByIdForDelivery(vendorId: string): Promise<Vendor | null> {
  //   return await this.vendorRepository.findOne({
  //     where: { id: vendorId },
  //     relations: ['address', 'user'], // Include address details
  //   });
  // }

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
