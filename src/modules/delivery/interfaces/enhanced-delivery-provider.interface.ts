import { AddressValidationDto, DeliveryRateRequestDto, DeliveryRateResponseDto, ShipmentTrackingResponseDto, DeliveryWebhookDto, CreateShipmentDto, AddressValidationResponseDto, CreateShipmentResponseDto } from '../dto';

/**
 * Enhanced delivery provider interface that accommodates different workflows
 * between providers like Uber Direct and Shipbubble
 */
export interface EnhancedDeliveryProviderInterface {
  /**
   * Validate delivery address
   * @param address Address to validate
   * @returns Promise<AddressValidationResponseDto>
   */
  validateAddress(address: AddressValidationDto): Promise<AddressValidationResponseDto>;

  /**
   * Get delivery rates for a shipment
   * @param rateRequest Rate request parameters
   * @returns Promise<DeliveryRateResponseDto[]>
   */
  getDeliveryRates(rateRequest: DeliveryRateRequestDto): Promise<DeliveryRateResponseDto[]>;

  /**
   * Create a shipment
   * @param shipmentData Shipment creation data
   * @returns Promise<CreateShipmentResponseDto>
   */
  createShipment(shipmentData: CreateShipmentDto): Promise<CreateShipmentResponseDto>;

  /**
   * Track a shipment
   * @param trackingNumber Tracking number
   * @returns Promise<ShipmentTrackingResponseDto>
   */
  trackShipment(trackingNumber: string): Promise<ShipmentTrackingResponseDto>;

  /**
   * Cancel a shipment
   * @param trackingNumber Tracking number
   * @returns Promise<boolean>
   */
  cancelShipment(trackingNumber: string): Promise<boolean>;

  /**
   * Process webhook events
   * @param payload Webhook payload
   * @param signature Webhook signature
   * @returns Promise<DeliveryWebhookDto>
   */
  processWebhook(payload: any, signature: string): Promise<DeliveryWebhookDto>;

  // Enhanced methods for different workflows

  /**
   * Get store locations for pickup (Uber Direct specific)
   * @param origin Origin address
   * @returns Promise<StoreLocation[]>
   */
  getStoreLocations?(origin: any): Promise<StoreLocation[]>;

  /**
   * Confirm a delivery quote (Uber Direct specific)
   * @param quoteId Quote ID to confirm
   * @returns Promise<boolean>
   */
  confirmDeliveryQuote?(quoteId: string): Promise<boolean>;

  /**
   * Get delivery quote details (Uber Direct specific)
   * @param quoteId Quote ID
   * @returns Promise<DeliveryQuoteDetails>
   */
  getDeliveryQuoteDetails?(quoteId: string): Promise<DeliveryQuoteDetails>;

  /**
   * Update delivery status (Uber Direct specific)
   * @param deliveryId Delivery ID
   * @param status New status
   * @returns Promise<boolean>
   */
  updateDeliveryStatus?(deliveryId: string, status: string): Promise<boolean>;

  /**
   * Get proof of delivery (Uber Direct specific)
   * @param deliveryId Delivery ID
   * @returns Promise<ProofOfDelivery>
   */
  getProofOfDelivery?(deliveryId: string): Promise<ProofOfDelivery>;

  /**
   * Check if provider supports real-time tracking
   * @returns boolean
   */
  supportsRealTimeTracking(): boolean;

  /**
   * Check if provider requires consumer confirmation
   * @returns boolean
   */
  requiresConsumerConfirmation(): boolean;

  /**
   * Check if provider supports store location management
   * @returns boolean
   */
  supportsStoreLocationManagement(): boolean;

  /**
   * Get provider-specific features
   * @returns string[]
   */
  getProviderFeatures(): string[];

  /**
   * Get provider workflow type
   * @returns 'on_demand' | 'scheduled' | 'batch'
   */
  getWorkflowType(): 'on_demand' | 'scheduled' | 'batch';
}

/**
 * Store location interface for Uber Direct
 */
export interface StoreLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  isActive: boolean;
  operatingHours?: {
    open: string;
    close: string;
    timezone: string;
  };
  services?: string[];
}

/**
 * Delivery quote details interface
 */
export interface DeliveryQuoteDetails {
  quoteId: string;
  fee: number;
  currency: string;
  estimatedDeliveryTime: Date;
  expiresAt: Date;
  serviceType: string;
  serviceName: string;
  features: string[];
  storeLocation?: StoreLocation;
}

/**
 * Proof of delivery interface
 */
export interface ProofOfDelivery {
  deliveryId: string;
  deliveredAt: Date;
  recipientName?: string;
  signature?: string;
  photo?: string;
  notes?: string;
  courierName?: string;
  courierPhone?: string;
}
