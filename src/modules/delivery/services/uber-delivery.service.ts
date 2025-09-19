import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DeliveryProviderInterface } from '../interfaces/delivery-provider.interface';
import { EnhancedDeliveryProviderInterface, StoreLocation, DeliveryQuoteDetails, ProofOfDelivery } from '../interfaces/enhanced-delivery-provider.interface';
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
} from '../dto';

@Injectable()
export class UberDeliveryService implements DeliveryProviderInterface, EnhancedDeliveryProviderInterface {
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
   * Confirm a delivery quote (Uber Direct specific)
   * @param quoteId Quote ID to confirm
   * @returns Promise<boolean>
   */
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

  /**
   * Get store locations for a given area (public method)
   * @param origin Origin address
   * @returns Promise<StoreLocation[]>
   */
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

  /**
   * Get or refresh access token
   */
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

  /**
   * Validate delivery address using Uber API
   * @param address Address to validate
   * @returns Promise<AddressValidationResponseDto>
   */
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

  /**
   * Get delivery quotes using Uber Direct API
   * @param rateRequest Rate request parameters
   * @returns Promise<DeliveryRateResponseDto[]>
   */
  async getDeliveryRates(rateRequest: DeliveryRateRequestDto): Promise<DeliveryRateResponseDto[]> {
    try {
      const token = await this.getAccessToken();
      
      // First, we need to get store locations for the pickup area
      const storeLocations = await this.getStoreLocations(rateRequest.origin);
      
      if (!storeLocations || storeLocations.length === 0) {
        this.logger.warn('No store locations found for pickup area');
        return [];
      }

      // Use the first available store location
      const storeLocation = storeLocations[0];
      
      // Create delivery quote request according to Uber Direct API
      const quoteRequest = {
        pickup: {
          address: storeLocation.address,
          coordinates: {
            latitude: storeLocation.latitude,
            longitude: storeLocation.longitude,
          },
          contact: {
            name: storeLocation.name,
            phone: storeLocation.phone,
          },
        },
        dropoff: {
          address: `${rateRequest.destination.address}, ${rateRequest.destination.city}, ${rateRequest.destination.state}, ${rateRequest.destination.country}`,
          coordinates: {
            latitude: 0, // Will be geocoded
            longitude: 0, // Will be geocoded
          },
          contact: {
            name: 'Customer',
            phone: '+1234567890', // This should come from the order
          },
        },
        items: [
          {
            name: 'Food Order',
            quantity: 1,
            price: rateRequest.package.value || 0,
          },
        ],
        customer_id: this.customerId,
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/deliveries/quotes`,
          quoteRequest,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      if (!response.data.quotes || response.data.quotes.length === 0) {
        return [];
      }

      // Convert Uber Direct quotes to our standard format
      return response.data.quotes.map((quote: any) => ({
        courier: 'uber',
        courierName: 'Uber Direct',
        service: quote.service_type || 'standard',
        serviceName: quote.service_name || 'Uber Direct Delivery',
        rateId: quote.quote_id,
        amount: quote.fee / 100, // Convert from cents
        currency: quote.currency || 'USD',
        estimatedDays: 0, // Uber delivers same day
        features: ['real_time_tracking', 'contactless_delivery', 'proof_of_delivery'],
        storeLocation: storeLocation,
        quoteExpiry: quote.expires_at,
      }));
    } catch (error) {
      this.logger.error('Failed to get delivery rates from Uber Direct', error);
      throw new BadRequestException('Failed to get delivery rates');
    }
  }

  /**
   * Create a delivery using Uber Direct API
   * @param shipmentData Shipment creation data
   * @returns Promise<CreateShipmentResponseDto>
   */
  async createShipment(shipmentData: CreateShipmentDto): Promise<CreateShipmentResponseDto> {
    try {
      const token = await this.getAccessToken();
      
      // Get store locations for the pickup area
      const storeLocations = await this.getStoreLocations(shipmentData.origin);
      const storeLocation = storeLocations[0];
      
      if (!storeLocation) {
        return {
          success: false,
          error: 'No store location available for pickup',
        };
      }

      // Create delivery request according to Uber Direct API
      const deliveryRequest = {
        pickup: {
          address: storeLocation.address,
          coordinates: {
            latitude: storeLocation.latitude,
            longitude: storeLocation.longitude,
          },
          contact: {
            name: storeLocation.name,
            phone: storeLocation.phone,
          },
        },
        dropoff: {
          address: `${shipmentData.destination.address}, ${shipmentData.destination.city}, ${shipmentData.destination.state}, ${shipmentData.destination.country}`,
          coordinates: {
            latitude: 0, // Will be geocoded
            longitude: 0, // Will be geocoded
          },
          contact: {
            name: 'Customer',
            phone: '+1234567890', // This should come from the order
          },
        },
        items: [
          {
            name: shipmentData.description || 'Food Order',
            quantity: 1,
            price: shipmentData.package.value || 0,
          },
        ],
        quote_id: shipmentData.rateId,
        external_store_id: shipmentData.reference,
        customer_id: this.customerId,
        // Uber Direct specific fields
        pickup_instructions: 'Please ring the doorbell and wait for staff',
        dropoff_instructions: shipmentData.delivery_instructions || 'Leave at door if no answer',
        external_delivery_id: shipmentData.reference,
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/deliveries`,
          deliveryRequest,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      if (response.data.delivery_id) {
        return {
          success: true,
          trackingNumber: response.data.delivery_id,
          reference: response.data.external_delivery_id || shipmentData.reference,
          labelUrl: response.data.tracking_url,
        };
      } else {
        return {
          success: false,
          error: 'Failed to create delivery',
        };
      }
    } catch (error) {
      this.logger.error('Failed to create delivery with Uber Direct', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create delivery',
      };
    }
  }

  /**
   * Track a delivery using Uber API
   * @param trackingNumber Tracking number
   * @returns Promise<ShipmentTrackingResponseDto>
   */
  async trackShipment(trackingNumber: string): Promise<ShipmentTrackingResponseDto> {
    try {
      const token = await this.getAccessToken();
      
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/deliveries/${trackingNumber}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          },
        ),
      );

      const delivery = response.data;
      const events: TrackingEventDto[] = [];

      // Map Uber delivery status to our tracking events
      if (delivery.status) {
        events.push({
          status: this.mapUberStatusToShipmentStatus(delivery.status),
          description: this.getStatusDescription(delivery.status),
          timestamp: new Date(delivery.updated_at || delivery.created_at),
          location: delivery.courier?.location || null,
        });
      }

      return {
        success: true,
        trackingNumber,
        status: this.mapUberStatusToShipmentStatus(delivery.status),
        events,
        estimatedDelivery: delivery.dropoff?.eta ? new Date(delivery.dropoff.eta) : null,
        currentLocation: delivery.courier?.location || null,
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

  /**
   * Cancel a delivery using Uber API
   * @param trackingNumber Tracking number
   * @returns Promise<boolean>
   */
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

  /**
   * Process webhook events from Uber
   * @param payload Webhook payload
   * @param signature Webhook signature
   * @returns Promise<DeliveryWebhookDto>
   */
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

  /**
   * Map Uber delivery status to our shipment status
   */
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

  /**
   * Get human-readable status description
   */
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
