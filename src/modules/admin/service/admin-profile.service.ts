// src/modules/admin/services/admin-profile.service.ts

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Address, Vendor } from 'src/entities';
import { AddressService } from '../../user/services/address.service';
import {
  AdminUpdatePhoneDto,
  AdminUpdateAddressDto,
  AdminUpdateVendorDto,
  AdminActionResponseDto,
} from '../dto/admin-update-profile.dto';

@Injectable()
export class AdminProfileService {
  private readonly logger = new Logger(AdminProfileService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    private readonly addressService: AddressService,
  ) {}

  /**
   * Admin: Update user phone number
   */
  async updateUserPhone(
    adminUser: User,
    userId: string,
    updateDto: AdminUpdatePhoneDto,
  ): Promise<AdminActionResponseDto> {
    this.logger.log(`[ADMIN] ${adminUser.email} updating phone for user ${userId}`);

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if phone number is already in use
    const existingUser = await this.userRepository.findOne({
      where: { phone_number: updateDto.phoneNumber },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Phone number already in use by another user');
    }

    const oldPhoneNumber = user.phone_number;

    user.phone_number = updateDto.phoneNumber;
    user.is_phone_verified = false; // Reset verification status
    await this.userRepository.save(user);

    this.logger.log(
      `[ADMIN] Phone updated for user ${userId}: ${oldPhoneNumber} → ${updateDto.phoneNumber}. Admin: ${adminUser.email}`,
    );

    return {
      success: true,
      message: 'Phone number updated successfully',
      admin_email: adminUser.email,
      performed_at: new Date(),
      reason: updateDto.reason,
      data: {
        user_id: user.id,
        old_phone: oldPhoneNumber,
        new_phone: user.phone_number,
        phone_verified: user.is_phone_verified,
      },
    };
  }

  /**
   * Admin: Update user address (ENHANCED - handles both address lines)
   */
  async updateUserAddress(
    adminUser: User,
    userId: string,
    addressId: string,
    updateDto: AdminUpdateAddressDto,
  ): Promise<AdminActionResponseDto> {
    this.logger.log(
      `[ADMIN] ${adminUser.email} updating address ${addressId} for user ${userId}`,
    );

    // Verify user exists
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get existing address to log old data
    const existingAddress = await this.addressService.getAddressById(userId, addressId);

    if (!existingAddress) {
      throw new NotFoundException('Address not found');
    }

    // Store old address data for audit trail
    const oldAddressData = {
      address_line_1: existingAddress.address_line_1,
      address_line_2: existingAddress.address_line_2,
      city: existingAddress.city,
      state: existingAddress.state,
      postal_code: existingAddress.postal_code,
      country: existingAddress.country,
      latitude: existingAddress.latitude,
      longitude: existingAddress.longitude,
    };

    // Extract reason from DTO
    const { reason, ...addressUpdateData } = updateDto;

    // ============================================================
    // CRITICAL: Handle address_line_2 explicitly
    // ============================================================
    // If address_line_2 is provided (even as null/empty), include it
    // This allows admins to clear address_line_2 if needed
    const updatePayload: any = {};

    if (addressUpdateData.address_line_1 !== undefined) {
      updatePayload.address_line_1 = addressUpdateData.address_line_1;
    }

    // IMPORTANT: Explicitly handle address_line_2
    if (addressUpdateData.address_line_2 !== undefined) {
      updatePayload.address_line_2 = addressUpdateData.address_line_2 || null;
    }

    if (addressUpdateData.city !== undefined) {
      updatePayload.city = addressUpdateData.city;
    }

    if (addressUpdateData.state !== undefined) {
      updatePayload.state = addressUpdateData.state;
    }

    if (addressUpdateData.postal_code !== undefined) {
      updatePayload.postal_code = addressUpdateData.postal_code;
    }

    if (addressUpdateData.country !== undefined) {
      updatePayload.country = addressUpdateData.country;
    }

    if (addressUpdateData.latitude !== undefined) {
      updatePayload.latitude = addressUpdateData.latitude;
    }

    if (addressUpdateData.longitude !== undefined) {
      updatePayload.longitude = addressUpdateData.longitude;
    }

    if (addressUpdateData.address_type !== undefined) {
      updatePayload.address_type = addressUpdateData.address_type;
    }

    if (addressUpdateData.is_default !== undefined) {
      updatePayload.is_default = addressUpdateData.is_default;
    }

    this.logger.log('Address update payload:', updatePayload);

    // Update address using AddressService
    const updatedAddress = await this.addressService.updateAddress(
      userId,
      addressId,
      updatePayload,
    );

    this.logger.log(
      `[ADMIN] Address ${addressId} updated for user ${userId}. Admin: ${adminUser.email}`,
    );

    return {
      success: true,
      message: 'Address updated successfully',
      admin_email: adminUser.email,
      performed_at: new Date(),
      reason: reason,
      data: {
        user_id: userId,
        address_id: updatedAddress.id,
        old_address: oldAddressData,
        new_address: {
          address_line_1: updatedAddress.address_line_1,
          address_line_2: updatedAddress.address_line_2,
          city: updatedAddress.city,
          state: updatedAddress.state,
          postal_code: updatedAddress.postal_code,
          country: updatedAddress.country,
          latitude: updatedAddress.latitude,
          longitude: updatedAddress.longitude,
        },
      },
    };
  }

  /**
   * Admin: Create new address for user (ENHANCED - handles both address lines)
   */
  async createUserAddress(
    adminUser: User,
    userId: string,
    createDto: AdminUpdateAddressDto,
  ): Promise<AdminActionResponseDto> {
    this.logger.log(`[ADMIN] ${adminUser.email} creating address for user ${userId}`);

    // Verify user exists
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Extract reason
    const { reason, ...addressCreateData } = createDto;

    // Build address data with all fields
    const addressData: any = {
      address_line_1: addressCreateData.address_line_1 || '',
      city: addressCreateData.city || '',
      state: addressCreateData.state || '',
      postal_code: addressCreateData.postal_code || '',
      country: addressCreateData.country || 'NG',
    };

    // ============================================================
    // CRITICAL: Explicitly add address_line_2 if provided
    // ============================================================
    if (addressCreateData.address_line_2 !== undefined) {
      addressData.address_line_2 = addressCreateData.address_line_2;
    }

    // Add optional fields
    if (addressCreateData.latitude !== undefined) {
      addressData.latitude = addressCreateData.latitude;
    }
    if (addressCreateData.longitude !== undefined) {
      addressData.longitude = addressCreateData.longitude;
    }
    if (addressCreateData.address_type) {
      addressData.address_type = addressCreateData.address_type;
    }
    if (addressCreateData.is_default !== undefined) {
      addressData.is_default = addressCreateData.is_default;
    }

    // Validate required fields
    if (!addressData.address_line_1 || !addressData.city || !addressData.state || !addressData.postal_code) {
      throw new BadRequestException('Address line 1, city, state, and postal code are required');
    }

    this.logger.log('Creating address with data:', addressData);

    // Create address
    const newAddress = await this.addressService.createAddress(userId, addressData);

    this.logger.log(
      `[ADMIN] Address ${newAddress.id} created for user ${userId}. Admin: ${adminUser.email}`,
    );

    return {
      success: true,
      message: 'Address created successfully',
      admin_email: adminUser.email,
      performed_at: new Date(),
      reason: reason,
      data: {
        user_id: userId,
        address_id: newAddress.id,
        address: newAddress,
      },
    };
  }

  /**
   * Admin: Delete user address
   */
  async deleteUserAddress(
    adminUser: User,
    userId: string,
    addressId: string,
    reason?: string,
  ): Promise<AdminActionResponseDto> {
    this.logger.log(
      `[ADMIN] ${adminUser.email} deleting address ${addressId} for user ${userId}`,
    );

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get address before deletion for audit trail
    const address = await this.addressService.getAddressById(userId, addressId);

    // Delete address
    await this.addressService.deleteAddress(userId, addressId);

    this.logger.log(
      `[ADMIN] Address ${addressId} deleted for user ${userId}. Admin: ${adminUser.email}`,
    );

    return {
      success: true,
      message: 'Address deleted successfully',
      admin_email: adminUser.email,
      performed_at: new Date(),
      reason: reason,
      data: {
        user_id: userId,
        deleted_address_id: addressId,
        deleted_address: address,
      },
    };
  }

  /**
   * Admin: Update vendor phone number
   */
  async updateVendorPhone(
    adminUser: User,
    vendorId: string,
    updateDto: AdminUpdatePhoneDto,
  ): Promise<AdminActionResponseDto> {
    this.logger.log(`[ADMIN] ${adminUser.email} updating phone for vendor ${vendorId}`);

    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
      relations: ['user'],
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Update the vendor's user phone number
    return await this.updateUserPhone(adminUser, vendor.user_id, updateDto);
  }

  /**
   * Admin: Update vendor address (ENHANCED - handles both address lines)
   */
  async updateVendorAddress(
    adminUser: User,
    vendorId: string,
    updateDto: AdminUpdateAddressDto,
  ): Promise<AdminActionResponseDto> {
    this.logger.log(`[ADMIN] ${adminUser.email} updating address for vendor ${vendorId}`);

    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
      relations: ['address', 'user'],
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (!vendor.address_id) {
      throw new BadRequestException('Vendor has no address to update');
    }

    // Get existing address for audit trail
    const existingAddress = await this.addressService.getAddressByIdWithoutValidation(
      vendor.address_id,
    );

    if (!existingAddress) {
      throw new NotFoundException('Vendor address not found');
    }

    const oldAddressData = {
      address_line_1: existingAddress.address_line_1,
      address_line_2: existingAddress.address_line_2,
      city: existingAddress.city,
      state: existingAddress.state,
      postal_code: existingAddress.postal_code,
      country: existingAddress.country,
    };

    // Extract reason
    const { reason, ...addressUpdateData } = updateDto;

    // Build update payload with explicit address_line_2 handling
    const updatePayload: any = {};

    if (addressUpdateData.address_line_1 !== undefined) {
      updatePayload.address_line_1 = addressUpdateData.address_line_1;
    }

    // IMPORTANT: Explicitly handle address_line_2
    if (addressUpdateData.address_line_2 !== undefined) {
      updatePayload.address_line_2 = addressUpdateData.address_line_2 || null;
    }

    if (addressUpdateData.city !== undefined) {
      updatePayload.city = addressUpdateData.city;
    }

    if (addressUpdateData.state !== undefined) {
      updatePayload.state = addressUpdateData.state;
    }

    if (addressUpdateData.postal_code !== undefined) {
      updatePayload.postal_code = addressUpdateData.postal_code;
    }

    if (addressUpdateData.country !== undefined) {
      updatePayload.country = addressUpdateData.country;
    }

    if (addressUpdateData.latitude !== undefined) {
      updatePayload.latitude = addressUpdateData.latitude;
    }

    if (addressUpdateData.longitude !== undefined) {
      updatePayload.longitude = addressUpdateData.longitude;
    }

    this.logger.log('Vendor address update payload:', updatePayload);

    // Update vendor address
    const updatedAddress = await this.addressService.updateAddress(
      vendor.user_id,
      vendor.address_id,
      updatePayload,
    );

    this.logger.log(
      `[ADMIN] Vendor ${vendorId} address updated. Admin: ${adminUser.email}`,
    );

    return {
      success: true,
      message: 'Vendor address updated successfully',
      admin_email: adminUser.email,
      performed_at: new Date(),
      reason: reason,
      data: {
        vendor_id: vendorId,
        address_id: updatedAddress.id,
        old_address: oldAddressData,
        new_address: {
          address_line_1: updatedAddress.address_line_1,
          address_line_2: updatedAddress.address_line_2,
          city: updatedAddress.city,
          state: updatedAddress.state,
          postal_code: updatedAddress.postal_code,
          country: updatedAddress.country,
        },
      },
    };
  }

  /**
   * Admin: Update vendor business information
   */
  async updateVendorInfo(
    adminUser: User,
    vendorId: string,
    updateDto: AdminUpdateVendorDto,
  ): Promise<AdminActionResponseDto> {
    this.logger.log(`[ADMIN] ${adminUser.email} updating vendor ${vendorId} info`);

    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const oldData = {
      business_name: vendor.business_name,
      certificate_number: vendor.certificate_number,
    };

    if (updateDto.business_name !== undefined) {
      vendor.business_name = updateDto.business_name;
    }
    if (updateDto.certificate_number !== undefined) {
      vendor.certificate_number = updateDto.certificate_number;
    }

    await this.vendorRepository.save(vendor);

    this.logger.log(
      `[ADMIN] Vendor ${vendorId} info updated. Admin: ${adminUser.email}`,
    );

    return {
      success: true,
      message: 'Vendor information updated successfully',
      admin_email: adminUser.email,
      performed_at: new Date(),
      reason: updateDto.reason,
      data: {
        vendor_id: vendorId,
        old_data: oldData,
        new_data: {
          business_name: vendor.business_name,
          certificate_number: vendor.certificate_number,
        },
      },
    };
  }

  /**
   * Admin: Get user addresses
   */
  async getUserAddresses(userId: string): Promise<Address[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return await this.addressService.getUserAddresses(userId);
  }

  /**
   * Admin: Get vendor address
   */
  async getVendorAddress(vendorId: string): Promise<Address> {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
      relations: ['address'],
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (!vendor.address) {
      throw new NotFoundException('Vendor has no address');
    }

    return vendor.address;
  }
}