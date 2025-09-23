import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryRepository } from '../repositories/delivery.repository';
import { DeliveryProviderFactoryService } from './delivery-provider-factory.service';
import { Delivery, ShipmentStatus, DeliveryProvider, DeliveryTracking } from 'src/entities';
import { AddressService } from '../../user/services/address.service';
import {
  AddressValidationDto,
  DeliveryRateRequestDto,
  CreateShipmentDto,
  AddressValidationResponseDto,
  DeliveryRateResponseDto,
  CreateShipmentResponseDto,
  ShipmentTrackingResponseDto,
  DeliveryWebhookDto,
  ShipbubblePackageCategoriesResponseDto,
  ShipbubblePackageDimensionsResponseDto,
  ShipbubbleCreateShipmentRequestDto,
  ShipbubbleCreateShipmentResponseDto,
} from '../dto';
import { DeliveryResponseDto } from '../dto';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly deliveryRepository: DeliveryRepository,
    private readonly providerFactory: DeliveryProviderFactoryService,
    @Inject(forwardRef(() => AddressService))
    private readonly addressService: AddressService,
    @InjectRepository(DeliveryTracking)
    private readonly deliveryTrackingRepository: Repository<DeliveryTracking>,
  ) {}

  /**
   * Get appropriate delivery provider based on country
   */
  private getProviderByCountry(country: string) {
    return this.providerFactory.getProviderByCountry(country);
  }

  /**
   * Validate delivery address based on country
   * @param country Country code
   * @param address Address to validate (with additional fields for Shipbubble)
   * @returns Promise<AddressValidationResponseDto>
   */
  async validateAddress(
    country: string,
    address: AddressValidationDto & { name: string; email: string; phone: string },
  ): Promise<AddressValidationResponseDto> {
    const provider = this.getProviderByCountry(country);
    
    if (!provider) {
      throw new BadRequestException(`No delivery provider available for country: ${country}`);
    }

    return await provider.validateAddress(address);
  }

  /**
   * Get delivery rates based on destination country
   * @param rateRequest Rate request parameters
   * @returns Promise<DeliveryRateResponseDto[]>
   */
  async getDeliveryRates(
    rateRequest: DeliveryRateRequestDto,
  ): Promise<DeliveryRateResponseDto[]> {
    const country = rateRequest.destination.country;
    const provider = this.getProviderByCountry(country);
    
    if (!provider) {
      throw new BadRequestException(`No delivery provider available for country: ${country}`);
    }

    // Use legacy method for backward compatibility
    if ('getDeliveryRates' in provider && typeof provider.getDeliveryRates === 'function') {
      return await provider.getDeliveryRates(rateRequest);
    }

    throw new BadRequestException(`Provider does not support legacy rate calculation`);
  }

  /**
   * Create a delivery for an order
   * @param orderId Order ID
   * @param shipmentData Shipment creation data
   * @param userInfo User information for address validation
   * @returns Promise<DeliveryResponseDto>
   */
  async createDelivery(
    orderId: string,
    shipmentData: CreateShipmentDto,
    userInfo?: { name: string; email: string; phone: string },
  ): Promise<DeliveryResponseDto> {
    const country = shipmentData.destination.country;
    this.logger.log(`Creating delivery for order ${orderId} in country ${country}`);

    // Check if delivery already exists for this order
    const existingDelivery = await this.deliveryRepository.findByOrderId(orderId);
    if (existingDelivery) {
      throw new BadRequestException('Delivery already exists for this order');
    }

    const deliveryProvider = this.getProviderByCountry(country);
    if (!deliveryProvider) {
      throw new BadRequestException(`No delivery provider available for country: ${country}`);
    }

    // Determine provider type for database storage
    const providerType = this.providerFactory.isShipbubbleCountry(country) 
      ? DeliveryProvider.SHIPBUBBLE 
      : DeliveryProvider.UBER;

    // Note: Address validation should be done separately before creating delivery
    // The delivery service assumes the address has already been validated
    // Use the validateAddressForDelivery method in AddressService before calling this method

    // Get delivery rates to find the selected rate (legacy support)
    if ('getDeliveryRates' in deliveryProvider && typeof deliveryProvider.getDeliveryRates === 'function') {
      const rates = await deliveryProvider.getDeliveryRates({
        origin: shipmentData.origin,
        destination: shipmentData.destination,
        package: shipmentData.package,
        couriers: [shipmentData.courier],
      });

      const selectedRate = rates.find(rate => rate.rateId === shipmentData.rateId);
      if (!selectedRate) {
        throw new BadRequestException('Selected rate not found');
      }

      // Create shipment with provider (legacy support)
      if ('createShipment' in deliveryProvider && typeof deliveryProvider.createShipment === 'function') {
        const shipmentResult = await deliveryProvider.createShipment(shipmentData);
        if (!shipmentResult.success) {
          throw new BadRequestException(shipmentResult.error || 'Failed to create shipment');
        }

        // Create delivery record
        const delivery = await this.deliveryRepository.create({
          order_id: orderId,
          provider: providerType,
          tracking_number: shipmentResult.trackingNumber!,
          cost: selectedRate.amount,
          currency: selectedRate.currency,
          courier_name: selectedRate.courierName,
          service_type: selectedRate.serviceName,
          rate_id: shipmentData.rateId,
          reference_number: shipmentResult.reference,
          label_url: shipmentResult.labelUrl,
          estimated_delivery: new Date(Date.now() + selectedRate.estimatedDays * 24 * 60 * 60 * 1000),
          origin_address: shipmentData.origin,
          destination_address: shipmentData.destination,
          package_details: shipmentData.package,
          status: ShipmentStatus.PENDING,
        });

        return this.mapToDeliveryResponse(delivery);
      }
    }

    throw new BadRequestException('Provider does not support legacy shipment creation');
  }

  /**
   * Track a delivery
   * @param trackingNumber Tracking number
   * @returns Promise<ShipmentTracking>
   */
  async trackDelivery(trackingNumber: string): Promise<ShipmentTrackingResponseDto> {
    const delivery = await this.deliveryRepository.findByTrackingNumber(trackingNumber);
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    // Get provider based on the stored provider type
    const deliveryProvider = delivery.provider === DeliveryProvider.SHIPBUBBLE 
      ? this.providerFactory.getShipbubbleProvider()
      : this.providerFactory.getUberProvider();

    const trackingData = await deliveryProvider.trackShipment(trackingNumber);

    // Update delivery status based on tracking data
    const newStatus = this.mapTrackingStatusToDeliveryStatus(trackingData.status);
    if (newStatus !== delivery.status) {
      await this.deliveryRepository.updateStatus(delivery.id, newStatus);
      
      // Add tracking event
      await this.addTrackingEvent(delivery.id, trackingData.status, 'Status updated', trackingData.currentLocation);
    }

    // Convert to standard format
    return {
      success: trackingData.success,
      trackingNumber: trackingData.trackingNumber,
      status: trackingData.status,
      statusDescription: 'Tracking information retrieved',
      currentLocation: trackingData.currentLocation,
      events: trackingData.events || [],
      estimatedDelivery: trackingData.estimatedDelivery,
      courier: 'courier',
      service: 'service',
    };
  }

  /**
   * Cancel a delivery
   * @param trackingNumber Tracking number
   * @returns Promise<boolean>
   */
  async cancelDelivery(trackingNumber: string): Promise<boolean> {
    const delivery = await this.deliveryRepository.findByTrackingNumber(trackingNumber);
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.status === ShipmentStatus.DELIVERED) {
      throw new BadRequestException('Cannot cancel delivered delivery');
    }

    // Get provider based on the stored provider type
    const deliveryProvider = delivery.provider === DeliveryProvider.SHIPBUBBLE 
      ? this.providerFactory.getShipbubbleProvider()
      : this.providerFactory.getUberProvider();

    const cancelled = await deliveryProvider.cancelShipment(trackingNumber);
    if (cancelled) {
      await this.deliveryRepository.updateStatus(delivery.id, ShipmentStatus.CANCELLED);
      await this.addTrackingEvent(delivery.id, 'cancelled', 'Delivery cancelled by user');
    }

    return cancelled;
  }

  /**
   * Process delivery webhook
   * @param provider Delivery provider
   * @param payload Webhook payload
   * @param signature Webhook signature
   * @returns Promise<DeliveryWebhookDto>
   */
  async processWebhook(
    provider: DeliveryProvider,
    payload: any,
    signature: string,
  ): Promise<DeliveryWebhookDto> {
    // Get provider based on the provider type
    const deliveryProvider = provider === DeliveryProvider.SHIPBUBBLE 
      ? this.providerFactory.getShipbubbleProvider()
      : this.providerFactory.getUberProvider();

    const webhookResult = await deliveryProvider.processWebhook(payload, signature);
    
    if (webhookResult.success && webhookResult.trackingNumber) {
      // Update delivery status based on webhook event
      const delivery = await this.deliveryRepository.findByTrackingNumber(webhookResult.trackingNumber);
      if (delivery) {
        const newStatus = this.mapWebhookEventToDeliveryStatus(webhookResult.eventType);
        if (newStatus) {
          await this.deliveryRepository.updateStatus(delivery.id, newStatus);
          await this.addTrackingEvent(
            delivery.id,
            webhookResult.eventType,
            `Status updated via webhook: ${webhookResult.eventType}`,
          );
        }
      }
    }

    return webhookResult;
  }

  /**
   * Get delivery by ID
   * @param id Delivery ID
   * @returns Promise<DeliveryResponseDto>
   */
  async getDeliveryById(id: string): Promise<DeliveryResponseDto> {
    const delivery = await this.deliveryRepository.findById(id);
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    return this.mapToDeliveryResponse(delivery);
  }

  /**
   * Get delivery by tracking number
   * @param trackingNumber Tracking number
   * @returns Promise<DeliveryResponseDto>
   */
  async getDeliveryByTrackingNumber(trackingNumber: string): Promise<DeliveryResponseDto> {
    const delivery = await this.deliveryRepository.findByTrackingNumber(trackingNumber);
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    return this.mapToDeliveryResponse(delivery);
  }

  /**
   * Get deliveries with pagination
   * @param page Page number
   * @param limit Items per page
   * @param status Filter by status
   * @param provider Filter by provider
   * @returns Promise<{ deliveries: DeliveryResponseDto[]; total: number; page: number; limit: number }>
   */
  async getDeliveries(
    page: number = 1,
    limit: number = 10,
    status?: ShipmentStatus,
    provider?: DeliveryProvider,
  ): Promise<{ deliveries: DeliveryResponseDto[]; total: number; page: number; limit: number }> {
    const result = await this.deliveryRepository.findAll(page, limit, status, provider);
    
    return {
      deliveries: result.deliveries.map(delivery => this.mapToDeliveryResponse(delivery)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /**
   * Add tracking event
   * @param deliveryId Delivery ID
   * @param status Event status
   * @param description Event description
   * @param location Event location
   */
  private async addTrackingEvent(
    deliveryId: string,
    status: string,
    description: string,
    location?: string,
  ): Promise<void> {
    const trackingEvent = this.deliveryTrackingRepository.create({
      delivery_id: deliveryId,
      status,
      description,
      location,
      timestamp: new Date(),
    });

    await this.deliveryTrackingRepository.save(trackingEvent);
  }

  /**
   * Map tracking status to delivery status
   * @param trackingStatus Tracking status
   * @returns DeliveryStatus
   */
  private mapTrackingStatusToDeliveryStatus(trackingStatus: string): ShipmentStatus {
    switch (trackingStatus.toLowerCase()) {
      case 'picked_up':
        return ShipmentStatus.PICKED_UP;
      case 'in_transit':
        return ShipmentStatus.IN_TRANSIT;
      case 'out_for_delivery':
        return ShipmentStatus.OUT_FOR_DELIVERY;
      case 'delivered':
        return ShipmentStatus.DELIVERED;
      case 'failed':
        return ShipmentStatus.FAILED;
      case 'cancelled':
        return ShipmentStatus.CANCELLED;
      case 'returned':
        return ShipmentStatus.RETURNED;
      default:
        return ShipmentStatus.PENDING;
    }
  }

  /**
   * Map webhook event to delivery status
   * @param eventType Webhook event type
   * @returns DeliveryStatus | null
   */
  private mapWebhookEventToDeliveryStatus(eventType: string): ShipmentStatus | null {
    switch (eventType) {
      case 'shipment.picked_up':
        return ShipmentStatus.PICKED_UP;
      case 'shipment.in_transit':
        return ShipmentStatus.IN_TRANSIT;
      case 'shipment.out_for_delivery':
        return ShipmentStatus.OUT_FOR_DELIVERY;
      case 'shipment.delivered':
        return ShipmentStatus.DELIVERED;
      case 'shipment.failed':
        return ShipmentStatus.FAILED;
      case 'shipment.cancelled':
        return ShipmentStatus.CANCELLED;
      case 'shipment.returned':
        return ShipmentStatus.RETURNED;
      default:
        return null;
    }
  }

  /**
   * Get package categories for shipping (Shipbubble-specific)
   * @returns Promise<ShipbubblePackageCategoriesResponseDto>
   */
  async getPackageCategories(): Promise<ShipbubblePackageCategoriesResponseDto> {
    this.logger.log('Getting package categories from Shipbubble');
    const shipbubbleProvider = this.providerFactory.getShipbubbleProvider();
    return await shipbubbleProvider.getPackageCategories();
  }

  /**
   * Get package dimensions for shipping (Shipbubble-specific)
   * @returns Promise<ShipbubblePackageDimensionsResponseDto>
   */
  async getPackageDimensions(): Promise<ShipbubblePackageDimensionsResponseDto> {
    this.logger.log('Getting package dimensions from Shipbubble');
    const shipbubbleProvider = this.providerFactory.getShipbubbleProvider();
    return await shipbubbleProvider.getPackageDimensions();
  }

  /**
   * Create shipment label using request token from rates API (Shipbubble-specific)
   * @param shipmentRequest Shipment creation request
   * @returns Promise<ShipbubbleCreateShipmentResponseDto>
   */
  async createShipmentLabel(shipmentRequest: ShipbubbleCreateShipmentRequestDto): Promise<ShipbubbleCreateShipmentResponseDto> {
    this.logger.log(`Creating shipment label with request token: ${shipmentRequest.request_token}`);
    const shipbubbleProvider = this.providerFactory.getShipbubbleProvider();
    return await shipbubbleProvider.createShipmentLabel(shipmentRequest);
  }

  /**
   * Fetch shipping rates (Shipbubble-specific)
   * @param ratesRequest Shipbubble-specific rates request
   * @returns Promise<any>
   */
  async fetchShippingRates(ratesRequest: any): Promise<any> {
    this.logger.log('Fetching shipping rates from Shipbubble');
    const shipbubbleProvider = this.providerFactory.getShipbubbleProvider();
    return await shipbubbleProvider.fetchShippingRates(ratesRequest);
  }

  /**
   * Get supported countries
   * @returns string[]
   */
  getSupportedCountries(): string[] {
    return this.providerFactory.getSupportedCountries();
  }

  /**
   * Check if country is supported
   * @param country Country code
   * @returns boolean
   */
  isCountrySupported(country: string): boolean {
    return this.providerFactory.isCountrySupported(country);
  }

  /**
   * Get provider name for a country
   * @param country Country code
   * @returns string
   */
  getProviderNameByCountry(country: string): string {
    return this.providerFactory.getProviderNameByCountry(country);
  }

  /**
   * Map delivery entity to response DTO
   * @param delivery Delivery entity
   * @returns DeliveryResponseDto
   */
  private mapToDeliveryResponse(delivery: Delivery): DeliveryResponseDto {
    return {
      id: delivery.id,
      orderId: delivery.order_id,
      provider: delivery.provider,
      trackingNumber: delivery.tracking_number,
      status: delivery.status,
      cost: delivery.cost,
      currency: delivery.currency,
      courier: delivery.courier_name,
      service: delivery.service_type,
      estimatedDelivery: delivery.estimated_delivery,
      createdAt: delivery.created_at,
      updatedAt: delivery.updated_at,
    };
  }
}
