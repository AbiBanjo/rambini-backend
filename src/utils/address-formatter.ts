// src/utils/address-formatter.ts

export interface AddressComponents {
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface FormattedAddressComponents {
  street: string;
  streetLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export class AddressFormatter {
  /**
   * Format address object into a complete address string
   * Format: "Street, Street2, City, State, PostalCode, Country"
   * 
   * @param address - Address object with components
   * @returns Formatted address string with comma separators
   * 
   * @example
   * formatFullAddress({ 
   *   address_line_1: '123 Main St',
   *   city: 'Lagos',
   *   state: 'Lagos State',
   *   country: 'NG'
   * })
   * // Returns: "123 Main St, Lagos, Lagos State, NG"
   */
  static formatFullAddress(address: AddressComponents): string {
    if (!address) return '';

    const parts = [
      address.address_line_1?.trim(),
      address.address_line_2?.trim(),
      address.city?.trim(),
      address.state?.trim(),
      address.postal_code?.trim(),
      address.country?.trim(),
    ].filter(part => part && part.length > 0); // Remove null/undefined/empty values

    return parts.join(', ');
  }

  /**
   * Format address for display with line breaks
   * Useful for multi-line displays like address labels or shipping forms
   * 
   * @param address - Address object with components
   * @returns Formatted address string with line breaks
   * 
   * @example
   * formatAddressWithLineBreaks({
   *   address_line_1: '123 Main St',
   *   address_line_2: 'Suite 100',
   *   city: 'Lagos',
   *   state: 'Lagos State',
   *   postal_code: '100001',
   *   country: 'Nigeria'
   * })
   * // Returns:
   * // "123 Main St
   * //  Suite 100
   * //  Lagos, Lagos State, 100001
   * //  Nigeria"
   */
  static formatAddressWithLineBreaks(address: AddressComponents): string {
    if (!address) return '';

    const lines = [];
    
    const street1 = address.address_line_1?.trim();
    const street2 = address.address_line_2?.trim();
    
    if (street1) lines.push(street1);
    if (street2) lines.push(street2);
    
    const cityStateZip = [
      address.city?.trim(),
      address.state?.trim(),
      address.postal_code?.trim(),
    ].filter(part => part && part.length > 0).join(', ');
    
    if (cityStateZip) lines.push(cityStateZip);
    
    const country = address.country?.trim();
    if (country) lines.push(country);

    return lines.join('\n');
  }

  /**
   * Format address for HTML display with line breaks
   * Uses <br> tags instead of \n for HTML rendering
   * 
   * @param address - Address object with components
   * @returns Formatted address string with HTML line breaks
   */
  static formatAddressForHTML(address: AddressComponents): string {
    return this.formatAddressWithLineBreaks(address).replace(/\n/g, '<br>');
  }

  /**
   * Parse address components from full address string
   * Useful when you need to extract components from a formatted address
   * 
   * @param fullAddress - Full address string (comma-separated)
   * @returns Object with parsed address components
   * 
   * @example
   * parseAddressComponents("123 Main St, Lagos, Lagos State, Nigeria")
   * // Returns: { street: '123 Main St', city: 'Lagos', state: 'Lagos State', country: 'Nigeria' }
   */
  static parseAddressComponents(fullAddress: string): {
    street: string;
    city: string;
    state: string;
    country: string;
  } {
    if (!fullAddress) {
      return { street: '', city: '', state: '', country: '' };
    }

    const parts = fullAddress.split(',').map(p => p.trim());
    
    return {
      street: parts[0] || '',
      city: parts[1] || '',
      state: parts[2] || '',
      country: parts[3] || '',
    };
  }

  /**
   * Extract formatted address components for API responses
   * Provides a clean structure for frontend consumption
   * 
   * @param address - Address object with components
   * @returns Structured address components object
   */
  static extractAddressComponents(address: AddressComponents): FormattedAddressComponents {
    if (!address) {
      return {
        street: '',
        streetLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
      };
    }

    return {
      street: address.address_line_1 || '',
      streetLine2: address.address_line_2 || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postal_code || '',
      country: address.country || '',
      latitude: address.latitude,
      longitude: address.longitude,
    };
  }

  /**
   * Format address for single-line display (truncated if too long)
   * Useful for tables or compact displays
   * 
   * @param address - Address object with components
   * @param maxLength - Maximum character length (default: 50)
   * @returns Truncated formatted address
   */
  static formatAddressCompact(address: AddressComponents, maxLength: number = 50): string {
    const fullAddress = this.formatFullAddress(address);
    
    if (fullAddress.length <= maxLength) {
      return fullAddress;
    }
    
    return fullAddress.substring(0, maxLength - 3) + '...';
  }

  /**
   * Format address for shipping label
   * Returns address in a structured format suitable for shipping labels
   * 
   * @param address - Address object with components
   * @returns Object with formatted shipping address parts
   */
  static formatForShippingLabel(address: AddressComponents): {
    recipientLine: string;
    streetLines: string[];
    cityStateZip: string;
    country: string;
  } {
    const streetLines = [
      address.address_line_1,
      address.address_line_2,
    ].filter(Boolean);

    const cityStateZip = [
      address.city,
      address.state,
      address.postal_code,
    ].filter(Boolean).join(', ');

    return {
      recipientLine: '', // This should be filled with recipient name from order
      streetLines,
      cityStateZip,
      country: address.country || '',
    };
  }

  /**
   * Validate if address has minimum required fields
   * 
   * @param address - Address object to validate
   * @returns True if address has required fields
   */
  static isValidAddress(address: AddressComponents): boolean {
    return !!(
      address &&
      address.address_line_1 &&
      address.city &&
      address.state &&
      address.country
    );
  }

  /**
   * Get short address (street + city only)
   * Useful for compact displays or maps
   * 
   * @param address - Address object with components
   * @returns Short formatted address
   */
  static formatAddressShort(address: AddressComponents): string {
    if (!address) return '';

    const parts = [
      address.address_line_1,
      address.city,
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Format coordinates for display
   * 
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @param precision - Number of decimal places (default: 4)
   * @returns Formatted coordinates string
   */
  static formatCoordinates(
    latitude?: number,
    longitude?: number,
    precision: number = 4
  ): string {
    if (latitude === undefined || longitude === undefined) {
      return '';
    }

    return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
  }

  /**
   * Get Google Maps URL for address
   * 
   * @param address - Address object with components
   * @returns Google Maps URL
   */
  static getGoogleMapsUrl(address: AddressComponents): string {
    if (address.latitude && address.longitude) {
      return `https://www.google.com/maps?q=${address.latitude},${address.longitude}`;
    }

    const fullAddress = this.formatFullAddress(address);
    if (fullAddress) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
    }

    return '';
  }
}