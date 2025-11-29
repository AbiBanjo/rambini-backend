import { Injectable, Logger } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, OrderItem, MenuItem, Vendor, User, Address, OrderStatus } from 'src/entities';
import { OrderFilterDto } from '../dto';

@Injectable()
export class OrderRepository {
  private readonly logger = new Logger(OrderRepository.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
  ) {}

  async create(order: Partial<Order>): Promise<Order> {
    const newOrder = this.orderRepository.create(order);
    return await this.orderRepository.save(newOrder);
  }

  async createOrderItem(orderItem: Partial<OrderItem>): Promise<OrderItem> {
    const newOrderItem = this.orderItemRepository.create(orderItem);
    return await this.orderItemRepository.save(newOrderItem);
  }

  async findById(id: string): Promise<Order | null> {
    // Use QueryBuilder to ensure customer email is loaded
    return await this.orderRepository
      .createQueryBuilder('order')
      // Load customer with all necessary fields including email
      .leftJoinAndSelect('order.customer', 'customer')
      // Load vendor relations
      .leftJoinAndSelect('order.vendor', 'vendor')
      .leftJoinAndSelect('vendor.user', 'vendor_user')
      .leftJoinAndSelect('vendor.address', 'vendor_address')
      // Load delivery address
      .leftJoinAndSelect('order.delivery_address', 'delivery_address')
      // Load order items
      .leftJoinAndSelect('order.order_items', 'order_items')
      .leftJoinAndSelect('order_items.menu_item', 'menu_item')
      .leftJoinAndSelect('menu_item.vendor', 'menu_item_vendor')
      .leftJoinAndSelect('menu_item.category', 'category')
      // Load delivery quote
      .leftJoinAndSelect('order.delivery_quote', 'delivery_quote')
      .where('order.id = :id', { id })
      .getOne();
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    return await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.vendor', 'vendor')
      .leftJoinAndSelect('vendor.user', 'vendor_user')
      .leftJoinAndSelect('order.delivery_address', 'delivery_address')
      .leftJoinAndSelect('order.order_items', 'order_items')
      .leftJoinAndSelect('order_items.menu_item', 'menu_item')
      .where('order.order_number = :orderNumber', { orderNumber })
      .getOne();
  }

  async findByCustomerId(customerId: string, filterDto?: OrderFilterDto): Promise<{ orders: Order[] }> {
    const queryBuilder = this.createOrderQueryBuilder(filterDto);
    queryBuilder.andWhere('order.customer_id = :customerId', { customerId });
    const orders = await queryBuilder.getMany();

    return { orders };
  }

  async findByVendorId(vendorId: string, filterDto?: OrderFilterDto): Promise<{ orders: Order[] }> {
    const queryBuilder = this.createOrderQueryBuilder(filterDto);
    queryBuilder.andWhere('order.vendor_id = :vendorId', { vendorId });

    const orders = await queryBuilder.getMany();

    return { orders };
  }

  async findAll(filterDto?: OrderFilterDto): Promise<{ orders: Order[]; total: number }> {
    const queryBuilder = this.createOrderQueryBuilder(filterDto);

    const total = await queryBuilder.getCount();
    const page = filterDto?.page || 1;
    const limit = filterDto?.limit || 20;
    const offset = (page - 1) * limit;

    queryBuilder.skip(offset).take(limit);
    const orders = await queryBuilder.getMany();

    return { orders, total };
  }

  async update(id: string, updateData: Partial<Order>): Promise<Order | null> {
    await this.orderRepository.update(id, updateData);
    return await this.findById(id);
  }

  async updateOrderItem(id: string, updateData: Partial<OrderItem>): Promise<OrderItem | null> {
    await this.orderItemRepository.update(id, updateData);
    return await this.orderItemRepository.findOne({ where: { id } });
  }

  async delete(id: string): Promise<void> {
    await this.orderRepository.softDelete(id);
  }

  async getOrderStats(vendorId?: string, customerId?: string): Promise<{
    total_orders: number;
    total_revenue: number;
    average_order_value: number;
    orders_by_status: Record<string, number>;
    recent_orders: Order[];
  }> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.order_items', 'order_items');

    if (vendorId) {
      queryBuilder.andWhere('order.vendor_id = :vendorId', { vendorId });
    }

    if (customerId) {
      queryBuilder.andWhere('order.customer_id = :customerId', { customerId });
    }

    // Get total orders and revenue
    const totalOrders = await queryBuilder.getCount();
    const totalRevenue = await queryBuilder
      .select('SUM(order.total_amount)', 'total')
      .getRawOne();

    // Get average order value
    const averageOrderValue = totalOrders > 0 ? (totalRevenue?.total || 0) / totalOrders : 0;

    // Get orders by status
    const ordersByStatus = await queryBuilder
      .select('order.order_status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.order_status')
      .getRawMany();

    const statusCounts: Record<string, number> = {};
    ordersByStatus.forEach((item: any) => {
      statusCounts[item.status] = parseInt(item.count);
    });

    // Get recent orders
    const recentOrders = await queryBuilder
      .orderBy('order.created_at', 'DESC')
      .take(5)
      .getMany();

    return {
      total_orders: totalOrders,
      total_revenue: parseFloat(totalRevenue?.total || '0'),
      average_order_value: averageOrderValue,
      orders_by_status: statusCounts,
      recent_orders: recentOrders,
    };
  }

  async getOrdersByStatus(status: OrderStatus, vendorId?: string): Promise<Order[]> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.vendor', 'vendor')
      .leftJoinAndSelect('order.order_items', 'order_items')
      .leftJoinAndSelect('order_items.menu_item', 'menu_item')
      .where('order.order_status = :status', { status });

    if (vendorId) {
      queryBuilder.andWhere('order.vendor_id = :vendorId', { vendorId });
    }

    return await queryBuilder
      .orderBy('order.created_at', 'ASC')
      .getMany();
  }

  async getPendingOrders(vendorId?: string): Promise<Order[]> {
    return await this.getOrdersByStatus(OrderStatus.NEW, vendorId);
  }

  async getActiveOrders(vendorId?: string): Promise<Order[]> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.vendor', 'vendor')
      .leftJoinAndSelect('order.order_items', 'order_items')
      .leftJoinAndSelect('order_items.menu_item', 'menu_item')
      .where('order.order_status IN (:...statuses)', {
        statuses: ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'],
      });

    if (vendorId) {
      queryBuilder.andWhere('order.vendor_id = :vendorId', { vendorId });
    }

    return await queryBuilder
      .orderBy('order.created_at', 'ASC')
      .getMany();
  }

  async getCompletedOrders(vendorId?: string): Promise<Order[]> {
    return await this.getOrdersByStatus(OrderStatus.DELIVERED, vendorId);
  }

  async getCancelledOrders(vendorId?: string): Promise<Order[]> {
    return await this.getOrdersByStatus(OrderStatus.CANCELLED, vendorId);
  }

  async getActiveOrdersForCustomer(customerId: string): Promise<Order[]> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.vendor', 'vendor')
      .where('order.customer_id = :customerId', { customerId })
      .andWhere('order.order_status IN (:...statuses)', {
        statuses: ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'],
      });

    return await queryBuilder
      .orderBy('order.created_at', 'DESC')
      .getMany();
  }

  async generateOrderNumber(): Promise<string> {
    // Generate UUID-based order number - simple and no race conditions!
    const { v4: uuidv4 } = await import('uuid');
    const orderNumber = `ORD-${uuidv4().substring(0, 8)}`;
    this.logger.log(`Generated UUID-based order number: ${orderNumber}`);
    return orderNumber;
  }

  private createOrderQueryBuilder(filterDto?: OrderFilterDto): SelectQueryBuilder<Order> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.vendor', 'vendor')
      .leftJoinAndSelect('order.delivery_address', 'delivery_address')
      .leftJoinAndSelect('order.order_items', 'order_items')
      .leftJoinAndSelect('order_items.menu_item', 'menu_item');

    if (filterDto?.order_status) {
      queryBuilder.andWhere('order.order_status = :orderStatus', { orderStatus: filterDto.order_status });
    }

    if (filterDto?.order_type) {
      queryBuilder.andWhere('order.order_type = :orderType', { orderType: filterDto.order_type });
    }

    if (filterDto?.payment_status) {
      queryBuilder.andWhere('order.payment_status = :paymentStatus', { paymentStatus: filterDto.payment_status });
    }

    if (filterDto?.vendor_id) {
      queryBuilder.andWhere('order.vendor_id = :vendorId', { vendorId: filterDto.vendor_id });
    }

    if (filterDto?.customer_id) {
      queryBuilder.andWhere('order.customer_id = :customerId', { customerId: filterDto.customer_id });
    }

    if (filterDto?.order_number) {
      queryBuilder.andWhere('order.order_number ILIKE :orderNumber', { orderNumber: `%${filterDto.order_number}%` });
    }

    if (filterDto?.from_date) {
      queryBuilder.andWhere('order.created_at >= :fromDate', { fromDate: new Date(filterDto.from_date) });
    }

    if (filterDto?.to_date) {
      queryBuilder.andWhere('order.created_at <= :toDate', { toDate: new Date(filterDto.to_date) });
    }

    if (filterDto?.min_amount !== undefined) {
      queryBuilder.andWhere('order.total_amount >= :minAmount', { minAmount: filterDto.min_amount });
    }

    if (filterDto?.max_amount !== undefined) {
      queryBuilder.andWhere('order.total_amount <= :maxAmount', { maxAmount: filterDto.max_amount });
    }

    // Apply sorting
    const sortBy = filterDto?.sort_by || 'created_at';
    const sortOrder = filterDto?.sort_order || 'DESC';
    queryBuilder.orderBy(`order.${sortBy}`, sortOrder as 'ASC' | 'DESC');

    return queryBuilder;
  }
}