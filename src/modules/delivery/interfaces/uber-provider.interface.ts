import { BaseDeliveryProviderInterface } from './base-delivery-provider.interface';
import {
  AddressValidationDto,
  AddressValidationResponseDto,
  DeliveryWebhookDto,
  UberDirectDeliveryQuoteRequestDto,
  UberDirectDeliveryQuoteResponseDto,
  UberDirectCreateDeliveryRequestDto,
  UberDirectCreateDeliveryResponseDto,
  UberDirectDeliveryDetailsDto,
} from '../dto';
import { StoreLocation, DeliveryQuoteDetails, ProofOfDelivery } from './enhanced-delivery-provider.interface';

/**
 * Uber Direct-specific delivery provider interface
 * Handles international deliveries with Uber's API structure
 */
export interface UberProviderInterface extends BaseDeliveryProviderInterface {
  /**
   * Validate address using Uber's geocoding API
   * @param address Address to validate
   * @returns Promise<AddressValidationResponseDto>
   */
  validateAddress(address: AddressValidationDto): Promise<AddressValidationResponseDto>;

  /**
   * Create a delivery quote using Uber Direct API
   * @param quoteRequest Quote request parameters
   * @returns Promise<UberDirectDeliveryQuoteResponseDto>
   */
  createDeliveryQuote(quoteRequest: UberDirectDeliveryQuoteRequestDto): Promise<UberDirectDeliveryQuoteResponseDto>;

  /**
   * Create a delivery using Uber Direct API
   * @param deliveryRequest Delivery creation request
   * @returns Promise<UberDirectCreateDeliveryResponseDto>
   */
  createDelivery(deliveryRequest: UberDirectCreateDeliveryRequestDto): Promise<UberDirectCreateDeliveryResponseDto>;

  /**
   * Get delivery details using Uber Direct API
   * @param deliveryId Delivery ID
   * @returns Promise<UberDirectDeliveryDetailsDto>
   */
  getDelivery(deliveryId: string): Promise<UberDirectDeliveryDetailsDto>;

  /**
   * Confirm a delivery quote
   * @param quoteId Quote ID to confirm
   * @returns Promise<boolean>
   */
  confirmDeliveryQuote(quoteId: string): Promise<boolean>;

  /**
   * Get store locations for pickup
   * @param origin Origin address
   * @returns Promise<StoreLocation[]>
   */
  getStoreLocations(origin: any): Promise<StoreLocation[]>;

  /**
   * Get delivery quote details
   * @param quoteId Quote ID
   * @returns Promise<DeliveryQuoteDetails>
   */
  getDeliveryQuoteDetails(quoteId: string): Promise<DeliveryQuoteDetails>;

  /**
   * Update delivery status
   * @param deliveryId Delivery ID
   * @param status New status
   * @returns Promise<boolean>
   */
  updateDeliveryStatus(deliveryId: string, status: string): Promise<boolean>;

  /**
   * Get proof of delivery
   * @param deliveryId Delivery ID
   * @returns Promise<ProofOfDelivery>
   */
  getProofOfDelivery(deliveryId: string): Promise<ProofOfDelivery>;

  /**
   * Track shipment using Uber's tracking API
   * @param trackingNumber Tracking number (delivery ID)
   * @returns Promise<any>
   */
  trackShipment(trackingNumber: string): Promise<{
    success: boolean;
    trackingNumber: string;
    status: string;
    events?: Array<{
      status: string;
      description: string;
      timestamp: Date;
      location?: string;
    }>;
    estimatedDelivery?: Date;
    currentLocation?: string;
    error?: string;
  }>;

  /**
   * Cancel shipment
   * @param trackingNumber Tracking number (delivery ID)
   * @returns Promise<boolean>
   */
  cancelShipment(trackingNumber: string): Promise<boolean>;

  /**
   * Process Uber webhook events
   * @param payload Webhook payload
   * @param signature Webhook signature
   * @returns Promise<DeliveryWebhookDto>
   */
  processWebhook(payload: any, signature: string): Promise<DeliveryWebhookDto>;

  /**
   * Check if provider supports store location management
   * @returns boolean
   */
  supportsStoreLocationManagement(): boolean;
}
