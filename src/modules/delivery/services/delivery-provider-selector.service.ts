import { Injectable } from '@nestjs/common';
import { DeliveryProvider } from 'src/entities';

@Injectable()
export class DeliveryProviderSelectorService {
  /**
   * Select the appropriate delivery provider based on country
   * @param country Country code (e.g., 'NG', 'US', 'CA')
   * @returns DeliveryProvider
   */
  selectProvider(country: string): DeliveryProvider {
    const countryCode = country.toUpperCase();
    
    // Nigeria uses Shipbubble
    if (countryCode === 'NG') {
      return DeliveryProvider.SHIPBUBBLE;
    }
    
    // All other countries use Uber
    // This includes US, CA, UK, AU, etc.
    return DeliveryProvider.UBER;
  }

  /**
   * Get available providers for a specific country
   * @param country Country code
   * @returns Array of available providers
   */
  getAvailableProviders(country: string): DeliveryProvider[] {
    const countryCode = country.toUpperCase();
    
    if (countryCode === 'NG') {
      return [DeliveryProvider.SHIPBUBBLE];
    }
    
    return [DeliveryProvider.UBER];
  }

  /**
   * Check if a provider is available in a specific country
   * @param provider Delivery provider
   * @param country Country code
   * @returns boolean
   */
  isProviderAvailable(provider: DeliveryProvider, country: string): boolean {
    const availableProviders = this.getAvailableProviders(country);
    return availableProviders.includes(provider);
  }

  /**
   * Get the default provider for a country
   * @param country Country code
   * @returns DeliveryProvider
   */
  getDefaultProvider(country: string): DeliveryProvider {
    return this.selectProvider(country);
  }
}
