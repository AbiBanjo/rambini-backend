import { BaseDeliveryProviderInterface } from './base-delivery-provider.interface';
import {
  AddressValidationDto,
  AddressValidationResponseDto,
  DeliveryWebhookDto,
  ShipbubbleShippingRatesRequestDto,
  ShipbubbleShippingRatesResponseDto,
  ShipbubblePackageCategoriesResponseDto,
  ShipbubblePackageDimensionsResponseDto,
  ShipbubbleCreateShipmentRequestDto,
  ShipbubbleCreateShipmentResponseDto,
} from '../dto';

/**
 * Shipbubble-specific delivery provider interface
 * Handles Nigeria-based deliveries with Shipbubble's API structure
 */
export interface ShipbubbleProviderInterface extends BaseDeliveryProviderInterface {
  /**
   * Validate address using Shipbubble's address validation API
   * @param addressData Address validation data
   * @returns Promise<AddressValidationResponseDto>
   */
  validateAddress(addressData: {
    name: string;
    email: string;
    phone: string;
    address: string;
    latitude?: number;
    longitude?: number;
  }): Promise<{
    success: boolean;
    isValid: boolean;
    data?: {
      name: string;
      email: string;
      phone: string;
      formatted_address: string;
      country: string;
      country_code: string;
      city: string;
      city_code: string;
      state: string;
      state_code: string;
      postal_code: string;
      latitude: number;
      longitude: number;
      address_code: number;
    };
    error?: string;
  }>;

  /**
   * Fetch shipping rates using Shipbubble's rates API
   * @param ratesRequest Shipbubble-specific rates request
   * @returns Promise<ShipbubbleShippingRatesResponseDto>
   */
  fetchShippingRates(ratesRequest: ShipbubbleShippingRatesRequestDto): Promise<ShipbubbleShippingRatesResponseDto>;

  /**
   * Get package categories for shipping
   * @returns Promise<ShipbubblePackageCategoriesResponseDto>
   */
  getPackageCategories(): Promise<ShipbubblePackageCategoriesResponseDto>;

  /**
   * Get package dimensions for shipping
   * @returns Promise<ShipbubblePackageDimensionsResponseDto>
   */
  getPackageDimensions(): Promise<ShipbubblePackageDimensionsResponseDto>;

  /**
   * Create shipment label using request token from rates API
   * @param shipmentRequest Shipment creation request
   * @returns Promise<ShipbubbleCreateShipmentResponseDto>
   */
  createShipmentLabel(shipmentRequest: ShipbubbleCreateShipmentRequestDto): Promise<ShipbubbleCreateShipmentResponseDto>;

  /**
   * Track shipment using Shipbubble's tracking API
   * @param trackingNumber Tracking number
   * @returns Promise<any>
   */
  trackShipment(trackingNumber: string): Promise<{
    success: boolean;
    trackingNumber: string;
    status: string;
    statusDescription?: string;
    currentLocation?: string;
    events?: Array<{
      timestamp: Date;
      status: string;
      description: string;
      location?: string;
    }>;
    estimatedDelivery?: Date;
    courier?: string;
    service?: string;
    error?: string;
  }>;

  /**
   * Cancel shipment
   * @param trackingNumber Tracking number
   * @returns Promise<boolean>
   */
  cancelShipment(trackingNumber: string): Promise<boolean>;

  /**
   * Process Shipbubble webhook events
   * @param payload Webhook payload
   * @param signature Webhook signature
   * @returns Promise<DeliveryWebhookDto>
   */
  processWebhook(payload: any, signature: string): Promise<DeliveryWebhookDto>;

  /**
   * Get available couriers
   * @returns Promise<any[]>
   */
  getCouriers(): Promise<any[]>;
}
