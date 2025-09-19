import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryRepository } from '../repositories/delivery.repository';
import { ShipbubbleDeliveryService } from './shipbubble-delivery.service';
import { UberDeliveryService } from './uber-delivery.service';
import { Delivery, ShipmentStatus, DeliveryProvider, DeliveryTracking } from 'src/entities';
import { DeliveryProviderInterface } from '../interfaces/delivery-provider.interface';
import {
  AddressValidationDto,
  DeliveryRateRequestDto,
  CreateShipmentDto,
  AddressValidationResponseDto,
  DeliveryRateResponseDto,
  CreateShipmentResponseDto,
  ShipmentTrackingResponseDto,
  DeliveryWebhookDto,
} from '../dto';
import { DeliveryResponseDto } from '../dto';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);
  private readonly deliveryProviders: Map<DeliveryProvider, DeliveryProviderInterface>;

  constructor(
    private readonly deliveryRepository: DeliveryRepository,
    private readonly shipbubbleDeliveryService: ShipbubbleDeliveryService,
    private readonly uberDeliveryService: UberDeliveryService,
    @InjectRepository(DeliveryTracking)
    private readonly deliveryTrackingRepository: Repository<DeliveryTracking>,
  ) {
    // Initialize delivery providers
    this.deliveryProviders = new Map();
    this.deliveryProviders.set(DeliveryProvider.SHIPBUBBLE, this.shipbubbleDeliveryService);
    this.deliveryProviders.set(DeliveryProvider.UBER, this.uberDeliveryService);
  }

  /**
   * Validate delivery address
   * @param provider Delivery provider
   * @param address Address to validate
   * @returns Promise<AddressValidationResult>
   */
  async validateAddress(
    provider: DeliveryProvider,
    address: AddressValidationDto,
  ): Promise<AddressValidationResponseDto> {
    const deliveryProvider = this.deliveryProviders.get(provider);
    if (!deliveryProvider) {
      throw new BadRequestException(`Unsupported delivery provider: ${provider}`);
    }

    return await deliveryProvider.validateAddress(address);
  }

  /**
   * Get delivery rates
   * @param provider Delivery provider
   * @param rateRequest Rate request parameters
   * @returns Promise<DeliveryRate[]>
   */
  async getDeliveryRates(
    provider: DeliveryProvider,
    rateRequest: DeliveryRateRequestDto,
  ): Promise<DeliveryRateResponseDto[]> {
    const deliveryProvider = this.deliveryProviders.get(provider);
    if (!deliveryProvider) {
      throw new BadRequestException(`Unsupported delivery provider: ${provider}`);
    }

    return await deliveryProvider.getDeliveryRates(rateRequest);
  }

  /**
   * Create a delivery for an order
   * @param orderId Order ID
   * @param provider Delivery provider
   * @param shipmentData Shipment creation data
   * @returns Promise<DeliveryResponseDto>
   */
  async createDelivery(
    orderId: string,
    provider: DeliveryProvider,
    shipmentData: CreateShipmentDto,
  ): Promise<DeliveryResponseDto> {
    this.logger.log(`Creating delivery for order ${orderId} with provider ${provider}`);

    // Check if delivery already exists for this order
    const existingDelivery = await this.deliveryRepository.findByOrderId(orderId);
    if (existingDelivery) {
      throw new BadRequestException('Delivery already exists for this order');
    }

    const deliveryProvider = this.deliveryProviders.get(provider);
    if (!deliveryProvider) {
      throw new BadRequestException(`Unsupported delivery provider: ${provider}`);
    }

    // Get delivery rates to find the selected rate
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

    // Create shipment with provider
    const shipmentResult = await deliveryProvider.createShipment(shipmentData);
    if (!shipmentResult.success) {
      throw new BadRequestException(shipmentResult.error || 'Failed to create shipment');
    }

    // Create delivery record
    const delivery = await this.deliveryRepository.create({
      order_id: orderId,
      provider,
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

    const deliveryProvider = this.deliveryProviders.get(delivery.provider);
    if (!deliveryProvider) {
      throw new BadRequestException(`Unsupported delivery provider: ${delivery.provider}`);
    }

    const trackingData = await deliveryProvider.trackShipment(trackingNumber);

    // Update delivery status based on tracking data
    const newStatus = this.mapTrackingStatusToDeliveryStatus(trackingData.status);
    if (newStatus !== delivery.status) {
      await this.deliveryRepository.updateStatus(delivery.id, newStatus);
      
      // Add tracking event
      await this.addTrackingEvent(delivery.id, trackingData.status, trackingData.statusDescription, trackingData.currentLocation);
    }

    return trackingData;
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

    const deliveryProvider = this.deliveryProviders.get(delivery.provider);
    if (!deliveryProvider) {
      throw new BadRequestException(`Unsupported delivery provider: ${delivery.provider}`);
    }

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
   * @returns Promise<WebhookResult>
   */
  async processWebhook(
    provider: DeliveryProvider,
    payload: any,
    signature: string,
  ): Promise<DeliveryWebhookDto> {
    const deliveryProvider = this.deliveryProviders.get(provider);
    if (!deliveryProvider) {
      throw new BadRequestException(`Unsupported delivery provider: ${provider}`);
    }

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
