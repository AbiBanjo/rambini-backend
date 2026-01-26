// src/modules/user/services/address.service.ts

import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Address, AddressType, User } from '../../../entities';
import { ConfigService } from '@nestjs/config';
import { CreateAddressDto, UpdateAddressDto } from '../dto';
import { AddressFormatter } from '../../../utils/address-formatter';

export interface CreateAddressRequest extends CreateAddressDto { }
export interface UpdateAddressRequest extends UpdateAddressDto { }

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  confidence: number;
}

/**
 * Interface for address data to be sent to delivery providers
 */
export interface DeliveryAddressData {
  // Primary address (formatted, clean, ready for delivery)
  address: string;
  
  // Individual components (for providers that need them)
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  
  // Geocoding data
  latitude?: number;
  longitude?: number;
  
  // User contact info
  name?: string;
  email?: string;
  phone?: string;
}

@Injectable()
export class AddressService {
  private readonly logger = new Logger(AddressService.name);
  private readonly geocodingEnabled: boolean;

  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    this.geocodingEnabled = !!(
      this.configService.get('GOOGLE_MAPS_API_KEY') ||
      this.configService.get('MAPBOX_ACCESS_TOKEN')
    );
  }

  /**
   * ============================================================
   * NEW METHOD: Get formatted address for delivery providers
   * ============================================================
   * This method returns a clean, properly formatted address ready
   * to be sent to delivery services like Shipbubble or Uber.
   * 
   * It automatically detects and cleans corrupted address_line_2 data.
   */
  async getFormattedAddressForDelivery(addressId: string): Promise<DeliveryAddressData> {
    const address = await this.addressRepository.findOne({
      where: { id: addressId },
      relations: ['user'],
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // Clean address_line_2 if it contains corrupted data
    const cleanedAddressLine2 = this.cleanAddressLine2(address);

    // Use AddressFormatter to create a complete, formatted address
    const formattedAddress = AddressFormatter.formatFullAddress({
      address_line_1: address.address_line_1,
      address_line_2: cleanedAddressLine2,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
    });

    this.logger.log(`✅ Formatted address for delivery: "${formattedAddress}"`);

    return {
      // Primary formatted address (clean and complete)
      address: formattedAddress,
      
      // Individual components (cleaned)
      address_line_1: address.address_line_1,
      address_line_2: cleanedAddressLine2,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code || '',
      country: address.country,
      
      // Geocoding
      latitude: address.latitude,
      longitude: address.longitude,
      
      // User contact (if available)
      name: address.user ? `${address.user.first_name} ${address.user.last_name}`.trim() : undefined,
      email: address.user?.email,
      phone: address.user?.phone_number,
    };
  }

  /**
   * ============================================================
   * SMART ADDRESS LINE 2 CLEANER
   * ============================================================
   * Detects if address_line_2 contains full address data 
   * (corrupted from Shipbubble validation) and returns clean data
   */
  private cleanAddressLine2(address: Address): string | null {
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
      addressLine2.includes(pattern!)
    );

    if (hasCorruptData) {
      this.logger.warn(`⚠️ Detected corrupted address_line_2: "${addressLine2}"`);
      return null; // Clear corrupted data
    }

    // It has commas but doesn't match our fields - keep it
    return addressLine2;
  }

  /**
   * ============================================================
   * ENHANCED: Get address by ID with user info for delivery
   * ============================================================
   */
  async getAddressByIdForDelivery(userId: string, addressId: string): Promise<DeliveryAddressData> {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, user_id: userId },
      relations: ['user'],
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return this.getFormattedAddressForDelivery(addressId);
  }

  /**
   * ============================================================
   * ENHANCED: Create address with automatic cleaning
   * ============================================================
   */
  async createAddress(userId: string, createRequest: CreateAddressRequest): Promise<Address> {
    return this.addressRepository.manager.transaction(async (transactionalEntityManager) => {
      try {
        // Clean address_line_2 before saving
        const cleanedAddressLine2 = createRequest.address_line_2 
          ? this.cleanAddressLine2({
              address_line_2: createRequest.address_line_2,
              city: createRequest.city,
              state: createRequest.state,
              country: createRequest.country,
              postal_code: createRequest.postal_code,
            } as Address)
          : null;

        // If coordinates are not provided, try to geocode the address
        let latitude = createRequest.latitude;
        let longitude = createRequest.longitude;

        if (!latitude || !longitude) {
          const geocodingResult = await this.geocodeAddress(createRequest);
          if (geocodingResult) {
            latitude = geocodingResult.latitude;
            longitude = geocodingResult.longitude;
          }
        }

        // If this is the first address or marked as default, set it as default
        if (createRequest.is_default) {
          // Clear current default address
          const currentDefault = await transactionalEntityManager.findOne(Address, {
            where: { user_id: userId, is_default: true },
          });

          if (currentDefault) {
            this.logger.log(`Clearing current default address ${currentDefault.id} for user ${userId}`);
            currentDefault.is_default = false;
            await transactionalEntityManager.save(Address, currentDefault);
          }
        }

        const address = transactionalEntityManager.create(Address, {
          user_id: userId,
          address_line_1: createRequest.address_line_1,
          address_line_2: cleanedAddressLine2,
          city: createRequest.city,
          state: createRequest.state,
          postal_code: createRequest.postal_code,
          country: createRequest.country || 'NG',
          latitude,
          longitude,
          address_type: createRequest.address_type || AddressType.HOME,
          is_default: createRequest.is_default || false,
        });

        const savedAddress = await transactionalEntityManager.save(Address, address);

        this.logger.log(`✅ Address created for user ${userId}: ${savedAddress.id}`);

        return savedAddress;
      } catch (error) {
        this.logger.error(`Failed to create address for user ${userId}:`, error);
        throw error;
      }
    });
  }

  /**
   * ============================================================
   * ENHANCED: Update address with automatic cleaning
   * ============================================================
   */
  async updateAddress(
    userId: string,
    addressId: string,
    updateRequest: UpdateAddressRequest,
  ): Promise<Address> {
    return this.addressRepository.manager.transaction(async (transactionalEntityManager) => {
      try {
        const address = await transactionalEntityManager.findOne(Address, {
          where: { id: addressId, user_id: userId },
        });

        if (!address) {
          throw new NotFoundException('Address not found');
        }

        // Clean address_line_2 if being updated
        if (updateRequest.address_line_2 !== undefined) {
          updateRequest.address_line_2 = this.cleanAddressLine2({
            address_line_2: updateRequest.address_line_2,
            city: updateRequest.city || address.city,
            state: updateRequest.state || address.state,
            country: updateRequest.country || address.country,
            postal_code: updateRequest.postal_code || address.postal_code,
          } as Address);
        }

        // If coordinates are being updated or address lines changed, re-geocode
        if (
          updateRequest.address_line_1 ||
          updateRequest.city ||
          updateRequest.state ||
          updateRequest.postal_code
        ) {
          const geocodingResult = await this.geocodeAddress({
            address_line_1: updateRequest.address_line_1 || address.address_line_1,
            city: updateRequest.city || address.city,
            state: updateRequest.state || address.state,
            postal_code: updateRequest.postal_code || address.postal_code,
            country: updateRequest.country || address.country,
          });

          if (geocodingResult) {
            updateRequest.latitude = geocodingResult.latitude;
            updateRequest.longitude = geocodingResult.longitude;
          }
        }

        // Clear ShipBubble address code if address fields are updated
        if (updateRequest.address_line_1 ||
          updateRequest.city ||
          updateRequest.state ||
          updateRequest.postal_code ||
          updateRequest.country ||
          updateRequest.latitude ||
          updateRequest.longitude) {
          address.shipbubble_address_code = null;
        }

        if (updateRequest.is_default === true) {
          // Clear current default address
          const currentDefault = await transactionalEntityManager.findOne(Address, {
            where: { user_id: userId, is_default: true },
          });

          if (currentDefault) {
            this.logger.log(`Clearing current default address ${currentDefault.id} for user ${userId}`);
            currentDefault.is_default = false;
            await transactionalEntityManager.save(Address, currentDefault);
          }
        }

        // Update address with correct field mapping
        if (updateRequest.address_line_1 !== undefined) address.address_line_1 = updateRequest.address_line_1;
        if (updateRequest.address_line_2 !== undefined) address.address_line_2 = updateRequest.address_line_2;
        if (updateRequest.city !== undefined) address.city = updateRequest.city;
        if (updateRequest.state !== undefined) address.state = updateRequest.state;
        if (updateRequest.postal_code !== undefined) address.postal_code = updateRequest.postal_code;
        if (updateRequest.country !== undefined) address.country = updateRequest.country;
        if (updateRequest.latitude !== undefined) address.latitude = updateRequest.latitude;
        if (updateRequest.longitude !== undefined) address.longitude = updateRequest.longitude;
        if (updateRequest.address_type !== undefined) address.address_type = updateRequest.address_type;
        if (updateRequest.is_default !== undefined) address.is_default = updateRequest.is_default;

        const updatedAddress = await transactionalEntityManager.save(Address, address);

        this.logger.log(`✅ Address ${addressId} updated for user ${userId}`);

        return updatedAddress;
      } catch (error) {
        this.logger.error(`Failed to update address ${addressId} for user ${userId}:`, error);
        throw error;
      }
    });
  }

  // ... [Keep all other existing methods unchanged] ...
  // getUserAddresses, getAddressById, deleteAddress, setDefaultAddress, 
  // getDefaultAddress, validateAddress, updateAddressCode, etc.

  async getUserAddresses(userId: string): Promise<Address[]> {
    await this.validateDefaultAddressConstraint(userId);
    return this.addressRepository.find({
      where: { user_id: userId },
      order: { is_default: 'DESC', created_at: 'ASC' },
    });
  }

  async getAddressById(userId: string, addressId: string): Promise<Address> {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, user_id: userId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  async getAddressByIdWithoutValidation(addressId: string): Promise<Address | null> {
    return await this.addressRepository.findOne({
      where: { id: addressId },
    });
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    await this.addressRepository.manager.transaction(async (manager) => {
      const address = await manager.findOne(Address, {
        where: { id: addressId, user_id: userId },
      });

      if (!address) {
        throw new NotFoundException('Address not found');
      }

      const isDefault = address.is_default;
      await manager.remove(Address, address);
      this.logger.log(`Address ${addressId} deleted for user ${userId}`);

      if (!isDefault) return;

      const newDefault = await manager.findOne(Address, {
        where: { user_id: userId, id: Not(addressId) },
        order: { created_at: 'ASC' },
      });

      if (newDefault) {
        newDefault.is_default = true;
        await manager.save(Address, newDefault);
        this.logger.log(`Address ${newDefault.id} set as default for user ${userId}`);
      }
    });
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<Address> {
    return this.addressRepository.manager.transaction(async (manager) => {
      const address = await manager.findOne(Address, {
        where: { id: addressId, user_id: userId },
      });

      if (!address) {
        throw new NotFoundException('Address not found');
      }

      if (address.is_default) {
        return address;
      }

      const currentDefault = await manager.findOne(Address, {
        where: { user_id: userId, is_default: true },
      });

      if (currentDefault) {
        currentDefault.is_default = false;
        await manager.save(Address, currentDefault);
      }

      address.is_default = true;
      return await manager.save(Address, address);
    });
  }

  async getDefaultAddress(userId: string): Promise<Address | null> {
    await this.validateDefaultAddressConstraint(userId);
    return this.addressRepository.findOne({
      where: { user_id: userId, is_default: true },
    });
  }

  async validateAddress(addressRequest: CreateAddressRequest): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (!addressRequest.address_line_1?.trim()) {
      errors.push('Address line 1 is required');
    }
    if (!addressRequest.city?.trim()) {
      errors.push('City is required');
    }
    if (!addressRequest.state?.trim()) {
      errors.push('State is required');
    }
    if (!addressRequest.postal_code?.trim()) {
      errors.push('Postal code is required');
    }

    if (addressRequest.country) {
      if (addressRequest.country.length !== 2) {
        errors.push('Country must be exactly 2 characters (ISO 3166-1 alpha-2 code)');
      } else if (!/^[A-Z]{2}$/.test(addressRequest.country)) {
        errors.push('Country must be a 2-letter uppercase ISO code (e.g., NG, US, UK)');
      }
    }

    if (addressRequest.latitude !== undefined) {
      if (addressRequest.latitude < -90 || addressRequest.latitude > 90) {
        errors.push('Invalid latitude value');
      }
    }

    if (addressRequest.longitude !== undefined) {
      if (addressRequest.longitude < -180 || addressRequest.longitude > 180) {
        errors.push('Invalid longitude value');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async updateAddressCode(addressId: string, addressCode: number): Promise<void> {
    this.logger.log(`Updating address ${addressId} with Shipbubble address code: ${addressCode}`);
    await this.addressRepository.update(addressId, {
      shipbubble_address_code: addressCode.toString(),
    });
  }

  private async validateDefaultAddressConstraint(userId: string): Promise<void> {
    const defaultAddresses = await this.addressRepository.find({
      where: { user_id: userId, is_default: true },
    });

    if (defaultAddresses.length > 1) {
      this.logger.warn(`Multiple default addresses found for user ${userId}, fixing constraint violation`);
      for (let i = 1; i < defaultAddresses.length; i++) {
        defaultAddresses[i].is_default = false;
        await this.addressRepository.save(defaultAddresses[i]);
      }
    }
  }

  private async geocodeAddress(addressRequest: CreateAddressRequest): Promise<GeocodingResult | null> {
    if (!this.geocodingEnabled) {
      this.logger.debug('Geocoding service not available');
      return null;
    }

    try {
      const addressString = [
        addressRequest.address_line_1,
        addressRequest.address_line_2,
        addressRequest.city,
        addressRequest.state,
        addressRequest.postal_code,
        addressRequest.country || 'NG',
      ]
        .filter(Boolean)
        .join(', ');

      if (this.configService.get('GOOGLE_MAPS_API_KEY')) {
        return await this.geocodeWithGoogle(addressString);
      }

      if (this.configService.get('MAPBOX_ACCESS_TOKEN')) {
        return await this.geocodeWithMapbox(addressString, addressRequest.country);
      }

      return null;
    } catch (error) {
      this.logger.warn('Geocoding failed:', error.message);
      return null;
    }
  }

  private async geocodeWithGoogle(address: string): Promise<GeocodingResult | null> {
    const apiKey = this.configService.get('GOOGLE_MAPS_API_KEY');
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;

        return {
          latitude: location.lat,
          longitude: location.lng,
          formattedAddress: result.formatted_address,
          confidence: 0.8,
        };
      }

      return null;
    } catch (error) {
      this.logger.error('Google Geocoding API error:', error);
      return null;
    }
  }

  private async geocodeWithMapbox(address: string, country?: string): Promise<GeocodingResult | null> {
    const accessToken = this.configService.get('MAPBOX_ACCESS_TOKEN');
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${accessToken}&country=${country}&types=address`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [longitude, latitude] = feature.center;

        return {
          latitude,
          longitude,
          formattedAddress: feature.place_name,
          confidence: feature.relevance,
        };
      }

      return null;
    } catch (error) {
      this.logger.error('Mapbox Geocoding API error:', error);
      return null;
    }
  }

  async calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): Promise<number> {
    const R = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
      Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}