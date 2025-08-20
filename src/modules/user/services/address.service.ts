import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address, AddressType } from '../../../entities';
import { ConfigService } from '@nestjs/config';

import { CreateAddressDto, UpdateAddressDto } from '../dto';

export interface CreateAddressRequest extends CreateAddressDto {}
export interface UpdateAddressRequest extends UpdateAddressDto {}

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  confidence: number;
}

@Injectable()
export class AddressService {
  private readonly logger = new Logger(AddressService.name);
  private readonly geocodingEnabled: boolean;

  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly configService: ConfigService,
  ) {
    this.geocodingEnabled = !!(
      this.configService.get('GOOGLE_MAPS_API_KEY') ||
      this.configService.get('MAPBOX_ACCESS_TOKEN')
    );
  }

  async createAddress(userId: string, createRequest: CreateAddressRequest): Promise<Address> {
    return this.addressRepository.manager.transaction(async (transactionalEntityManager) => {
      try {
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
      address_line_2: createRequest.address_line_2,
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
    
    this.logger.log(`Address created for user ${userId}: ${savedAddress.id}`);
    
    return savedAddress;
      } catch (error) {
        this.logger.error(`Failed to create address for user ${userId}:`, error);
        throw error;
      }
    });
  }

  async getUserAddresses(userId: string): Promise<Address[]> {
    // Validate and fix any constraint violations before returning addresses
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

    if(updateRequest.is_default === true) {
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
    
    this.logger.log(`Address ${addressId} updated for user ${userId}`);
    
    return updatedAddress;
      } catch (error) {
        this.logger.error(`Failed to update address ${addressId} for user ${userId}:`, error);
        throw error;
      }
    });
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    await this.addressRepository.manager.transaction(async (transactionalEntityManager) => {
      try {
        const address = await transactionalEntityManager.findOne(Address, {
          where: { id: addressId, user_id: userId },
        });

        if (!address) {
          throw new NotFoundException('Address not found');
        }

    // If deleting default address, set another address as default
    if (address.is_default) {
          // First clear the current default
          const currentDefault = await transactionalEntityManager.findOne(Address, {
            where: { user_id: userId, is_default: true },
          });

          if (currentDefault) {
            this.logger.log(`Clearing current default address ${currentDefault.id} for user ${userId}`);
            currentDefault.is_default = false;
            await transactionalEntityManager.save(Address, currentDefault);
          }
          
          const otherAddresses = await transactionalEntityManager.find(Address, {
        where: { user_id: userId, id: { not: addressId } as any },
        order: { created_at: 'ASC' },
        take: 1,
      });

      if (otherAddresses.length > 0) {
            this.logger.log(`Setting address ${otherAddresses[0].id} as new default for user ${userId}`);
        otherAddresses[0].is_default = true;
            await transactionalEntityManager.save(Address, otherAddresses[0]);
      }
    }

        await transactionalEntityManager.remove(Address, address);
    
    this.logger.log(`Address ${addressId} deleted for user ${userId}`);
      } catch (error) {
        this.logger.error(`Failed to delete address ${addressId} for user ${userId}:`, error);
        throw error;
      }
    });
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<Address> {
    return this.addressRepository.manager.transaction(async (transactionalEntityManager) => {
      try {
        const address = await transactionalEntityManager.findOne(Address, {
          where: { id: addressId, user_id: userId },
        });

        if (!address) {
          throw new NotFoundException('Address not found');
        }

        // Check if this address is already the default
        if (address.is_default) {
          this.logger.log(`Address ${addressId} is already the default for user ${userId}`);
          return address;
        }

    // Clear current default address
        const currentDefault = await transactionalEntityManager.findOne(Address, {
          where: { user_id: userId, is_default: true },
        });

        if (currentDefault) {
          this.logger.log(`Clearing current default address ${currentDefault.id} for user ${userId}`);
          currentDefault.is_default = false;
          await transactionalEntityManager.save(Address, currentDefault);
        }

    // Set new default address
    address.is_default = true;
    
        const updatedAddress = await transactionalEntityManager.save(Address, address);
    
    this.logger.log(`Address ${addressId} set as default for user ${userId}`);
    
    return updatedAddress;
      } catch (error) {
        this.logger.error(`Failed to set address ${addressId} as default for user ${userId}:`, error);
        throw error;
      }
    });
  }

  async getDefaultAddress(userId: string): Promise<Address | null> {
    // Validate and fix any constraint violations before getting default address
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

    // Validate country if provided
    if (addressRequest.country) {
      if (addressRequest.country.length !== 2) {
        errors.push('Country must be exactly 2 characters (ISO 3166-1 alpha-2 code)');
      } else if (!/^[A-Z]{2}$/.test(addressRequest.country)) {
        errors.push('Country must be a 2-letter uppercase ISO code (e.g., NG, US, UK)');
      }
    }

    // Validate coordinates if provided
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

  private async clearDefaultAddress(userId: string): Promise<void> {
    // Find the current default address first
    const currentDefault = await this.addressRepository.findOne({
      where: { user_id: userId, is_default: true },
    });

    // Only update if there's actually a default address to clear
    if (currentDefault) {
      currentDefault.is_default = false;
      await this.addressRepository.save(currentDefault);
    }
  }

  private async canSetAsDefault(userId: string, addressId: string): Promise<boolean> {
    // Check if the address exists and belongs to the user
    const address = await this.addressRepository.findOne({
      where: { id: addressId, user_id: userId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // Check if this address is already the default
    if (address.is_default) {
      return false; // Already default, no need to change
    }

    return true;
  }

  private async validateDefaultAddressConstraint(userId: string, addressId?: string): Promise<void> {
    // Check if there are multiple default addresses for this user
    const defaultAddresses = await this.addressRepository.find({
      where: { user_id: userId, is_default: true },
    });

    if (defaultAddresses.length > 1) {
      this.logger.warn(`Multiple default addresses found for user ${userId}, fixing constraint violation`);
      
      // Keep only the first one as default, set others to false
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

      // Try Google Maps Geocoding API first
      if (this.configService.get('GOOGLE_MAPS_API_KEY')) {
        return await this.geocodeWithGoogle(addressString);
      }

      // Fallback to Mapbox
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
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address,
    )}&key=${apiKey}`;

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
          confidence: 0.8, // Google doesn't provide confidence score
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
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      address,
    )}.json?access_token=${accessToken}&country=${country}&types=address`;

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

  async calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): Promise<number> {
    // Haversine formula to calculate distance between two points
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
} 