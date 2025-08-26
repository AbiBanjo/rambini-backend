import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { OrderRepository } from '../repositories/order.repository';
import { CartService } from 'src/modules/cart/services/cart.service';
import { MenuItemRepository } from 'src/modules/menu/repositories/menu-item.repository';
import { AddressService } from 'src/modules/user/services/address.service';
import { 
  CreateOrderDto, 
  UpdateOrderStatusDto, 
  OrderResponseDto, 
  OrderItemResponseDto,
  OrderFilterDto 
} from '../dto';
import { Order, OrderItem, OrderStatus, PaymentStatus, OrderType, PaymentMethod } from 'src/entities';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly cartService: CartService,
    private readonly menuItemRepository: MenuItemRepository,
    private readonly addressService: AddressService,
  ) {}

  async createOrder(customerId: string, createOrderDto: CreateOrderDto): Promise<OrderResponseDto> {
    this.logger.log(`Creating order for customer ${customerId}`);

    // Validate delivery address
    const deliveryAddress = await this.addressService.getAddressById(customerId, createOrderDto.delivery_address_id);
    if (!deliveryAddress) {
      throw new NotFoundException('Delivery address not found');
    }

    // Get order items from cart or custom items
    let orderItems: any[] = [];
    let vendorId: string | null = null;
    let subtotal = 0;

    if (createOrderDto.use_cart_items !== false) {
      // Use cart items
      const cart = await this.cartService.getCart(customerId);
      if (cart.items.length === 0) {
        throw new BadRequestException('Cart is empty. Please add items to cart before placing order.');
      }

      // Validate cart items
      const cartValidation = await this.cartService.validateCart(customerId);
      if (!cartValidation.is_valid) {
        throw new BadRequestException('Cart contains invalid items. Please resolve issues before placing order.');
      }

      // Check if all items are from the same vendor
      const vendorIds = new Set(cart.items.map(item => item.vendor_id));
      if (vendorIds.size > 1) {
        throw new BadRequestException('All items in an order must be from the same vendor. Please create separate orders for different vendors.');
      }

      vendorId = cart.items[0].vendor_id;
      orderItems = cart.items.map(item => ({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      subtotal = cart.subtotal;
    } else if (createOrderDto.custom_items && createOrderDto.custom_items.length > 0) {
      // Use custom items
      const menuItems = await Promise.all(
        createOrderDto.custom_items.map(async (item) => {
          const menuItem = await this.menuItemRepository.findById(item.menu_item_id);
          if (!menuItem) {
            throw new NotFoundException(`Menu item ${item.menu_item_id} not found`);
          }
          if (!menuItem.is_available) {
            throw new BadRequestException(`Menu item "${menuItem.name}" is not available`);
          }
          return { menuItem, orderItem: item };
        })
      );

      // Check if all items are from the same vendor
      const vendorIds = new Set(menuItems.map(item => item.menuItem.vendor_id));
      if (vendorIds.size > 1) {
        throw new BadRequestException('All items in an order must be from the same vendor');
      }

      vendorId = menuItems[0].menuItem.vendor_id;
      orderItems = menuItems.map(item => ({
        menu_item_id: item.menuItem.id,
        quantity: item.orderItem.quantity,
        unit_price: item.menuItem.price,
        total_price: item.menuItem.price * item.orderItem.quantity,
        special_instructions: item.orderItem.special_instructions,
        customizations: item.orderItem.customizations,
      }));

      subtotal = orderItems.reduce((sum, item) => sum + item.total_price, 0);
    } else {
      throw new BadRequestException('Either use cart items or provide custom items');
    }

    // Calculate fees and totals
    const deliveryFee = this.calculateDeliveryFee(createOrderDto.order_type, subtotal);
    const serviceFee = this.calculateServiceFee(subtotal);
    const taxAmount = this.calculateTaxAmount(subtotal);
    const discountAmount = 0; // No discounts for now
    const commissionAmount = this.calculateCommissionAmount(subtotal);
    const totalAmount = subtotal + deliveryFee + serviceFee + taxAmount - discountAmount;

    // Generate order number
    const orderNumber = await this.orderRepository.generateOrderNumber();

    // Create order
    const order = await this.orderRepository.create({
      order_number: orderNumber,
      customer_id: customerId,
      vendor_id: vendorId!,
      delivery_address_id: createOrderDto.delivery_address_id,
      order_status: OrderStatus.NEW,
      order_type: createOrderDto.order_type,
      payment_method: createOrderDto.payment_method,
      payment_status: PaymentStatus.PENDING,
      subtotal,
      delivery_fee: deliveryFee,
      service_fee: serviceFee,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      commission_amount: commissionAmount,
      total_amount: totalAmount,
      // delivery_instructions: createOrderDto.delivery_instructions,
      vendor_notes: createOrderDto.vendor_notes,
    });

    // Create order items
    for (const item of orderItems) {
      await this.orderRepository.createOrderItem({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        special_instructions: item.special_instructions,
        // customizations: item.customizations,
      });
    }

    // Clear cart if using cart items
    if (createOrderDto.use_cart_items !== false) {
      await this.cartService.clearCart(customerId);
    }

    // Get complete order with relations
    const completeOrder = await this.orderRepository.findById(order.id);
    if (!completeOrder) {
      throw new NotFoundException('Failed to retrieve created order');
    }

    this.logger.log(`Order created successfully: ${order.id} (${orderNumber})`);
    return this.mapToOrderResponse(completeOrder);
  }

  async getOrderById(orderId: string, userId: string, userType: string): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check access permissions
    if (userType === 'CUSTOMER' && order.customer_id !== userId) {
      throw new ForbiddenException('You can only view your own orders');
    }

    if (userType === 'VENDOR' && order.vendor_id !== userId) {
      throw new ForbiddenException('You can only view orders for your vendor account');
    }

    return this.mapToOrderResponse(order);
  }

  async getCustomerOrders(customerId: string, filterDto?: OrderFilterDto): Promise<{ orders: OrderResponseDto[]; total: number }> {
    const result = await this.orderRepository.findByCustomerId(customerId, filterDto);
    
    const orders = result.orders.map(order => this.mapToOrderResponse(order));
    
    return {
      orders,
      total: result.total,
    };
  }

  async getVendorOrders(vendorId: string, filterDto?: OrderFilterDto): Promise<{ orders: OrderResponseDto[]; total: number }> {
    const result = await this.orderRepository.findByVendorId(vendorId, filterDto);
    
    const orders = result.orders.map(order => this.mapToOrderResponse(order));
    
    return {
      orders,
      total: result.total,
    };
  }

  async updateOrderStatus(
    orderId: string, 
    vendorId: string, 
    updateDto: UpdateOrderStatusDto
  ): Promise<OrderResponseDto> {
    this.logger.log(`Updating order ${orderId} status to ${updateDto.order_status}`);

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify vendor ownership
    if (order.vendor_id !== vendorId) {
      throw new ForbiddenException('You can only update orders for your vendor account');
    }

    // Validate status transition
    this.validateStatusTransition(order.order_status, updateDto.order_status);

    // Update order with new status and additional fields
    const updateData: Partial<Order> = {
      order_status: updateDto.order_status,
    };

    // Handle specific status updates
    switch (updateDto.order_status) {
      case OrderStatus.CONFIRMED:
        if (updateDto.estimated_prep_time_minutes) {
          updateData.estimated_prep_time_minutes = updateDto.estimated_prep_time_minutes;
        }
        break;

      case OrderStatus.PREPARING:
        if (updateDto.estimated_prep_time_minutes) {
          updateData.estimated_prep_time_minutes = updateDto.estimated_prep_time_minutes;
        }
        break;

      case OrderStatus.READY:
        updateData.order_ready_at = new Date();
        if (updateDto.estimated_delivery_time) {
          updateData.estimated_delivery_time = new Date(updateDto.estimated_delivery_time);
        }
        break;

      case OrderStatus.OUT_FOR_DELIVERY:
        if (updateDto.estimated_delivery_time) {
          updateData.estimated_delivery_time = new Date(updateDto.estimated_delivery_time);
        }
        break;

      case OrderStatus.DELIVERED:
        updateData.delivered_at = new Date();
        if (updateDto.customer_rating) {
          updateData.customer_rating = updateDto.customer_rating;
        }
        if (updateDto.customer_review) {
          updateData.customer_review = updateDto.customer_review;
        }
        break;

      case OrderStatus.CANCELLED:
        updateData.cancelled_at = new Date();
        updateData.cancellation_reason = updateDto.reason || 'Cancelled by vendor';
        updateData.cancelled_by = 'VENDOR';
        break;
    }

    // Update vendor notes if provided
    if (updateDto.vendor_notes) {
      updateData.vendor_notes = updateDto.vendor_notes;
    }

    const updatedOrder = await this.orderRepository.update(orderId, updateData);
    if (!updatedOrder) {
      throw new NotFoundException('Failed to update order');
    }

    this.logger.log(`Order ${orderId} status updated to ${updateDto.order_status}`);
    return this.mapToOrderResponse(updatedOrder);
  }

  async cancelOrder(orderId: string, userId: string, userType: string, reason: string): Promise<OrderResponseDto> {
    this.logger.log(`Cancelling order ${orderId} by ${userType} ${userId}`);

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check cancellation permissions
    if (userType === 'CUSTOMER') {
      if (order.customer_id !== userId) {
        throw new ForbiddenException('You can only cancel your own orders');
      }
      if (!this.canCustomerCancel(order.order_status)) {
        throw new BadRequestException('Order cannot be cancelled at this stage');
      }
    } else if (userType === 'VENDOR') {
      if (order.vendor_id !== userId) {
        throw new ForbiddenException('You can only cancel orders for your vendor account');
      }
      if (!this.canVendorCancel(order.order_status)) {
        throw new BadRequestException('Order cannot be cancelled at this stage');
      }
    } else {
      throw new ForbiddenException('Invalid user type for order cancellation');
    }

    // Update order status to cancelled
    const updateData: Partial<Order> = {
      order_status: OrderStatus.CANCELLED,
      cancelled_at: new Date(),
      cancellation_reason: reason,
      cancelled_by: userType.toUpperCase(),
    };

    const updatedOrder = await this.orderRepository.update(orderId, updateData);
    if (!updatedOrder) {
      throw new NotFoundException('Failed to cancel order');
    }

    this.logger.log(`Order ${orderId} cancelled successfully`);
    return this.mapToOrderResponse(updatedOrder);
  }

  async getOrderStats(vendorId?: string, customerId?: string): Promise<{
    total_orders: number;
    total_revenue: number;
    average_order_value: number;
    orders_by_status: Record<string, number>;
    recent_orders: OrderResponseDto[];
  }> {
    const stats = await this.orderRepository.getOrderStats(vendorId, customerId);
    
    const recentOrders = stats.recent_orders.map(order => this.mapToOrderResponse(order));
    
    return {
      ...stats,
      recent_orders: recentOrders,
    };
  }

  async getPendingOrders(vendorId?: string): Promise<OrderResponseDto[]> {
    const orders = await this.orderRepository.getPendingOrders(vendorId);
    return orders.map(order => this.mapToOrderResponse(order));
  }

  async getActiveOrders(vendorId?: string): Promise<OrderResponseDto[]> {
    const orders = await this.orderRepository.getActiveOrders(vendorId);
    return orders.map(order => this.mapToOrderResponse(order));
  }

  async getCompletedOrders(vendorId?: string): Promise<OrderResponseDto[]> {
    const orders = await this.orderRepository.getCompletedOrders(vendorId);
    return orders.map(order => this.mapToOrderResponse(order));
  }

  async getCancelledOrders(vendorId?: string): Promise<OrderResponseDto[]> {
    const orders = await this.orderRepository.getCancelledOrders(vendorId);
    return orders.map(order => this.mapToOrderResponse(order));
  }

  private calculateDeliveryFee(orderType: OrderType, subtotal: number): number {
    if (orderType === OrderType.PICKUP) {
      return 0;
    }
    
    // Base delivery fee: ₦200 for orders under ₦1000, ₦100 for orders over ₦1000
    return subtotal < 1000 ? 200 : 100;
  }

  private calculateServiceFee(subtotal: number): number {
    // 5% service fee
    return subtotal * 0.05;
  }

  private calculateTaxAmount(subtotal: number): number {
    // 7.5% VAT
    return subtotal * 0.075;
  }

  private calculateCommissionAmount(subtotal: number): number {
    // 15% platform commission
    return subtotal * 0.15;
  }

  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.NEW]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
      [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [], // Final state
      [OrderStatus.CANCELLED]: [], // Final state
      [OrderStatus.REFUNDED]: [], // Final state
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  private canCustomerCancel(status: OrderStatus): boolean {
    return [OrderStatus.NEW, OrderStatus.CONFIRMED].includes(status);
  }

  private canVendorCancel(status: OrderStatus): boolean {
    return [OrderStatus.NEW, OrderStatus.CONFIRMED, OrderStatus.PREPARING].includes(status);
  }

  private mapToOrderResponse(order: Order): OrderResponseDto {
    return {
      id: order.id,
      order_number: order.order_number,
      customer_id: order.customer_id,
      vendor_id: order.vendor_id,
      vendor_name: order.vendor?.business_name || 'Unknown',
      delivery_address_id: order.delivery_address_id,
      order_status: order.order_status,
      order_type: order.order_type,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      payment_reference: order.payment_reference,
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      service_fee: order.service_fee,
      tax_amount: order.tax_amount,
      discount_amount: order.discount_amount,
      commission_amount: order.commission_amount,
      total_amount: order.total_amount,
      estimated_prep_time_minutes: order.estimated_prep_time_minutes,
      estimated_delivery_time: order.estimated_delivery_time,
      order_ready_at: order.order_ready_at,
      delivered_at: order.delivered_at,
      cancelled_at: order.cancelled_at,
      cancellation_reason: order.cancellation_reason,
      cancelled_by: order.cancelled_by,
      // delivery_instructions: order.delivery_instructions,
      delivery_notes: order.delivery_notes,
      customer_rating: order.customer_rating,
      customer_review: order.customer_review,
      vendor_notes: order.vendor_notes,
      created_at: order.created_at,
      updated_at: order.updated_at,
      order_items: order.order_items?.map(item => this.mapToOrderItemResponse(item)) || [],
      delivery_address: order.delivery_address ? {
        address_line_1: order.delivery_address.address_line_1,
        address_line_2: order.delivery_address.address_line_2,
        city: order.delivery_address.city,
        state: order.delivery_address.state,
        postal_code: order.delivery_address.postal_code,
        country: order.delivery_address.country,
        latitude: order.delivery_address.latitude,
        longitude: order.delivery_address.longitude,
      } : {
        address_line_1: '',
        city: '',
        state: '',
        country: '',
      },
    };
  }

  private mapToOrderItemResponse(orderItem: OrderItem): OrderItemResponseDto {
    return {
      id: orderItem.id,
      menu_item_id: orderItem.menu_item_id,
      menu_item_name: orderItem.menu_item?.name || 'Unknown',
      menu_item_image: orderItem.menu_item?.image_url,
      quantity: orderItem.quantity,
      unit_price: orderItem.unit_price,
      total_price: orderItem.total_price,
      special_instructions: orderItem.special_instructions,
      // customizations: orderItem.customizations,
      created_at: orderItem.created_at,
    };
  }
} 