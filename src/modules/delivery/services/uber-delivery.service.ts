import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { UberProviderInterface } from '../interfaces/uber-provider.interface';
import { StoreLocation, DeliveryQuoteDetails, ProofOfDelivery } from '../interfaces/enhanced-delivery-provider.interface';
import {
  AddressValidationDto,
  DeliveryRateRequestDto,
  CreateShipmentDto,
  AddressValidationResponseDto,
  DeliveryRateResponseDto,
  CreateShipmentResponseDto,
  ShipmentTrackingResponseDto,
  DeliveryWebhookDto,
  TrackingEventDto,
  UberDirectDeliveryQuoteRequestDto,
  UberDirectDeliveryQuoteResponseDto,
  UberDirectAddressDto,
  UberDirectCreateDeliveryRequestDto,
  UberDirectCreateDeliveryResponseDto,
  UberDirectManifestItemDto,
  UberDirectDeliveryDetailsDto,
  UberDirectCourierDto,
  UberDirectDeliveryStatusDto,
} from '../dto';

@Injectable()
export class UberDeliveryService implements UberProviderInterface {
  private readonly logger = new Logger(UberDeliveryService.name);
  private readonly baseUrl = 'https://api.uber.com/v1';
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly customerId: string;
  private accessToken: string;
  private tokenExpiry: Date;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.clientId = this.configService.get<string>('UBER_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('UBER_CLIENT_SECRET');
    this.customerId = this.configService.get<string>('UBER_CUSTOMER_ID');
    
    if (!this.clientId || !this.clientSecret || !this.customerId) {
      throw new Error('UBER_CLIENT_ID, UBER_CLIENT_SECRET, and UBER_CUSTOMER_ID are required');
    }
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'Uber Direct';
  }

  /**
   * Get supported countries (All countries except Nigeria)
   */
  getSupportedCountries(): string[] {
    return ['US', 'CA', 'GB', 'AU', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI']; // Add more as needed
  }

  /**
   * Create a delivery quote using Uber Direct API
   * @param quoteRequest Quote request parameters
   * @returns Promise<UberDirectDeliveryQuoteResponseDto>
   */
  async createDeliveryQuote(quoteRequest: UberDirectDeliveryQuoteRequestDto): Promise<UberDirectDeliveryQuoteResponseDto> {
    try {
      const token = await this.getAccessToken();
      
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/customers/${this.customerId}/delivery_quotes`,
          quoteRequest,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to create delivery quote', error);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to create delivery quote'
      );
    }
  }


  async createDelivery(deliveryRequest: UberDirectCreateDeliveryRequestDto): Promise<UberDirectCreateDeliveryResponseDto> {
    try {
      const token = await this.getAccessToken();
      
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/customers/${this.customerId}/deliveries`,
          deliveryRequest,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to create delivery', error);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to create delivery'
      );
    }
  }

  /**
   * Get delivery details using Uber Direct API
   * @param deliveryId Delivery ID
   * @returns Promise<UberDirectDeliveryDetailsDto>
   */
  async getDelivery(deliveryId: string): Promise<UberDirectDeliveryDetailsDto> {
    try {
      const token = await this.getAccessToken();
      
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/customers/${this.customerId}/deliveries/${deliveryId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get delivery details', error);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to get delivery details'
      );
    }
  }


  async confirmDeliveryQuote(quoteId: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/deliveries/quotes/${quoteId}/confirm`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data.confirmed === true;
    } catch (error) {
      this.logger.error('Failed to confirm delivery quote', error);
      return false;
    }
  }

  async getStoreLocations(origin: any): Promise<StoreLocation[]> {
    try {
      const token = await this.getAccessToken();
      
      // For now, we'll return a mock store location
      // In a real implementation, this would call Uber's store location API
      return [
        {
          id: 'store_123',
          name: 'Restaurant Store',
          address: `${origin.address}, ${origin.city}, ${origin.state}, ${origin.country}`,
          latitude: 0, // Would be geocoded
          longitude: 0, // Would be geocoded
          phone: '+1234567890',
          isActive: true,
        },
      ];
    } catch (error) {
      this.logger.error('Failed to get store locations', error);
      return [];
    }
  }


  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/oauth/token`,
          {
            grant_type: 'client_credentials',
            client_id: this.clientId,
            client_secret: this.clientSecret,
          },
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));
      
      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to get Uber access token', error);
      throw new BadRequestException('Failed to authenticate with Uber');
    }
  }

  async validateAddress(address: AddressValidationDto): Promise<AddressValidationResponseDto> {
    try {
      const token = await this.getAccessToken();
      
      // Uber doesn't have a direct address validation endpoint
      // We'll use geocoding to validate the address
      const geocodeResponse = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/geocoding/v1/geocode`,
          {
            params: {
              address: `${address.address}, ${address.city}, ${address.state}, ${address.country}`,
            },
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          },
        ),
      );

      const isValid = geocodeResponse.data.results && geocodeResponse.data.results.length > 0;
      
      return {
        success: isValid,
        isValid,
        normalizedAddress: isValid ? geocodeResponse.data.results[0].formatted_address : null,
        error: isValid ? null : 'Address not found or invalid',
      };
    } catch (error) {
      this.logger.error('Address validation failed', error);
      return {
        success: false,
        isValid: false,
        normalizedAddress: null,
        error: 'Failed to validate address',
      };
    }
  }

  // Legacy method for backward compatibility - will be deprecated
  async getDeliveryRates(rateRequest: DeliveryRateRequestDto): Promise<DeliveryRateResponseDto[]> {
    try {
      // Get store locations for the pickup area
      const storeLocations = await this.getStoreLocations(rateRequest.origin);
      
      if (!storeLocations || storeLocations.length === 0) {
        this.logger.warn('No store locations found for pickup area');
        return [];
      }

      // Use the first available store location
      const storeLocation = storeLocations[0];
      
      // Create delivery quote using the new Uber Direct API
      const quoteResponse = await this.createDeliveryQuoteFromRateRequest(
        rateRequest,
        storeLocation.phone,
        '+1234567890', // This should come from the order
        storeLocation.id
      );

      // Convert Uber Direct quote to our standard format
      return [{
        courier: 'uber',
        courierName: 'Uber Direct',
        service: 'standard',
        serviceName: 'Uber Direct Delivery',
        rateId: quoteResponse.id,
        amount: quoteResponse.fee / 100, // Convert from cents
        currency: quoteResponse.currency || 'USD',
        estimatedDays: 0, // Uber delivers same day
        features: ['real_time_tracking', 'contactless_delivery', 'proof_of_delivery'],
      }];
    } catch (error) {
      this.logger.error('Failed to get delivery rates from Uber Direct', error);
      throw new BadRequestException('Failed to get delivery rates');
    }
  }

  // Legacy method for backward compatibility - will be deprecated
  async createShipment(shipmentData: CreateShipmentDto): Promise<CreateShipmentResponseDto> {
    try {
      // Get store locations for the pickup area
      const storeLocations = await this.getStoreLocations(shipmentData.origin);
      const storeLocation = storeLocations[0];
      
      if (!storeLocation) {
        return {
          success: false,
          error: 'No store location available for pickup',
        };
      }

      // Create manifest items from package data
      const manifestItems = this.createManifestItemsFromPackage(
        shipmentData.package,
        shipmentData.description || 'Food Order',
        'Food delivery order'
      );

      // Create delivery using the new Uber Direct Create Delivery API
      const deliveryResponse = await this.createDeliveryFromShipmentData(
        shipmentData,
        storeLocation.name,
        'Customer',
        manifestItems,
        shipmentData.rateId
      );

      return {
        success: true,
        trackingNumber: deliveryResponse.id,
        reference: deliveryResponse.external_id || shipmentData.reference,
        labelUrl: deliveryResponse.tracking_url,
      };
    } catch (error) {
      this.logger.error('Failed to create delivery with Uber Direct', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create delivery',
      };
    }
  }

  async trackShipment(trackingNumber: string): Promise<ShipmentTrackingResponseDto> {
    try {
      // Use the new Get Delivery API
      const delivery = await this.getDelivery(trackingNumber);
      const events: TrackingEventDto[] = [];

      // Convert status history to tracking events
      if (delivery.status_history && delivery.status_history.length > 0) {
        events.push(...delivery.status_history.map(status => ({
          status: this.mapUberStatusToShipmentStatus(status.status),
          description: status.description,
          timestamp: new Date(status.timestamp),
          location: status.location ? `${status.location.latitude}, ${status.location.longitude}` : null,
        })));
      } else if (delivery.status) {
        // Fallback to current status if no history
        events.push({
          status: this.mapUberStatusToShipmentStatus(delivery.status),
          description: this.getStatusDescription(delivery.status),
          timestamp: new Date(delivery.updated),
          location: delivery.courier?.location ? `${delivery.courier.location.latitude}, ${delivery.courier.location.longitude}` : null,
        });
      }

      return {
        success: true,
        trackingNumber,
        status: this.mapUberStatusToShipmentStatus(delivery.status),
        events,
        estimatedDelivery: delivery.eta ? new Date(delivery.eta) : null,
        currentLocation: delivery.courier?.location ? `${delivery.courier.location.latitude}, ${delivery.courier.location.longitude}` : null,
      };
    } catch (error) {
      this.logger.error('Failed to track delivery', error);
      return {
        success: false,
        trackingNumber,
        status: 'unknown',
        events: [],
        error: 'Failed to track delivery',
      };
    }
  }


  async cancelShipment(trackingNumber: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      
      await firstValueFrom(
        this.httpService.delete(
          `${this.baseUrl}/deliveries/${trackingNumber}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          },
        ),
      );

      return true;
    } catch (error) {
      this.logger.error('Failed to cancel delivery', error);
      return false;
    }
  }

  async processWebhook(payload: any, signature: string): Promise<DeliveryWebhookDto> {
    try {
      // Verify webhook signature if needed
      // Uber webhook verification logic would go here

      const eventType = payload.event_type;
      const deliveryId = payload.delivery_id;

      let status = 'unknown';
      let description = 'Unknown event';

      switch (eventType) {
        case 'delivery.status':
          status = this.mapUberStatusToShipmentStatus(payload.status);
          description = this.getStatusDescription(payload.status);
          break;
        case 'courier.update':
          status = 'in_transit';
          description = 'Courier location updated';
          break;
        case 'refund.request':
          status = 'cancelled';
          description = 'Refund requested';
          break;
        case 'shopping.progress':
          status = 'picked_up';
          description = 'Shopping in progress';
          break;
      }

      return {
        success: true,
        eventType: eventType,
        trackingNumber: deliveryId,
        status,
        description,
        timestamp: new Date(),
        provider: 'uber',
      };
    } catch (error) {
      this.logger.error('Failed to process Uber webhook', error);
      return {
        success: false,
        eventType: payload.event_type || 'unknown',
        trackingNumber: payload.delivery_id || 'unknown',
        status: 'unknown',
        description: 'Webhook processing failed',
        timestamp: new Date(),
        provider: 'uber',
        error: 'Failed to process webhook',
      };
    }
  }


  private mapUberStatusToShipmentStatus(uberStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'pending',
      'accepted': 'picked_up',
      'picked_up': 'picked_up',
      'in_transit': 'in_transit',
      'out_for_delivery': 'out_for_delivery',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'failed': 'failed',
      'returned': 'returned',
    };

    return statusMap[uberStatus] || 'unknown';
  }


  private getStatusDescription(uberStatus: string): string {
    const descriptions: { [key: string]: string } = {
      'pending': 'Delivery request is pending',
      'accepted': 'Delivery has been accepted',
      'picked_up': 'Package has been picked up',
      'in_transit': 'Package is in transit',
      'out_for_delivery': 'Package is out for delivery',
      'delivered': 'Package has been delivered',
      'cancelled': 'Delivery has been cancelled',
      'failed': 'Delivery failed',
      'returned': 'Package has been returned',
    };

    return descriptions[uberStatus] || 'Unknown status';
  }

  private formatAddressForUberDirect(address: any): string {
    const uberAddress: UberDirectAddressDto = {
      street_address: [address.address],
      city: address.city,
      state: address.state,
      zip_code: address.postalCode || '',
      country: address.country,
    };

    return JSON.stringify(uberAddress);
  }


  private generateTimeWindows(baseTime: Date = new Date()): {
    pickup_ready_dt: string;
    pickup_deadline_dt: string;
    dropoff_ready_dt: string;
    dropoff_deadline_dt: string;
  } {
    const now = new Date(baseTime);
    
    // Pickup ready: 20 minutes from now
    const pickupReady = new Date(now.getTime() + 20 * 60 * 1000);
    
    // Pickup deadline: 30 minutes after pickup ready (50 minutes from now)
    const pickupDeadline = new Date(pickupReady.getTime() + 30 * 60 * 1000);
    
    // Dropoff ready: same as pickup deadline
    const dropoffReady = new Date(pickupDeadline);
    
    // Dropoff deadline: 90 minutes after dropoff ready
    const dropoffDeadline = new Date(dropoffReady.getTime() + 90 * 60 * 1000);

    return {
      pickup_ready_dt: pickupReady.toISOString(),
      pickup_deadline_dt: pickupDeadline.toISOString(),
      dropoff_ready_dt: dropoffReady.toISOString(),
      dropoff_deadline_dt: dropoffDeadline.toISOString(),
    };
  }


  async createDeliveryQuoteFromRateRequest(
    rateRequest: DeliveryRateRequestDto,
    pickupPhone: string,
    dropoffPhone: string,
    externalStoreId?: string
  ): Promise<UberDirectDeliveryQuoteResponseDto> {
    const timeWindows = this.generateTimeWindows();
    
    const quoteRequest: UberDirectDeliveryQuoteRequestDto = {
      pickup_address: this.formatAddressForUberDirect(rateRequest.origin),
      dropoff_address: this.formatAddressForUberDirect(rateRequest.destination),
      pickup_ready_dt: timeWindows.pickup_ready_dt,
      pickup_deadline_dt: timeWindows.pickup_deadline_dt,
      dropoff_ready_dt: timeWindows.dropoff_ready_dt,
      dropoff_deadline_dt: timeWindows.dropoff_deadline_dt,
      pickup_phone_number: pickupPhone,
      dropoff_phone_number: dropoffPhone,
      manifest_total_value: Math.round((rateRequest.package.value || 0) * 100), // Convert to cents
      external_store_id: externalStoreId,
    };

    return this.createDeliveryQuote(quoteRequest);
  }

  /**
   * Create delivery from standard shipment data
   * @param shipmentData Standard shipment creation data
   * @param pickupName Pickup location name
   * @param dropoffName Dropoff location name
   * @param manifestItems Manifest items for delivery
   * @param quoteId Optional quote ID from previous quote
   * @returns Promise<UberDirectCreateDeliveryResponseDto>
   */
  async createDeliveryFromShipmentData(
    shipmentData: CreateShipmentDto,
    pickupName: string,
    dropoffName: string,
    manifestItems: UberDirectManifestItemDto[],
    quoteId?: string
  ): Promise<UberDirectCreateDeliveryResponseDto> {
    const timeWindows = this.generateTimeWindows();
    
    const deliveryRequest: UberDirectCreateDeliveryRequestDto = {
      pickup_name: pickupName,
      pickup_address: this.formatAddressForUberDirect(shipmentData.origin),
      pickup_phone_number: '+1234567890', // This should come from the order
      dropoff_name: dropoffName,
      dropoff_address: this.formatAddressForUberDirect(shipmentData.destination),
      dropoff_phone_number: '+1234567890', // This should come from the order
      manifest_items: manifestItems,
      manifest_total_value: Math.round((shipmentData.package.value || 0) * 100), // Convert to cents
      pickup_ready_dt: timeWindows.pickup_ready_dt,
      pickup_deadline_dt: timeWindows.pickup_deadline_dt,
      dropoff_ready_dt: timeWindows.dropoff_ready_dt,
      dropoff_deadline_dt: timeWindows.dropoff_deadline_dt,
      manifest_reference: shipmentData.reference,
      external_store_id: shipmentData.reference,
      external_id: shipmentData.reference,
      quote_id: quoteId,
      deliverable_action: 'deliverable_action_meet_at_door',
      undeliverable_action: 'return',
      dropoff_notes: shipmentData.delivery_instructions || 'Please ring the doorbell',
    };

    return this.createDelivery(deliveryRequest);
  }

  /**
   * Create manifest items from package data
   * @param packageData Package information
   * @param itemName Item name
   * @param itemDescription Item description
   * @returns UberDirectManifestItemDto[]
   */
  createManifestItemsFromPackage(
    packageData: any,
    itemName: string = 'Food Order',
    itemDescription: string = 'Food delivery order'
  ): UberDirectManifestItemDto[] {
    return [{
      name: itemName,
      description: itemDescription,
      quantity: 1,
      value: Math.round((packageData.value || 0) * 100), // Convert to cents
      weight: Math.round((packageData.weight || 0) * 1000), // Convert kg to grams
      dimensions: {
        length: packageData.length || 0,
        width: packageData.width || 0,
        height: packageData.height || 0,
      },
    }];
  }

  /**
   * Get delivery details and convert to standard tracking format
   * @param deliveryId Delivery ID
   * @returns Promise<ShipmentTrackingResponseDto>
   */
  async getDeliveryTracking(deliveryId: string): Promise<ShipmentTrackingResponseDto> {
    try {
      const delivery = await this.getDelivery(deliveryId);
      const events: TrackingEventDto[] = [];

      // Convert status history to tracking events
      if (delivery.status_history && delivery.status_history.length > 0) {
        events.push(...delivery.status_history.map(status => ({
          status: this.mapUberStatusToShipmentStatus(status.status),
          description: status.description,
          timestamp: new Date(status.timestamp),
          location: status.location ? `${status.location.latitude}, ${status.location.longitude}` : null,
        })));
      } else if (delivery.status) {
        // Fallback to current status if no history
        events.push({
          status: this.mapUberStatusToShipmentStatus(delivery.status),
          description: this.getStatusDescription(delivery.status),
          timestamp: new Date(delivery.updated),
          location: delivery.courier?.location ? `${delivery.courier.location.latitude}, ${delivery.courier.location.longitude}` : null,
        });
      }

      return {
        success: true,
        trackingNumber: deliveryId,
        status: this.mapUberStatusToShipmentStatus(delivery.status),
        events,
        estimatedDelivery: delivery.eta ? new Date(delivery.eta) : null,
        currentLocation: delivery.courier?.location ? `${delivery.courier.location.latitude}, ${delivery.courier.location.longitude}` : null,
      };
    } catch (error) {
      this.logger.error('Failed to get delivery tracking', error);
      return {
        success: false,
        trackingNumber: deliveryId,
        status: 'unknown',
        events: [],
        error: 'Failed to get delivery tracking',
      };
    }
  }

  // Enhanced interface methods

  /**
   * Get delivery quote details
   * @param quoteId Quote ID
   * @returns Promise<DeliveryQuoteDetails>
   */
  async getDeliveryQuoteDetails(quoteId: string): Promise<DeliveryQuoteDetails> {
    try {
      const token = await this.getAccessToken();
      
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/deliveries/quotes/${quoteId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          },
        ),
      );

      const quote = response.data;
      return {
        quoteId: quote.quote_id,
        fee: quote.fee / 100,
        currency: quote.currency || 'USD',
        estimatedDeliveryTime: new Date(quote.estimated_delivery_time),
        expiresAt: new Date(quote.expires_at),
        serviceType: quote.service_type || 'standard',
        serviceName: quote.service_name || 'Uber Direct Delivery',
        features: quote.features || ['real_time_tracking', 'contactless_delivery'],
      };
    } catch (error) {
      this.logger.error('Failed to get delivery quote details', error);
      throw new BadRequestException('Failed to get quote details');
    }
  }

  /**
   * Update delivery status
   * @param deliveryId Delivery ID
   * @param status New status
   * @returns Promise<boolean>
   */
  async updateDeliveryStatus(deliveryId: string, status: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      
      const response = await firstValueFrom(
        this.httpService.patch(
          `${this.baseUrl}/deliveries/${deliveryId}`,
          { status },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data.success === true;
    } catch (error) {
      this.logger.error('Failed to update delivery status', error);
      return false;
    }
  }

  /**
   * Get proof of delivery
   * @param deliveryId Delivery ID
   * @returns Promise<ProofOfDelivery>
   */
  async getProofOfDelivery(deliveryId: string): Promise<ProofOfDelivery> {
    try {
      const token = await this.getAccessToken();
      
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/deliveries/${deliveryId}/proof`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          },
        ),
      );

      const proof = response.data;
      return {
        deliveryId: proof.delivery_id,
        deliveredAt: new Date(proof.delivered_at),
        recipientName: proof.recipient_name,
        signature: proof.signature,
        photo: proof.photo,
        notes: proof.notes,
        courierName: proof.courier_name,
        courierPhone: proof.courier_phone,
      };
    } catch (error) {
      this.logger.error('Failed to get proof of delivery', error);
      throw new BadRequestException('Failed to get proof of delivery');
    }
  }

  /**
   * Check if provider supports real-time tracking
   * @returns boolean
   */
  supportsRealTimeTracking(): boolean {
    return true;
  }

  /**
   * Check if provider requires consumer confirmation
   * @returns boolean
   */
  requiresConsumerConfirmation(): boolean {
    return true;
  }

  /**
   * Check if provider supports store location management
   * @returns boolean
   */
  supportsStoreLocationManagement(): boolean {
    return true;
  }

  /**
   * Get provider-specific features
   * @returns string[]
   */
  getProviderFeatures(): string[] {
    return [
      'real_time_tracking',
      'contactless_delivery',
      'proof_of_delivery',
      'consumer_confirmation',
      'store_location_management',
      'same_day_delivery',
      'webhook_notifications',
    ];
  }

  /**
   * Get provider workflow type
   * @returns 'on_demand' | 'scheduled' | 'batch'
   */
  getWorkflowType(): 'on_demand' | 'scheduled' | 'batch' {
    return 'on_demand';
  }
}
