import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DeliveryProviderInterface } from '../interfaces/delivery-provider.interface';
import { EnhancedDeliveryProviderInterface } from '../interfaces/enhanced-delivery-provider.interface';
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
  ShipbubbleShippingRatesRequestDto,
  ShipbubbleShippingRatesResponseDto,
  ShipbubblePackageCategoriesResponseDto,
  ShipbubblePackageDimensionsResponseDto,
  ShipbubbleCreateShipmentRequestDto,
  ShipbubbleCreateShipmentResponseDto,
} from '../dto';

@Injectable()
export class ShipbubbleDeliveryService implements DeliveryProviderInterface, EnhancedDeliveryProviderInterface {
  private readonly logger = new Logger(ShipbubbleDeliveryService.name);
  private readonly baseUrl = 'https://api.shipbubble.com/v1';
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('SHIPBUBBLE_API_KEY');
    if (!this.apiKey) {
      throw new Error('SHIPBUBBLE_API_KEY is required');
    }
  }

// not part of the api
  async validateAddress(address: AddressValidationDto): Promise<AddressValidationResponseDto> {
    try {
      this.logger.log(`Validating address: ${address.address}, ${address.city}, ${address.state}`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/addresses/validate`,
          {
            address: address.address,
            city: address.city,
            state: address.state,
            country: address.country,
            postal_code: address.postalCode,
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const data = response.data;

      if (data.success) {
        return {
          success: true,
          isValid: true,
          normalizedAddress: `${data.data.address}, ${data.data.city}, ${data.data.state}, ${data.data.country}`,
        };
      } else {
        return {
          success: false,
          isValid: false,
          error: data.message || 'Address validation failed',
          suggestions: data.suggestions || [],
        };
      }
    } catch (error) {
      this.logger.error(`Address validation failed: ${error.message}`);
      return {
        success: false,
        isValid: false,
        error: 'Address validation service unavailable',
      };
    }
  }

  async validateAddressLegacy(addressData: {
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
  }> {
    try {
      this.logger.log(`Validating address with ShipBubble v1 API: ${addressData.address}`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v1/shipping/address/validate`,
          addressData,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const data = response.data;

      if (data.status === 'success') {
        return {
          success: true,
          isValid: true,
          data: data.data,
        };
      } else {
        return {
          success: false,
          isValid: false,
          error: data.message || 'Address validation failed',
        };
      }
    } catch (error) {
      this.logger.error(`ShipBubble v1 address validation failed: ${error.message}`);
      
      // Handle 422 Unprocessable Entity specifically
      if (error.response?.status === 422) {
        return {
          success: false,
          isValid: false,
          error: error.response.data?.message || 'Address is not deliverable',
        };
      }

      return {
        success: false,
        isValid: false,
        error: 'Address validation service unavailable',
      };
    }
  }

 
  async getDeliveryRates(rateRequest: DeliveryRateRequestDto): Promise<DeliveryRateResponseDto[]> {
    try {
      this.logger.log(`Getting delivery rates from ${rateRequest.origin.city} to ${rateRequest.destination.city}`);

      const requestData = {
        origin: {
          address: rateRequest.origin.address,
          city: rateRequest.origin.city,
          state: rateRequest.origin.state,
          country: rateRequest.origin.country,
          postal_code: rateRequest.origin.postalCode,
        },
        destination: {
          address: rateRequest.destination.address,
          city: rateRequest.destination.city,
          state: rateRequest.destination.state,
          country: rateRequest.destination.country,
          postal_code: rateRequest.destination.postalCode,
        },
        package: {
          weight: rateRequest.package.weight,
          length: rateRequest.package.length,
          width: rateRequest.package.width,
          height: rateRequest.package.height,
          value: rateRequest.package.value,
        },
        couriers: rateRequest.couriers,
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/rates`,
          requestData,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const data = response.data;

      if (data.success && data.data) {
        return data.data.map((rate: any) => ({
          courier: rate.courier_code,
          courierName: rate.courier_name,
          service: rate.service_code,
          serviceName: rate.service_name,
          rateId: rate.rate_id,
          amount: parseFloat(rate.amount),
          currency: rate.currency || 'NGN',
          estimatedDays: rate.estimated_days || 1,
          features: rate.features || [],
        }));
      } else {
        throw new BadRequestException(data.message || 'Failed to get delivery rates');
      }
    } catch (error) {
      this.logger.error(`Failed to get delivery rates: ${error.message}`);
      if (error.response?.data?.message) {
        throw new BadRequestException(error.response.data.message);
      }
      throw new BadRequestException('Failed to get delivery rates');
    }
  }


  async fetchShippingRates(ratesRequest: ShipbubbleShippingRatesRequestDto): Promise<ShipbubbleShippingRatesResponseDto> {
    try {
      // Ensure pickup date is set to present day
      const currentDate = new Date();
      const todayString = currentDate.toISOString().split('T')[0]; // Format: yyyy-mm-dd
      
      // Override pickup date to present day
      const updatedRatesRequest = {
        ...ratesRequest,
        pickup_date: todayString
      };

      this.logger.log(`Fetching shipping rates for pickup date: ${updatedRatesRequest.pickup_date} (automatically set to present day)`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/shipping/fetch_rates`,
          updatedRatesRequest,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const data = response.data;

      if (data.status === 'success' && data.data) {
        return data.data;
      } else {
        throw new BadRequestException(data.message || 'Failed to fetch shipping rates');
      }
    } catch (error) {
      this.logger.error(`Failed to fetch shipping rates: ${error.message}`);
      
      // Handle specific API errors
      if (error.response?.status === 422) {
        throw new BadRequestException(error.response.data?.message || 'Invalid request data');
      }
      
      if (error.response?.status === 400) {
        throw new BadRequestException(error.response.data?.message || 'Bad request - check your input data');
      }

      if (error.response?.data?.message) {
        throw new BadRequestException(error.response.data.message);
      }
      
      throw new BadRequestException('Failed to fetch shipping rates');
    }
  }

  // not part 
  async createShipment(shipmentData: CreateShipmentDto): Promise<CreateShipmentResponseDto> {
    try {
      this.logger.log(`Creating shipment with rate ID: ${shipmentData.rateId}`);

      const requestData = {
        origin: {
          address: shipmentData.origin.address,
          city: shipmentData.origin.city,
          state: shipmentData.origin.state,
          country: shipmentData.origin.country,
          postal_code: shipmentData.origin.postalCode,
        },
        destination: {
          address: shipmentData.destination.address,
          city: shipmentData.destination.city,
          state: shipmentData.destination.state,
          country: shipmentData.destination.country,
          postal_code: shipmentData.destination.postalCode,
        },
        package: {
          weight: shipmentData.package.weight,
          length: shipmentData.package.length,
          width: shipmentData.package.width,
          height: shipmentData.package.height,
          value: shipmentData.package.value,
        },
        courier: shipmentData.courier,
        rate_id: shipmentData.rateId,
        reference: shipmentData.reference,
        description: shipmentData.description,
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/shipments`,
          requestData,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const data = response.data;

      if (data.success && data.data) {
        return {
          success: true,
          trackingNumber: data.data.tracking_number,
          labelUrl: data.data.label_url,
          reference: data.data.reference,
        };
      } else {
        return {
          success: false,
          error: data.message || 'Failed to create shipment',
        };
      }
    } catch (error) {
      this.logger.error(`Failed to create shipment: ${error.message}`);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create shipment',
      };
    }
  }

  async trackShipment(trackingNumber: string): Promise<ShipmentTrackingResponseDto> {
    try {
      this.logger.log(`Tracking shipment: ${trackingNumber}`);

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/tracking/${trackingNumber}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
            },
          },
        ),
      );

      const data = response.data;

      if (data.success && data.data) {
        const trackingData = data.data;
        
        return {
          success: true,
          trackingNumber: trackingData.tracking_number,
          status: trackingData.status,
          statusDescription: trackingData.status_description,
          currentLocation: trackingData.current_location,
          events: trackingData.events?.map((event: any) => ({
            timestamp: new Date(event.timestamp),
            status: event.status,
            description: event.description,
            location: event.location,
          })) || [],
          estimatedDelivery: trackingData.estimated_delivery ? new Date(trackingData.estimated_delivery) : undefined,
          courier: trackingData.courier,
          service: trackingData.service,
        };
      } else {
        throw new BadRequestException(data.message || 'Failed to track shipment');
      }
    } catch (error) {
      this.logger.error(`Failed to track shipment: ${error.message}`);
      if (error.response?.data?.message) {
        throw new BadRequestException(error.response.data.message);
      }
      throw new BadRequestException('Failed to track shipment');
    }
  }

 
  async cancelShipment(trackingNumber: string): Promise<boolean> {
    try {
      this.logger.log(`Cancelling shipment: ${trackingNumber}`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/shipments/${trackingNumber}/cancel`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const data = response.data;
      return data.success || false;
    } catch (error) {
      this.logger.error(`Failed to cancel shipment: ${error.message}`);
      return false;
    }
  }

  async processWebhook(payload: any, signature: string): Promise<DeliveryWebhookDto> {
    try {
      this.logger.log(`Processing Shipbubble webhook: ${payload.event_type}`);

      // Verify webhook signature if needed
      // const isValidSignature = this.verifyWebhookSignature(payload, signature);
      // if (!isValidSignature) {
      //   return {
      //     success: false,
      //     eventType: payload.event_type,
      //     error: 'Invalid webhook signature',
      //   };
      // }

      const eventType = payload.event_type;
      const trackingNumber = payload.tracking_number;
      const reference = payload.reference;

      // Process different event types
      switch (eventType) {
        case 'shipment.created':
        case 'shipment.picked_up':
        case 'shipment.in_transit':
        case 'shipment.out_for_delivery':
        case 'shipment.delivered':
        case 'shipment.failed':
        case 'shipment.cancelled':
        case 'shipment.returned':
          return {
            success: true,
            eventType,
            trackingNumber,
            reference,
            data: payload.data,
          };

        default:
          this.logger.warn(`Unknown webhook event type: ${eventType}`);
          return {
            success: false,
            eventType,
            error: 'Unknown event type',
          };
      }
    } catch (error) {
      this.logger.error(`Failed to process webhook: ${error.message}`);
      return {
        success: false,
        eventType: payload?.event_type || 'unknown',
        error: 'Webhook processing failed',
      };
    }
  }


  private verifyWebhookSignature(payload: any, signature: string): boolean {
    // Implement signature verification based on Shipbubble's webhook security
    // This would typically involve HMAC verification
    // For now, return true (implement proper verification)
    return true;
  }


  async getCouriers(): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/couriers`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
            },
          },
        ),
      );

      const data = response.data;
      return data.success ? data.data : [];
    } catch (error) {
      this.logger.error(`Failed to get couriers: ${error.message}`);
      return [];
    }
  }


  async getPackageCategories(): Promise<ShipbubblePackageCategoriesResponseDto> {
    try {
      this.logger.log('Fetching package categories from Shipbubble');

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/shipping/labels/categories`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const data = response.data;

      if (data.status === 'success' && data.data) {
        return {
          status: data.status,
          message: data.message,
          data: data.data,
        };
      } else {
        throw new BadRequestException(data.message || 'Failed to get package categories');
      }
    } catch (error) {
      this.logger.error(`Failed to get package categories: ${error.message}`);
      
      // Handle specific API errors
      if (error.response?.status === 401) {
        throw new BadRequestException('Unauthorized - Invalid API key');
      }
      
      if (error.response?.status === 403) {
        throw new BadRequestException('Forbidden - API access denied');
      }

      if (error.response?.data?.message) {
        throw new BadRequestException(error.response.data.message);
      }
      
      throw new BadRequestException('Failed to get package categories');
    }
  }

  async getPackageDimensions(): Promise<ShipbubblePackageDimensionsResponseDto> {
    try {
      this.logger.log('Fetching package dimensions from Shipbubble');

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/shipping/labels/boxes`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const data = response.data;

      if (data.status === 'success' && data.data) {
        return {
          status: data.status,
          message: data.message,
          data: data.data,
        };
      } else {
        throw new BadRequestException(data.message || 'Failed to get package dimensions');
      }
    } catch (error) {
      this.logger.error(`Failed to get package dimensions: ${error.message}`);
      
      // Handle specific API errors
      if (error.response?.status === 401) {
        throw new BadRequestException('Unauthorized - Invalid API key');
      }
      
      if (error.response?.status === 403) {
        throw new BadRequestException('Forbidden - API access denied');
      }

      if (error.response?.data?.message) {
        throw new BadRequestException(error.response.data.message);
      }
      
      throw new BadRequestException('Failed to get package dimensions');
    }
  }

  async createShipmentLabel(shipmentRequest: ShipbubbleCreateShipmentRequestDto): Promise<ShipbubbleCreateShipmentResponseDto> {
    try {
      this.logger.log(`Creating shipment label with request token: ${shipmentRequest.request_token}`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/shipping/labels`,
          shipmentRequest,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const data = response.data;

      if (data.status === 'success' && data.data) {
        return {
          status: data.status,
          message: data.message,
          data: data.data,
        };
      } else {
        throw new BadRequestException(data.message || 'Failed to create shipment label');
      }
    } catch (error) {
      this.logger.error(`Failed to create shipment label: ${error.message}`);
      
      // Handle specific API errors
      if (error.response?.status === 401) {
        throw new BadRequestException('Unauthorized - Invalid API key');
      }
      
      if (error.response?.status === 403) {
        throw new BadRequestException('Forbidden - API access denied');
      }

      if (error.response?.status === 422) {
        throw new BadRequestException(error.response.data?.message || 'Invalid request data');
      }

      if (error.response?.status === 400) {
        throw new BadRequestException(error.response.data?.message || 'Bad request - check your input data');
      }

      if (error.response?.data?.message) {
        throw new BadRequestException(error.response.data.message);
      }
      
      throw new BadRequestException('Failed to create shipment label');
    }
  }

 
  supportsRealTimeTracking(): boolean {
    return true;
  }

  requiresConsumerConfirmation(): boolean {
    return false; // Shipbubble doesn't require consumer confirmation
  }


  supportsStoreLocationManagement(): boolean {
    return false; // Shipbubble doesn't use store locations
  }

  getProviderFeatures(): string[] {
    return [
      'real_time_tracking',
      'package_insurance',
      'scheduled_delivery',
      'webhook_notifications',
      'address_validation',
      'rate_calculation',
    ];
  }

  getWorkflowType(): 'on_demand' | 'scheduled' | 'batch' {
    return 'scheduled'; // Shipbubble typically uses scheduled deliveries
  }
}
