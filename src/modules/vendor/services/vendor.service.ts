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

@Injectable()
export class VendorService {
  private readonly logger = new Logger(VendorService.name);

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
      relations: ['address', 'user'],
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

  async getAllVendors(): Promise<Vendor[]> {
    const vendors = await this.vendorRepository.find({
      relations: ['address', 'user'],
      order: { created_at: 'DESC' },
    });

    return vendors.map(vendor => this.enrichVendorWithAddressDetails(vendor));
  }

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
   * This adds formatted address fields to the vendor object
   */
  // src/modules/vendor/services/vendor.service.ts - WITH DEBUGGING

  /**
   * Enrich vendor object with complete address details
   * This adds formatted address fields to the vendor object
   */
  private enrichVendorWithAddressDetails(vendor: Vendor): Vendor {
    if (!vendor) return vendor;

    if (vendor.address) {
      // ============================================================
      // STEP 1: Clean address_line_2 if it contains corrupted data
      // ============================================================
      const cleanedAddressLine2 = this.cleanAddressLine2(vendor.address);

      // Debug logging
      this.logger.debug('========== ADDRESS DEBUG ==========');
      this.logger.debug('Raw address data:', {
        address_line_1: vendor.address.address_line_1,
        address_line_2_raw: vendor.address.address_line_2,
        address_line_2_cleaned: cleanedAddressLine2,
        city: vendor.address.city,
        state: vendor.address.state,
        postal_code: vendor.address.postal_code,
        country: vendor.address.country,
      });

      // ============================================================
      // STEP 2: Create formatted address using CLEANED data
      // ============================================================
      const fullAddress = AddressFormatter.formatFullAddress({
        address_line_1: vendor.address.address_line_1,
        address_line_2: cleanedAddressLine2, // 👈 Use cleaned version
        city: vendor.address.city,
        state: vendor.address.state,
        postal_code: vendor.address.postal_code,
        country: vendor.address.country,
      });

      this.logger.debug('Formatted fullAddress:', fullAddress);

      (vendor as any).fullAddress = fullAddress;

      // Add formatted address with line breaks for display
      (vendor as any).formattedAddress =
        AddressFormatter.formatAddressWithLineBreaks({
          address_line_1: vendor.address.address_line_1,
          address_line_2: cleanedAddressLine2, // 👈 Use cleaned version
          city: vendor.address.city,
          state: vendor.address.state,
          postal_code: vendor.address.postal_code,
          country: vendor.address.country,
        });

      // ============================================================
      // STEP 3: Add individual address components (CLEANED)
      // ============================================================
      const addressComponents = {
        street: vendor.address.address_line_1 || '',
        streetLine2: cleanedAddressLine2 || '', // 👈 Use cleaned version
        city: vendor.address.city || '',
        state: vendor.address.state || '',
        postalCode: vendor.address.postal_code || '',
        country: vendor.address.country || '',
        latitude: vendor.address.latitude,
        longitude: vendor.address.longitude,
      };

      this.logger.debug('Address components:', addressComponents);
      (vendor as any).addressComponents = addressComponents;

      this.logger.debug('===================================');
    }

    return vendor;
  }

  /**
   * ============================================================
   * NEW METHOD: Smart address_line_2 cleaner
   * ============================================================
   * Detects if address_line_2 contains full address data
   * (corrupted from Shipbubble validation) and returns clean data
   */
  private cleanAddressLine2(address: any): string | null {
    if (!address.address_line_2) return null;

    const addressLine2 = address.address_line_2.trim();

    // Check if address_line_2 contains commas (indicates it might be a full address)
    if (!addressLine2.includes(',')) {
      // It's a legitimate second line (e.g., "Suite 100", "Apartment 2B")
      return addressLine2;
    }

    // Check if it contains city, state, or country - if so, it's corrupted
    const suspiciousPatterns = [
      address.city,
      address.state,
      address.country,
      address.postal_code,
    ].filter(Boolean);

    const hasCorruptData = suspiciousPatterns.some(pattern =>
      addressLine2.includes(pattern!),
    );

    if (hasCorruptData) {
      this.logger.warn(
        `⚠️ Detected corrupted address_line_2 for vendor: "${addressLine2}"`,
      );
      this.logger.warn(
        `   Cleaning it to prevent duplication in formatted addresses`,
      );
      return null; // Clear corrupted data
    }

    // It has commas but doesn't match our fields - keep it
    return addressLine2;
  }

  // Add this to your VendorService

  /**
   * Clean corrupted address data
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

    // Check if address_line_2 contains commas (indicates it might be a full address)
    if (address.address_line_2 && address.address_line_2.includes(',')) {
      this.logger.warn(
        `Vendor ${vendorId} has suspicious address_line_2: "${address.address_line_2}"`,
      );

      // If it contains city, state, or country - it's likely corrupt
      const suspiciousPatterns = [
        address.city,
        address.state,
        address.country,
        address.postal_code,
      ].filter(Boolean);

      const hasCorruptData = suspiciousPatterns.some(pattern =>
        address.address_line_2?.includes(pattern!),
      );

      if (hasCorruptData) {
        this.logger.log(`Cleaning address_line_2 for vendor ${vendorId}`);

        // Clear the corrupted address_line_2
        await this.addressService.updateAddress(vendor.user_id, address.id, {
          address_line_2: null, // Clear it
        });

        this.logger.log(`✅ Cleaned address for vendor ${vendorId}`);
      }
    }
  }

  /**
   * Clean all vendor addresses (run once to fix database)
   */
  async cleanAllVendorAddresses(): Promise<{ cleaned: number; total: number }> {
    const vendors = await this.vendorRepository.find({
      relations: ['address'],
    });

    let cleaned = 0;

    for (const vendor of vendors) {
      if (vendor.address?.address_line_2?.includes(',')) {
        try {
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

    return { cleaned, total: vendors.length };
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
    const savedVendor = await this.vendorRepository.save(vendor);

    return this.enrichVendorWithAddressDetails(savedVendor);
  }
}
