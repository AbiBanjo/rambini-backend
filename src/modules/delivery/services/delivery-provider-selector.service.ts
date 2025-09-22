import { Injectable } from '@nestjs/common';
import { DeliveryProvider } from 'src/entities';

@Injectable()
export class DeliveryProviderSelectorService {
 
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


  getAvailableProviders(country: string): DeliveryProvider[] {
    const countryCode = country.toUpperCase();
    
    if (countryCode === 'NG') {
      return [DeliveryProvider.SHIPBUBBLE];
    }
    
    return [DeliveryProvider.UBER];
  }

  isProviderAvailable(provider: DeliveryProvider, country: string): boolean {
    const availableProviders = this.getAvailableProviders(country);
    return availableProviders.includes(provider);
  }

  getDefaultProvider(country: string): DeliveryProvider {
    return this.selectProvider(country);
  }
}
