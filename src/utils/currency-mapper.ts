import { Currency } from '../entities';

/**
 * Maps country codes (ISO 3166-1 alpha-2) to their respective currencies
 */
export const COUNTRY_CURRENCY_MAP: Record<string, Currency> = {
  // Nigeria
  'NG': Currency.NGN,
  
  // United States
  'US': Currency.USD,
  
  // European Union countries
  'AT': Currency.EUR, // Austria
  'BE': Currency.EUR, // Belgium
  'CY': Currency.EUR, // Cyprus
  'EE': Currency.EUR, // Estonia
  'FI': Currency.EUR, // Finland
  'FR': Currency.EUR, // France
  'DE': Currency.EUR, // Germany
  'GR': Currency.EUR, // Greece
  'IE': Currency.EUR, // Ireland
  'IT': Currency.EUR, // Italy
  'LV': Currency.EUR, // Latvia
  'LT': Currency.EUR, // Lithuania
  'LU': Currency.EUR, // Luxembourg
  'MT': Currency.EUR, // Malta
  'NL': Currency.EUR, // Netherlands
  'PT': Currency.EUR, // Portugal
  'SK': Currency.EUR, // Slovakia
  'SI': Currency.EUR, // Slovenia
  'ES': Currency.EUR, // Spain
  
  // United Kingdom
  'GB': Currency.GBP,
  
  // Add more countries as needed
  'CA': Currency.USD, // Canada (using USD as fallback)
  'AU': Currency.USD, // Australia (using USD as fallback)
  'JP': Currency.USD, // Japan (using USD as fallback)
  'IN': Currency.USD, // India (using USD as fallback)
  'BR': Currency.USD, // Brazil (using USD as fallback)
  'MX': Currency.USD, // Mexico (using USD as fallback)
  'ZA': Currency.USD, // South Africa (using USD as fallback)
  'EG': Currency.USD, // Egypt (using USD as fallback)
  'KE': Currency.USD, // Kenya (using USD as fallback)
  'GH': Currency.USD, // Ghana (using USD as fallback)
};

/**
 * Gets the currency for a given country code
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns Currency enum value, defaults to NGN if country not found
 */
export function getCurrencyForCountry(countryCode?: string): Currency {
  if (!countryCode) {
    return Currency.NGN; // Default to Nigerian Naira
  }
  
  const upperCaseCountryCode = countryCode.toUpperCase();
  return COUNTRY_CURRENCY_MAP[upperCaseCountryCode] || Currency.NGN;
}

/**
 * Validates if a country code is supported
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns boolean indicating if country is supported
 */
export function isCountrySupported(countryCode: string): boolean {
  const upperCaseCountryCode = countryCode.toUpperCase();
  return upperCaseCountryCode in COUNTRY_CURRENCY_MAP;
}

/**
 * Gets all supported country codes
 * @returns Array of supported country codes
 */
export function getSupportedCountries(): string[] {
  return Object.keys(COUNTRY_CURRENCY_MAP);
}

/**
 * Gets all supported currencies
 * @returns Array of supported currencies
 */
export function getSupportedCurrencies(): Currency[] {
  return Object.values(Currency);
}
