import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Delivery, ShipmentStatus, DeliveryProvider } from 'src/entities';

@Injectable()
export class DeliveryRepository {
  constructor(
    @InjectRepository(Delivery)
    private readonly deliveryRepository: Repository<Delivery>,
  ) {}

  /**
   * Create a new delivery record
   * @param deliveryData Delivery data
   * @returns Promise<Delivery>
   */
  async create(deliveryData: Partial<Delivery>): Promise<Delivery> {
    const delivery = this.deliveryRepository.create(deliveryData);
    return await this.deliveryRepository.save(delivery);
  }

  /**
   * Find delivery by ID
   * @param id Delivery ID
   * @returns Promise<Delivery | null>
   */
  async findById(id: string): Promise<Delivery | null> {
    return await this.deliveryRepository.findOne({
      where: { id },
      relations: ['order', 'trackingEvents'],
    });
  }

  /**
   * Find delivery by tracking number
   * @param trackingNumber Tracking number
   * @returns Promise<Delivery | null>
   */
  async findByTrackingNumber(trackingNumber: string): Promise<Delivery | null> {
    return await this.deliveryRepository.findOne({
      where: { tracking_number: trackingNumber },
      relations: ['order', 'tracking_events'],
    });
  }

  /**
   * Find delivery by order ID
   * @param orderId Order ID
   * @returns Promise<Delivery | null>
   */
  async findByOrderId(orderId: string): Promise<Delivery | null> {
    return await this.deliveryRepository.findOne({
      where: { order_id: orderId },
      relations: ['order', 'tracking_events'],
    });
  }

  /**
   * Find deliveries by status
   * @param status Delivery status
   * @returns Promise<Delivery[]>
   */
  async findByStatus(status: ShipmentStatus): Promise<Delivery[]> {
    return await this.deliveryRepository.find({
      where: { status },
      relations: ['order', 'tracking_events'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Find deliveries by provider
   * @param provider Delivery provider
   * @returns Promise<Delivery[]>
   */
  async findByProvider(provider: DeliveryProvider): Promise<Delivery[]> {
    return await this.deliveryRepository.find({
      where: { provider },
      relations: ['order', 'tracking_events'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Update delivery
   * @param id Delivery ID
   * @param updateData Update data
   * @returns Promise<Delivery>
   */
  async update(id: string, updateData: Partial<Delivery>): Promise<Delivery> {
    await this.deliveryRepository.update(id, updateData);
    return await this.findById(id);
  }

  /**
   * Update delivery status
   * @param id Delivery ID
   * @param status New status
   * @param failureReason Failure reason (if applicable)
   * @returns Promise<Delivery>
   */
  async updateStatus(
    id: string,
    status: ShipmentStatus,
    failureReason?: string,
  ): Promise<Delivery> {
    const updateData: Partial<Delivery> = { status };
    if (failureReason) {
      updateData.failure_reason = failureReason;
    }
    if (status === ShipmentStatus.DELIVERED) {
      updateData.actual_delivery = new Date();
    }
    return await this.update(id, updateData);
  }

  /**
   * Delete delivery
   * @param id Delivery ID
   * @returns Promise<void>
   */
  async delete(id: string): Promise<void> {
    await this.deliveryRepository.delete(id);
  }

  /**
   * Get all deliveries with pagination
   * @param page Page number
   * @param limit Items per page
   * @param status Filter by status (optional)
   * @param provider Filter by provider (optional)
   * @returns Promise<{ deliveries: Delivery[]; total: number; page: number; limit: number }>
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: ShipmentStatus,
    provider?: DeliveryProvider,
  ): Promise<{ deliveries: Delivery[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.deliveryRepository
      .createQueryBuilder('delivery')
      .leftJoinAndSelect('delivery.order', 'order')
      .leftJoinAndSelect('delivery.tracking_events', 'tracking_events')
      .orderBy('delivery.created_at', 'DESC');

    if (status) {
      queryBuilder.andWhere('delivery.status = :status', { status });
    }

    if (provider) {
      queryBuilder.andWhere('delivery.provider = :provider', { provider });
    }

    const [deliveries, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      deliveries,
      total,
      page,
      limit,
    };
  }
}
