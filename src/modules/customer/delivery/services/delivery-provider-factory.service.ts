import { Injectable, Logger } from '@nestjs/common';
import { DeliveryProviderFactoryInterface } from '../interfaces/delivery-provider-factory.interface';
import { ShipbubbleProviderInterface } from '../interfaces/shipbubble-provider.interface';
import { UberProviderInterface } from '../interfaces/uber-provider.interface';
import { ShipbubbleDeliveryService } from './shipbubble-delivery.service';
import { UberDeliveryService } from './uber-delivery.service';

@Injectable()
export class DeliveryProviderFactoryService implements DeliveryProviderFactoryInterface {
  private readonly logger = new Logger(DeliveryProviderFactoryService.name);

  constructor(
    private readonly shipbubbleService: ShipbubbleDeliveryService,
    private readonly uberService: UberDeliveryService,
  ) {}
  getProviderByCountry(country: string): ShipbubbleProviderInterface | UberProviderInterface {
    const normalizedCountry = country.toUpperCase();
    
    if (normalizedCountry === 'NG' || normalizedCountry === 'NIGERIA') {
      this.logger.log(`Using Shipbubble for country: ${country}`);
      return this.shipbubbleService;
    } else {
      this.logger.log(`Using Uber Direct for country: ${country}`);
      return this.uberService;
    }
  }

  /**
   * Get Shipbubble provider (Nigeria-specific)
   */
  getShipbubbleProvider(): ShipbubbleProviderInterface {
    return this.shipbubbleService;
  }

  /**
   * Get Uber provider (International)
   */
  getUberProvider(): UberProviderInterface {
    return this.uberService;
  }

  /**
   * Check if country is supported by any provider
   */
  isCountrySupported(country: string): boolean {
    const normalizedCountry = country.toUpperCase();
    
    // Nigeria is supported by Shipbubble
    if (normalizedCountry === 'NG' || normalizedCountry === 'NIGERIA') {
      return true;
    }
    
    // Check if Uber supports this country
    const uberSupportedCountries = this.uberService.getSupportedCountries();
    return uberSupportedCountries.includes(normalizedCountry);
  }

  /**
   * Get all supported countries from both providers
   */
  getSupportedCountries(): string[] {
    const shipbubbleCountries = this.shipbubbleService.getSupportedCountries();
    const uberCountries = this.uberService.getSupportedCountries();
    
    // Combine and remove duplicates
    return [...new Set([...shipbubbleCountries, ...uberCountries])];
  }

  /**
   * Get provider name for a given country
   */
  getProviderNameByCountry(country: string): string {
    const provider = this.getProviderByCountry(country);
    return provider.getProviderName();
  }

  /**
   * Check if a country uses Shipbubble
   */
  isShipbubbleCountry(country: string): boolean {
    const normalizedCountry = country.toUpperCase();
    return normalizedCountry === 'NG' || normalizedCountry === 'NIGERIA';
  }

  /**
   * Check if a country uses Uber Direct
   */
  isUberCountry(country: string): boolean {
    return !this.isShipbubbleCountry(country) && this.isCountrySupported(country);
  }
}
