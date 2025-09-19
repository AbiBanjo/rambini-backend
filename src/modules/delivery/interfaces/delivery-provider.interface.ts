import { AddressValidationDto, DeliveryRateRequestDto, DeliveryRateResponseDto, ShipmentTrackingResponseDto, DeliveryWebhookDto, CreateShipmentDto, AddressValidationResponseDto, CreateShipmentResponseDto } from '../dto';

export interface DeliveryProviderInterface {
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
}

