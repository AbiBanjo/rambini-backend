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
  // Cache to track logged addresses and prevent duplicate logs
  private static loggedAddresses = new Map<string, number>();
  private static readonly LOG_THROTTLE_MS = 60000; // Only log same address once per minute

  /**
   * Generate a unique key for an address to track logging
   */
  private static getAddressKey(address: AddressComponents): string {
    return `${address.address_line_1}_${address.city}_${address.state}`;
  }

  /**
   * Check if we should log this address (throttling mechanism)
   */
  private static shouldLogAddress(address: AddressComponents): boolean {
    const key = this.getAddressKey(address);
    const lastLogged = this.loggedAddresses.get(key);
    const now = Date.now();

    if (!lastLogged || now - lastLogged > this.LOG_THROTTLE_MS) {
      this.loggedAddresses.set(key, now);
      return true;
    }

    return false;
  }

  /**
   * Clear old entries from the log cache (cleanup to prevent memory leaks)
   */
  private static cleanupLogCache(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.loggedAddresses.entries()) {
      if (now - timestamp > this.LOG_THROTTLE_MS * 2) {
        this.loggedAddresses.delete(key);
      }
    }
  }

  /**
   * Detect if address_line_2 contains corrupted/duplicate data
   * Returns cleaned address_line_2 or null if it should be skipped
   */
  static cleanAddressLine2(
    addressLine1: string | undefined,
    addressLine2: string | undefined,
    city: string | undefined,
    state: string | undefined,
    country: string | undefined
  ): string | null {
    if (!addressLine2 || !addressLine2.trim()) {
      return null;
    }

    const line2Lower = addressLine2.toLowerCase().trim();
    const line1Lower = (addressLine1 || '').toLowerCase().trim();

    // Check if address_line_2 contains city, state, or country (signs of corruption)
    const cityLower = (city || '').toLowerCase().trim();
    const stateLower = (state || '').toLowerCase().trim();
    const countryLower = (country || '').toLowerCase().trim();

    const hasCity = cityLower && line2Lower.includes(cityLower);
    const hasState = stateLower && line2Lower.includes(stateLower);
    const hasCountry = countryLower && line2Lower.includes(countryLower);

    // Check if line2 is substantially similar to line1 (possible duplication)
    const isSimilarToLine1 = line1Lower && line2Lower.includes(line1Lower.substring(0, 20));

    // If corrupted, return null to skip it
    if (hasCity || hasState || hasCountry || isSimilarToLine1) {
      return null;
    }

    return addressLine2.trim();
  }

  /**
   * Format address object into a complete address string with smart corruption handling
   */
  static formatFullAddress(
    address: AddressComponents,
    options?: { enableLogging?: boolean; logger?: any }
  ): string {
    if (!address) return '';

    // Clean up log cache periodically
    if (Math.random() < 0.01) { // 1% chance on each call
      this.cleanupLogCache();
    }

    // Clean address_line_2 to prevent corruption
    const cleanedLine2 = this.cleanAddressLine2(
      address.address_line_1,
      address.address_line_2,
      address.city,
      address.state,
      address.country
    );

    const isCorrupted = address.address_line_2 && !cleanedLine2;

    // Only log if enabled, logger provided, corrupted, and not recently logged
    if (options?.enableLogging && options?.logger && isCorrupted) {
      if (this.shouldLogAddress(address)) {
        options.logger.warn(
          `⚠️ Skipped corrupted address_line_2: "${address.address_line_2}" ` +
          `for address: ${address.address_line_1}, ${address.city}`
        );
      }
    }

    const parts = [
      address.address_line_1?.trim(),
      cleanedLine2,
      address.city?.trim(),
      address.state?.trim(),
      address.postal_code?.trim(),
      address.country?.trim(),
    ].filter(part => part && part.length > 0);

    return parts.join(', ');
  }

  /**
   * Format address for display with line breaks
   */
  static formatAddressWithLineBreaks(
    address: AddressComponents,
    options?: { enableLogging?: boolean; logger?: any }
  ): string {
    if (!address) return '';

    const lines = [];
    
    const street1 = address.address_line_1?.trim();
    const cleanedLine2 = this.cleanAddressLine2(
      address.address_line_1,
      address.address_line_2,
      address.city,
      address.state,
      address.country
    );
    
    if (street1) lines.push(street1);
    if (cleanedLine2) lines.push(cleanedLine2);
    
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
   */
  static formatAddressForHTML(
    address: AddressComponents,
    options?: { enableLogging?: boolean; logger?: any }
  ): string {
    return this.formatAddressWithLineBreaks(address, options).replace(/\n/g, '<br>');
  }

  /**
   * Extract formatted address components for API responses
   */
  static extractAddressComponents(
    address: AddressComponents,
    options?: { enableLogging?: boolean; logger?: any }
  ): FormattedAddressComponents {
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

    const cleanedLine2 = this.cleanAddressLine2(
      address.address_line_1,
      address.address_line_2,
      address.city,
      address.state,
      address.country
    );

    return {
      street: address.address_line_1 || '',
      streetLine2: cleanedLine2 || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postal_code || '',
      country: address.country || '',
      latitude: address.latitude,
      longitude: address.longitude,
    };
  }

  /**
   * Parse address components from full address string
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
   * Format address for single-line display (truncated if too long)
   */
  static formatAddressCompact(
    address: AddressComponents,
    maxLength: number = 50,
    options?: { enableLogging?: boolean; logger?: any }
  ): string {
    const fullAddress = this.formatFullAddress(address, options);
    
    if (fullAddress.length <= maxLength) {
      return fullAddress;
    }
    
    return fullAddress.substring(0, maxLength - 3) + '...';
  }

  /**
   * Format address for shipping label
   */
  static formatForShippingLabel(
    address: AddressComponents,
    options?: { enableLogging?: boolean; logger?: any }
  ): {
    recipientLine: string;
    streetLines: string[];
    cityStateZip: string;
    country: string;
  } {
    const cleanedLine2 = this.cleanAddressLine2(
      address.address_line_1,
      address.address_line_2,
      address.city,
      address.state,
      address.country
    );

    const streetLines = [
      address.address_line_1,
      cleanedLine2,
    ].filter(Boolean);

    const cityStateZip = [
      address.city,
      address.state,
      address.postal_code,
    ].filter(Boolean).join(', ');

    return {
      recipientLine: '',
      streetLines,
      cityStateZip,
      country: address.country || '',
    };
  }

  /**
   * Validate if address has minimum required fields
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
   */
  static formatAddressShort(
    address: AddressComponents,
    options?: { enableLogging?: boolean; logger?: any }
  ): string {
    if (!address) return '';

    const parts = [
      address.address_line_1,
      address.city,
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Format coordinates for display
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

  /**
   * Reset the logging cache (useful for testing or manual cleanup)
   */
  static resetLogCache(): void {
    this.loggedAddresses.clear();
  }
}