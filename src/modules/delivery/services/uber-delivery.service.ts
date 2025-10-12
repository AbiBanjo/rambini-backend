import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
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
  private readonly webhookSigningKey: string;
  private accessToken: string;
  private tokenExpiry: Date;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.clientId = this.configService.get<string>('UBER_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('UBER_CLIENT_SECRET');
    this.customerId = this.configService.get<string>('UBER_CUSTOMER_ID');
    this.webhookSigningKey = this.configService.get<string>('UBER_WEBHOOK_SIGNING_KEY');
    
    if (!this.clientId || !this.clientSecret || !this.customerId) {
      throw new Error('UBER_CLIENT_ID, UBER_CLIENT_SECRET, and UBER_CUSTOMER_ID are required');
    }
    
    if (!this.webhookSigningKey) {
      this.logger.warn('UBER_WEBHOOK_SIGNING_KEY is not configured. Webhook signature verification will be disabled.');
    }
  }

  /**
   * Helper method to retry API calls with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    initialDelay = 1000,
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Check if it's a network error (DNS, timeout, connection refused, etc.)
        const isNetworkError = 
          error.code === 'EAI_AGAIN' || 
          error.code === 'ENOTFOUND' || 
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNREFUSED' ||
          error.code === 'ECONNRESET' ||
          error.message?.includes('getaddrinfo');
        
        // Only retry on network errors, not on API errors (4xx, 5xx)
        if (!isNetworkError || attempt === maxRetries) {
          throw error;
        }
        
        const delay = initialDelay * Math.pow(2, attempt);
        this.logger.warn(
          `Network error (${error.code || error.message}). Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`,
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }


  getProviderName(): string {
    return 'Uber Direct';
  }


  getSupportedCountries(): string[] {
    return ['US', 'CA', 'GB', 'AU', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI']; // Add more as needed
  }


  async createDeliveryQuote(quoteRequest: UberDirectDeliveryQuoteRequestDto): Promise<UberDirectDeliveryQuoteResponseDto> {
    try {
      this.logger.log('Creating delivery quote');
      const token = await this.getAccessToken();

      // https://api.uber.com/v1/customers/{customer_id}/delivery_quotes
      this.logger.log('Creating delivery quote', `${this.baseUrl}/customers/${this.customerId}/delivery_quotes`);
      
      const response = await this.retryWithBackoff(async () => {
        return await firstValueFrom(
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
      });

      return response.data;
    } catch (error) {
      // Better error logging for network vs API errors
      if (error.code === 'EAI_AGAIN' || error.code === 'ENOTFOUND' || error.message?.includes('getaddrinfo')) {
        this.logger.error('Network/DNS error when creating delivery quote', {
          error: error.message,
          code: error.code,
          suggestion: 'Check DNS configuration, internet connectivity, or Docker network settings'
        });
        throw new BadRequestException(
          'Unable to reach delivery service. Please check your network connection.'
        );
      }
      
      this.logger.error('Failed to create delivery quote', error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to create delivery quote'
      );
    }
  }


  async createDelivery(deliveryRequest: UberDirectCreateDeliveryRequestDto): Promise<UberDirectCreateDeliveryResponseDto> {
    try {
      const token = await this.getAccessToken();
      
      const response = await this.retryWithBackoff(async () => {
        return await firstValueFrom(
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
      });

      this.logger.log('Uber Delivery response', response.data);

      return response.data;
    } catch (error) {
      // Better error logging for network vs API errors
      if (error.code === 'EAI_AGAIN' || error.code === 'ENOTFOUND' || error.message?.includes('getaddrinfo')) {
        this.logger.error('Network/DNS error when creating delivery', {
          error: error.message,
          code: error.code,
          suggestion: 'Check DNS configuration, internet connectivity, or Docker network settings'
        });
        throw new BadRequestException(
          'Unable to reach delivery service. Please check your network connection.'
        );
      }
      
      this.logger.error('Failed to create delivery', error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to create delivery'
      );
    }
  }


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
    this.logger.log('Getting Uber access token');
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await this.retryWithBackoff(async () => {
        return await firstValueFrom(
          this.httpService.post(
            'https://auth.uber.com/oauth/v2/token',
            {
              grant_type: 'client_credentials',
              client_id: this.clientId,
              client_secret: this.clientSecret,
              scope: 'eats.deliveries',
            },
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            },
          ),
        );
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));
      this.logger.log('Uber access token obtained successfully');
      return this.accessToken;
    } catch (error) {
      if (error.code === 'EAI_AGAIN' || error.code === 'ENOTFOUND' || error.message?.includes('getaddrinfo')) {
        this.logger.error('Network/DNS error when getting Uber access token', {
          error: error.message,
          code: error.code,
          suggestion: 'Check DNS configuration, internet connectivity, or Docker network settings'
        });
        throw new BadRequestException(
          'Unable to reach Uber authentication service. Please check your network connection.'
        );
      }
      
      this.logger.error('Failed to get Uber access token', error.response?.data || error.message);
      throw new BadRequestException('Failed to authenticate with Uber');
    }
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    if (!this.webhookSigningKey) {
      this.logger.warn('Webhook signing key not configured. Skipping signature verification.');
      return true; // Allow webhook if signing key is not configured (for backward compatibility)
    }

    if (!signature) {
      this.logger.error('Webhook signature is missing');
      return false;
    }

    try {
      // Convert payload to string if it's a Buffer
      const payloadString = typeof payload === 'string' ? payload : payload.toString('utf-8');
      
      // Compute HMAC SHA-256 hash
      const computedSignature = crypto
        .createHmac('sha256', this.webhookSigningKey)
        .update(payloadString, 'utf-8')
        .digest('hex');

      // Compare signatures using timing-safe comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(computedSignature, 'hex'),
        Buffer.from(signature, 'hex')
      );

      if (!isValid) {
        this.logger.error('Webhook signature verification failed', {
          expected: computedSignature,
          received: signature,
        });
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error verifying webhook signature', error);
      return false;
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

  async processWebhook(payload: any, signature: string, rawBody?: string | Buffer): Promise<DeliveryWebhookDto> {
    try {
      this.logger.log(`Processing Uber Direct webhook: ${JSON.stringify(payload)}`);

      // 1. Verify webhook signature
      const bodyToVerify = rawBody || JSON.stringify(payload);
      const isValidSignature = this.verifyWebhookSignature(bodyToVerify, signature);
      
      if (!isValidSignature) {
        this.logger.error('Uber webhook signature verification failed');
        return {
          success: false,
          eventType: payload.kind || 'unknown',
          error: 'Invalid webhook signature',
          provider: 'uber',
        };
      }

      // 2. Extract core webhook fields
      const eventType = payload.kind;  // "event.delivery_status"
      const status = payload.status;   // "pickup", "delivered", etc.
      const deliveryId = payload.delivery_id;  // "del_xxxx"
      const data = payload.data;
      
      // 🎯 Extract quote_id (critical for tracking in delivery service)
      const quoteId = data?.quote_id || deliveryId;  // Falls back to delivery_id if quote_id not present
      
      this.logger.log(`Event: ${eventType}, Status: ${status}, Delivery ID: ${deliveryId}, Quote ID: ${quoteId}`);

      // 3. Process different event types - FOCUS ON KEY EVENTS
      
      // 🎯 CASE 1: Courier is 1 minute away from PICKUP (restaurant)
      if (status === 'pickup' && data.courier_imminent === true) {
        this.logger.log(`🚗 Courier imminent at pickup for delivery ${deliveryId}`);
        
        return {
          success: true,
          eventType: 'courier.imminent.pickup',  // Custom event name for your system
          trackingId: quoteId,  // Return quote_id like Shipbubble
          status: 'pickup_imminent',  // Refined status
          description: `Driver ${data.courier?.name || 'courier'} is 1 minute away from pickup location`,
          timestamp: new Date(),
          provider: 'uber',
          data: {
            // Include relevant courier data for notifications
            courier: {
              name: data.courier?.name,
              phone: data.courier?.phone_number,
              location: data.courier?.location,
              vehicle_type: data.courier?.vehicle_type,
              vehicle_color: data.courier?.vehicle_color,
              vehicle_make: data.courier?.vehicle_make,
              vehicle_model: data.courier?.vehicle_model,
              vehicle_license_plate: data.courier?.vehicle_license_plate,
              img_href: data.courier?.img_href,
            },
            pickup_eta: data.pickup_eta,
            pickup_address: data.pickup?.address,
            tracking_url: data.tracking_url,
          }
        };
      }

      // 🎯 CASE 2: Order DELIVERED to customer
      if (status === 'delivered') {
        this.logger.log(`✅ Delivery completed for ${deliveryId}`);
        
        return {
          success: true,
          eventType: 'delivery.completed',  // Custom event name for your system
          trackingId: quoteId,  // Return quote_id
          status: 'delivered',  // Refined status
          description: `Order delivered successfully to ${data.dropoff?.name || 'customer'}`,
          timestamp: new Date(data.dropoff?.status_timestamp || Date.now()),
          provider: 'uber',
          data: {
            // Include proof of delivery data
            delivered_at: data.dropoff?.status_timestamp,
            dropoff_address: data.dropoff?.address,
            proof_of_delivery: {
              signature_url: data.dropoff?.verification?.signature?.image_url,
              photo_url: data.dropoff?.verification?.picture?.image_url,
              signer_name: data.dropoff?.verification?.signature?.signer_name,
              signer_relationship: data.dropoff?.verification?.signature?.signer_relationship,
              pin_entered: data.dropoff?.verification?.pin_code?.entered,
              completion_location: data.dropoff?.verification?.completion_location,
            },
            courier: {
              name: data.courier?.name,
              phone: data.courier?.phone_number,
            },
            tracking_url: data.tracking_url,
          }
        };
      }

      // Optional: Handle other statuses for completeness
      
      // Status: "pending" - Courier being assigned
      if (status === 'pending') {
        return {
          success: true,
          eventType: 'delivery.pending',
          trackingId: quoteId,
          status: 'pending',
          description: 'Looking for a courier',
          timestamp: new Date(),
          provider: 'uber',
          data: {
            pickup_eta: data.pickup_eta,
            dropoff_eta: data.dropoff_eta,
          },
        };
      }

      // Status: "pickup" (without courier_imminent) - Courier heading to restaurant
      if (status === 'pickup') {
        return {
          success: true,
          eventType: 'courier.heading_to_pickup',
          trackingId: quoteId,
          status: 'courier_assigned',
          description: `Courier ${data.courier?.name || ''} is heading to pickup location`,
          timestamp: new Date(),
          provider: 'uber',
          data: {
            courier: {
              name: data.courier?.name,
              phone: data.courier?.phone_number,
              vehicle_type: data.courier?.vehicle_type,
            },
            pickup_eta: data.pickup_eta,
          },
        };
      }

      // Status: "pickup_complete" - Courier picked up the order
      if (status === 'pickup_complete') {
        return {
          success: true,
          eventType: 'pickup.completed',
          trackingId: quoteId,
          status: 'picked_up',
          description: 'Order picked up by courier',
          timestamp: new Date(data.pickup?.status_timestamp || Date.now()),
          provider: 'uber',
          data: {
            picked_up_at: data.pickup?.status_timestamp,
            courier: {
              name: data.courier?.name,
              phone: data.courier?.phone_number,
            },
            dropoff_eta: data.dropoff_eta,
          },
        };
      }

      // Status: "dropoff" - Courier heading to customer
      if (status === 'dropoff') {
        // Check if courier is imminent at dropoff
        if (data.courier_imminent === true) {
          return {
            success: true,
            eventType: 'courier.imminent.dropoff',
            trackingId: quoteId,
            status: 'dropoff_imminent',
            description: `Driver is 1 minute away from customer`,
            timestamp: new Date(),
            provider: 'uber',
            data: {
              courier: {
                name: data.courier?.name,
                phone: data.courier?.phone_number,
                location: data.courier?.location,
                vehicle_type: data.courier?.vehicle_type,
              },
              dropoff_eta: data.dropoff_eta,
              dropoff_address: data.dropoff?.address,
            }
          };
        }
        
        return {
          success: true,
          eventType: 'delivery.in_transit',
          trackingId: quoteId,
          status: 'out_for_delivery',
          description: 'Order is out for delivery',
          timestamp: new Date(),
          provider: 'uber',
          data: {
            courier: {
              name: data.courier?.name,
              phone: data.courier?.phone_number,
            },
            dropoff_eta: data.dropoff_eta,
          },
        };
      }

      // Status: "canceled" - Delivery cancelled
      if (status === 'canceled') {
        return {
          success: true,
          eventType: 'delivery.cancelled',
          trackingId: quoteId,
          status: 'cancelled',
          description: data.cancelation_reason?.secondary_reason || 'Delivery cancelled',
          timestamp: new Date(),
          provider: 'uber',
          data: {
            cancelation_reason: data.cancelation_reason,
          },
        };
      }

      // Status: "returned" - Items returned to restaurant
      if (status === 'returned') {
        return {
          success: true,
          eventType: 'delivery.returned',
          trackingId: quoteId,
          status: 'returned',
          description: 'Order returned to restaurant',
          timestamp: new Date(),
          provider: 'uber',
          data: {
            undeliverable_reason: data.undeliverable_reason,
            undeliverable_action: data.undeliverable_action,
          },
        };
      }

      // Default case: Unknown or unhandled status
      this.logger.warn(`Unhandled Uber webhook status: ${status}`);
      return {
        success: true,
        eventType: eventType || 'unknown',
        trackingId: quoteId,
        status: status || 'unknown',
        description: `Status: ${status}`,
        timestamp: new Date(),
        provider: 'uber',
        data: data,
      };

    } catch (error) {
      this.logger.error(`Failed to process Uber webhook: ${error.message}`, error.stack);
      return {
        success: false,
        eventType: payload?.kind || 'unknown',
        trackingId: payload?.delivery_id,
        error: 'Webhook processing failed',
        provider: 'uber',
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
      price: Math.round((packageData.value || 0) * 100), // Convert to cents
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
