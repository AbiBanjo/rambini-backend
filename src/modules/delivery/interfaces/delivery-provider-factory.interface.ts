import { ShipbubbleProviderInterface } from './shipbubble-provider.interface';
import { UberProviderInterface } from './uber-provider.interface';

/**
 * Delivery provider factory interface for geographic-based routing
 */
export interface DeliveryProviderFactoryInterface {
  /**
   * Get the appropriate delivery provider based on country
   * @param country Country code (e.g., 'NG', 'US', 'CA')
   * @returns ShipbubbleProviderInterface | UberProviderInterface
   */
  getProviderByCountry(country: string): ShipbubbleProviderInterface | UberProviderInterface;

  /**
   * Get Shipbubble provider (Nigeria-specific)
   * @returns ShipbubbleProviderInterface
   */
  getShipbubbleProvider(): ShipbubbleProviderInterface;

  /**
   * Get Uber provider (International)
   * @returns UberProviderInterface
   */
  getUberProvider(): UberProviderInterface;

  /**
   * Check if country is supported by any provider
   * @param country Country code
   * @returns boolean
   */
  isCountrySupported(country: string): boolean;

  /**
   * Get all supported countries
   * @returns string[]
   */
  getSupportedCountries(): string[];
}
