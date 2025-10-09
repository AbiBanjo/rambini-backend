import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { OrderRepository } from '../repositories/order.repository';
import { CartService } from 'src/modules/cart/services/cart.service';
import { MenuItemRepository } from 'src/modules/menu/repositories/menu-item.repository';
import { AddressService } from 'src/modules/user/services/address.service';
import { PaymentService } from 'src/modules/payment/services/payment.service';
import { DeliveryService } from 'src/modules/delivery/services/delivery.service';
import { DeliveryProviderSelectorService } from 'src/modules/delivery/services/delivery-provider-selector.service';
import { DeliveryQuoteService } from 'src/modules/delivery/services/delivery-quote.service';
import { VendorService } from 'src/modules/vendor/services/vendor.service';
import { NotificationSSEService } from 'src/modules/notification/services/notification-sse.service';
import { NotificationService } from 'src/modules/notification/notification.service';
import { NotificationType } from 'src/entities';
import { 
  CreateOrderDto, 
  UpdateOrderStatusDto, 
  OrderResponseDto, 
  OrderItemResponseDto,
  OrderFilterDto,
  CalculateOrderCostDto,
  OrderCostResponseDto,
  OrderPaymentResponseDto
} from '../dto';
import { Order, OrderItem, OrderStatus, PaymentStatus, OrderType, PaymentMethod, DeliveryProvider, Currency, PaymentTransactionStatus } from 'src/entities';
import { ShipbubblePackageCategoryDto } from '@/modules/delivery/dto/delivery-rate.dto';
import { getCurrencyForCountry } from 'src/utils/currency-mapper';


@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly cartService: CartService,
    private readonly menuItemRepository: MenuItemRepository,
    private readonly addressService: AddressService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
    private readonly deliveryService: DeliveryService,
    private readonly deliveryProviderSelector: DeliveryProviderSelectorService,
    private readonly deliveryQuoteService: DeliveryQuoteService,
    private readonly vendorService: VendorService,
    private readonly notificationSSEService: NotificationSSEService,
    private readonly notificationService: NotificationService,
  ) {}

  async createOrder(customerId: string, createOrderDto: CreateOrderDto): Promise<OrderResponseDto | OrderPaymentResponseDto> {
    this.logger.log(`Creating order for customer ${customerId} with cart items: ${createOrderDto.vendor_id}`);

       // get vendor currency
       const vendor = await this.vendorService.getVendorById(createOrderDto.vendor_id);
      //  check if vendor exists
      if (!vendor) {
        throw new NotFoundException('Vendor not found');
      }

      // if vendor is not active
      if (!vendor.is_active) {
        throw new BadRequestException('Vendor is not active');
      }

      // get vendor currency from vendor country
      const vendorCurrency = getCurrencyForCountry(vendor.address.country);

    // Validate delivery address if there is one and get country for provider selection
    let deliveryFee = 0;
    
    if (createOrderDto.order_type === OrderType.DELIVERY) {
      
      const deliveryQuote = await this.deliveryQuoteService.getQuoteById(createOrderDto.delivery_quote_id);
      if (!deliveryQuote) {
        throw new NotFoundException('Delivery quote not found');
      }
      deliveryFee = deliveryQuote.fee;
      
    }

 

    // get all cart items for this vendor
    const {  items } = await this.cartService.getCartByVendor(customerId, createOrderDto.vendor_id);

    // get all cart item ids for this vendor
    const cartItemIds = items.map(item => item.id);
    // Validate cart items for checkout
    const cartValidation = await this.cartService.validateCartItemsForCheckout(customerId, cartItemIds);

    this.logger.log(`Cart validation: ${JSON.stringify(cartValidation)}`);
    
    if (!cartValidation.is_valid) {
      throw new BadRequestException(`Cart validation failed: ${cartValidation.issues.join(', ')}`);
    }

    const { cartItems, vendorId, subtotal } = cartValidation

    this.logger.log(`Delivery fee: ${deliveryFee}`);
  
    const totalAmount =Number(subtotal) + Number(deliveryFee)

    // Determine currency based on delivery address or use provided currency
    let orderCurrency = vendorCurrency;
    

    // Generate order number (UUID-based - no race conditions!)
    const orderNumber = await this.orderRepository.generateOrderNumber();
    this.logger.log(`Order number: ${orderNumber}`);
    
    // Create order
    const order = await this.orderRepository.create({
      order_number: orderNumber,
      customer_id: customerId,
      vendor_id: vendorId,
      delivery_address_id: createOrderDto.order_type === OrderType.PICKUP ? null : createOrderDto.delivery_address_id,
      order_status: OrderStatus.NEW,
      order_type: createOrderDto.order_type,
      payment_method: createOrderDto.payment_method,
      payment_status: PaymentStatus.PENDING,
      subtotal,
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
      currency: orderCurrency,
      special_instructions: createOrderDto.delivery_instructions,
      vendor_notes: createOrderDto.vendor_notes,
      delivery_quote_id:createOrderDto.delivery_quote_id
    });

    this.logger.log(`Order created: ${order.id}`);

    // Create order items from cart items
    for (const cartItem of cartItems) {
      await this.orderRepository.createOrderItem({
        order_id: order.id,
        menu_item_id: cartItem.menu_item_id,
        quantity: cartItem.quantity,
        unit_price: cartItem.unit_price,
        total_price: cartItem.total_price,
        cart_item_id:cartItem.id
      });

      // Update cart item with order_id
      await this.cartService.updateCartItem(customerId, cartItem.id, {
        order_id: order.id,
      });
    }

    this.logger.log(`Order items created: ${order.id}`);
    try {
      if (createOrderDto.payment_method === PaymentMethod.WALLET) {
        // For wallet payments, process immediately
        await this.paymentService.processPayment({
          order_id: order.id,
          payment_method: createOrderDto.payment_method,
          currency: orderCurrency,
        });

        // Update order payment status to paid
        await this.orderRepository.update(order.id, {
          payment_status: PaymentStatus.PAID,
        });
      } else {
        this.logger.log(`Processing payment for order ${order.id}`);
        const paymentResult =  await this.paymentService.processPayment({
          order_id: order.id,
          payment_method: createOrderDto.payment_method,
          currency: orderCurrency,
        });

        this.logger.log(`Payment result: ${JSON.stringify(paymentResult)}`);

        return {
          payment_url: paymentResult?.payment_url,
          external_payment_reference: paymentResult?.external_reference,
          payment_processing_status: paymentResult?.status as PaymentTransactionStatus,
        }
      }
    } catch (error) {
      this.logger.error(`Payment processing failed for order ${order.id}: ${error.message}`);
      // Don't fail the order creation, just log the error
      // return the order with payment processing status as failed
      throw new BadRequestException(`Payment processing failed for order ${order.id}: ${error.message}`);
    }

    // make all user cart items inactive for the vendor for this order
    await this.cartService.makeCartItemsInactiveForVendor(customerId, vendorId, order.id);

    // Get complete order with relations
    const completeOrder = await this.orderRepository.findById(order.id);
    if (!completeOrder) {
      throw new NotFoundException('Failed to retrieve created order');
    }

    this.logger.log(`Order created successfully: ${order.id} (${orderNumber}) for vendor: ${vendorId}`);
    return this.mapToOrderResponse(completeOrder);
  }

  async calculateOrderCost(customerId: string, calculateOrderCostDto: CalculateOrderCostDto): Promise<OrderCostResponseDto> {
    this.logger.log(`Calculating order cost for customer ${customerId} with cart items: ${calculateOrderCostDto.cart_item_ids.join(', ')}`);

    // Validate cart items for checkout
    const cartValidation = await this.cartService.validateCartItemsForCheckout(customerId, calculateOrderCostDto.cart_item_ids);
    
    if (!cartValidation.is_valid) {
      throw new BadRequestException(`Cart validation failed: ${cartValidation.issues.join(', ')}`);
    }

    const { cartItems, vendorId, subtotal } = cartValidation;

    // Get vendor information
    const vendor = await this.vendorService.getVendorById(vendorId);
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }


    // Initialize delivery fee and provider
    let deliveryFee = 0;
    let selectedDeliveryProvider = null;
    let deliveryAddress = null;

    // Handle delivery orders
    if (calculateOrderCostDto.order_type === OrderType.DELIVERY) {
      if (!calculateOrderCostDto.delivery_address_id) {
        throw new BadRequestException('Delivery address is required for delivery orders');
      }
      
      deliveryAddress = await this.addressService.getAddressById(customerId, calculateOrderCostDto.delivery_address_id);
      if (!deliveryAddress) {
        throw new NotFoundException('Delivery address not found');
      }
      
      // Select delivery provider based on vendor's country
      selectedDeliveryProvider = this.deliveryProviderSelector.selectProvider(vendor.address.country);
      this.logger.log(`Selected delivery provider: ${selectedDeliveryProvider} for vendor country: ${vendor.address.country}`);

      try {
        // Validate and get delivery quotes
        const deliveryQuoteResult = await this.getDeliveryQuoteForOrder(
          vendor,
          deliveryAddress,
          cartItems,
          subtotal,
          selectedDeliveryProvider
        );
        
        deliveryFee = deliveryQuoteResult.lowestFee;
        this.logger.log(`Delivery fee calculated: ${deliveryFee} via ${selectedDeliveryProvider}`);

        // save the delivery quote to db??

        
      } catch (error) {
        throw new BadRequestException('Failed to get delivery quotes');
      }
    }

    const totalAmount = Number(subtotal) + Number(deliveryFee) 

    // Prepare response
    const response: OrderCostResponseDto = {
      subtotal,
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
      order_type: calculateOrderCostDto.order_type,
      delivery_provider: selectedDeliveryProvider,
      vendor: {
        id: vendor.id,
        business_name: vendor.business_name,
      },
    };

    // Add appropriate address based on order type
    if (calculateOrderCostDto.order_type === OrderType.PICKUP) {
      // Include vendor address for pickup orders
      if (vendor.address) {
        response.pickup_address = {
          address_line_1: vendor.address.address_line_1,
          address_line_2: vendor.address.address_line_2,
          city: vendor.address.city,
          state: vendor.address.state,
          postal_code: vendor.address.postal_code,
          country: vendor.address.country,
          latitude: vendor.address.latitude,
          longitude: vendor.address.longitude,
        };
      }
    } else if (calculateOrderCostDto.order_type === OrderType.DELIVERY && deliveryAddress) {
      // Include customer delivery address for delivery orders
      response.delivery_address = {
        address_line_1: deliveryAddress.address_line_1,
        address_line_2: deliveryAddress.address_line_2,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        postal_code: deliveryAddress.postal_code,
        country: deliveryAddress.country,
        latitude: deliveryAddress.latitude,
        longitude: deliveryAddress.longitude,
      };
    }

    this.logger.log(`Order cost calculated successfully for vendor: ${vendorId}, total: ${totalAmount}`);
    return response;
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

  async getCustomerOrders(customerId: string, filterDto?: OrderFilterDto): Promise<{ orders: OrderResponseDto[]}> {
    const result = await this.orderRepository.findByCustomerId(customerId, filterDto);
    
    const orders = result.orders.map(order => this.mapToOrderResponse(order));
    
    return {
      orders,
    };
  }

  async getVendorOrders(vendorId: string, filterDto?: OrderFilterDto): Promise<{ orders: OrderResponseDto[]}> {
    // get vendor with userid
    const vendor = await this.vendorService.getVendorByUserId(vendorId);
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
    // make payment status paid 
    filterDto.payment_status = PaymentStatus.PAID;
    const result = await this.orderRepository.findByVendorId(vendor.id, filterDto);
    
    const orders = result.orders.map(order => this.mapToOrderResponse(order));
    
    return {
      orders,
    };
  }

  async updateOrderStatus(
    orderId: string, 
    userId: string, 
    updateDto: UpdateOrderStatusDto
  ): Promise<OrderResponseDto> {
    this.logger.log(`Updating order ${orderId} status to ${updateDto.order_status}`);
    this.logger.log(`Vendor ID: ${userId}`);
    // get vendor with userid
    const vendor = await this.vendorService.getVendorByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify vendor ownership
    if (order.vendor_id !== vendor.id) {
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

        // Send push notification to customer about order being confirmed
        try {
          const prepTimeMsg = updateDto.estimated_prep_time_minutes 
            ? ` Estimated preparation time: ${updateDto.estimated_prep_time_minutes} minutes.` 
            : '';
          await this.notificationService.sendPushNotification(
            order.customer_id,
            NotificationType.ORDER_UPDATE,
            `Order #${order.order_number} Confirmed!`,
            `Your order has been confirmed by the vendor.${prepTimeMsg}`,
            { 
              order_id: orderId, 
              order_number: order.order_number,
              status: updateDto.order_status,
              estimated_prep_time_minutes: updateDto.estimated_prep_time_minutes,
              order_type: order.order_type
            }
          );
          this.logger.log(`Push notification sent to customer ${order.customer_id} for order ${orderId} status: ${updateDto.order_status}`);
        } catch (error) {
          this.logger.error(`Failed to send push notification for order ${orderId}: ${error.message}`);
        }
        break;

      case OrderStatus.PREPARING:
        if (updateDto.estimated_prep_time_minutes) {
          updateData.estimated_prep_time_minutes = updateDto.estimated_prep_time_minutes;
        }

        // Send push notification to customer about order being prepared
        try {
          const prepTimeMsg = updateDto.estimated_prep_time_minutes 
            ? ` Estimated time: ${updateDto.estimated_prep_time_minutes} minutes.` 
            : '';
          await this.notificationService.sendPushNotification(
            order.customer_id,
            NotificationType.ORDER_UPDATE,
            `Order #${order.order_number} Being Prepared`,
            `Your order is now being prepared!${prepTimeMsg}`,
            { 
              order_id: orderId, 
              order_number: order.order_number,
              status: updateDto.order_status,
              estimated_prep_time_minutes: updateDto.estimated_prep_time_minutes,
              order_type: order.order_type
            }
          );
          this.logger.log(`Push notification sent to customer ${order.customer_id} for order ${orderId} status: ${updateDto.order_status}`);
        } catch (error) {
          this.logger.error(`Failed to send push notification for order ${orderId}: ${error.message}`);
        }
        break;

      case OrderStatus.READY:
        updateData.order_ready_at = new Date();
        if (updateDto.estimated_delivery_time) {
          updateData.estimated_delivery_time = new Date(updateDto.estimated_delivery_time);
        }
        
        // If this is a delivery order, create delivery
        if (order.order_type === OrderType.DELIVERY && order.delivery_quote_id) {
          try {
            this.logger.log(`Creating delivery for order ${orderId} with quote ${order.delivery_quote_id}`);
            const deliveryResult = await this.deliveryService.createDelivery(order.delivery_quote_id, orderId);
            this.logger.log(`Delivery created successfully: ${deliveryResult.id} with tracking number: ${deliveryResult.trackingNumber}`);
            
          } catch (error) {
            this.logger.error(`Failed to create delivery for order ${orderId}: ${error.message}`);
            // Don't fail the order status update, just log the error
            // The order can still be marked as ready even if delivery creation fails
          }
        }

        // Send SSE notification to customer about order being ready
        try {
          this.notificationSSEService.sendOrderUpdate(
            order.customer_id,
            orderId,
            updateDto.order_status,
            `Your order ${order.order_number} is ready for ${order.order_type === OrderType.DELIVERY ? 'delivery' : 'pickup'}!`
          );
          this.logger.log(`SSE notification sent to customer ${order.customer_id} for order ${orderId} status: ${updateDto.order_status}`);
        } catch (error) {
          this.logger.error(`Failed to send SSE notification for order ${orderId}: ${error.message}`);
          // Don't fail the order status update if SSE fails
        }

        // Send push notification to customer
        try {
          await this.notificationService.sendPushNotification(
            order.customer_id,
            NotificationType.ORDER_UPDATE,
            `Order #${order.order_number} is Ready!`,
            `Your order is ready for ${order.order_type === OrderType.DELIVERY ? 'delivery' : 'pickup'}!`,
            { 
              order_id: orderId, 
              order_number: order.order_number,
              status: updateDto.order_status,
              order_type: order.order_type
            }
          );
          this.logger.log(`Push notification sent to customer ${order.customer_id} for order ${orderId} status: ${updateDto.order_status}`);
        } catch (error) {
          this.logger.error(`Failed to send push notification for order ${orderId}: ${error.message}`);
          // Don't fail the order status update if push notification fails
        }
        break;

      case OrderStatus.OUT_FOR_DELIVERY:
        if (updateDto.estimated_delivery_time) {
          updateData.estimated_delivery_time = new Date(updateDto.estimated_delivery_time);
        }
        
        // Send SSE notification to customer about order being out for delivery
        try {
          this.notificationSSEService.sendOrderUpdate(
            order.customer_id,
            orderId,
            updateDto.order_status,
            `Your order ${order.order_number} is out for delivery! Track your order for real-time updates.`
          );
          this.logger.log(`SSE notification sent to customer ${order.customer_id} for order ${orderId} status: ${updateDto.order_status}`);
        } catch (error) {
          this.logger.error(`Failed to send SSE notification for order ${orderId}: ${error.message}`);
        }

        // Send push notification to customer
        try {
          await this.notificationService.sendPushNotification(
            order.customer_id,
            NotificationType.ORDER_UPDATE,
            `Order #${order.order_number} Out for Delivery!`,
            `Your order is out for delivery! Track your order for real-time updates.`,
            { 
              order_id: orderId, 
              order_number: order.order_number,
              status: updateDto.order_status,
              order_type: order.order_type
            }
          );
          this.logger.log(`Push notification sent to customer ${order.customer_id} for order ${orderId} status: ${updateDto.order_status}`);
        } catch (error) {
          this.logger.error(`Failed to send push notification for order ${orderId}: ${error.message}`);
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
        
        // Send SSE notification to customer about order being delivered
        try {
          this.notificationSSEService.sendOrderUpdate(
            order.customer_id,
            orderId,
            updateDto.order_status,
            `Your order ${order.order_number} has been delivered! Thank you for choosing Rambini.`
          );
          this.logger.log(`SSE notification sent to customer ${order.customer_id} for order ${orderId} status: ${updateDto.order_status}`);
        } catch (error) {
          this.logger.error(`Failed to send SSE notification for order ${orderId}: ${error.message}`);
        }

        // Send push notification to customer
        try {
          await this.notificationService.sendPushNotification(
            order.customer_id,
            NotificationType.ORDER_UPDATE,
            `Order #${order.order_number} Delivered!`,
            `Your order has been delivered! Thank you for choosing Rambini.`,
            { 
              order_id: orderId, 
              order_number: order.order_number,
              status: updateDto.order_status,
              order_type: order.order_type
            }
          );
          this.logger.log(`Push notification sent to customer ${order.customer_id} for order ${orderId} status: ${updateDto.order_status}`);
        } catch (error) {
          this.logger.error(`Failed to send push notification for order ${orderId}: ${error.message}`);
        }
        break;

      case OrderStatus.CANCELLED:
        updateData.cancelled_at = new Date();
        updateData.cancellation_reason = updateDto.reason || 'Cancelled by vendor';
        updateData.cancelled_by = 'VENDOR';
        
        // Send SSE notification to customer about order being cancelled
        try {
          this.notificationSSEService.sendOrderUpdate(
            order.customer_id,
            orderId,
            updateDto.order_status,
            `Your order ${order.order_number} has been cancelled. ${updateDto.reason || 'Please contact support for more information.'}`
          );
          this.logger.log(`SSE notification sent to customer ${order.customer_id} for order ${orderId} status: ${updateDto.order_status}`);
        } catch (error) {
          this.logger.error(`Failed to send SSE notification for order ${orderId}: ${error.message}`);
        }

        // Send push notification to customer
        try {
          await this.notificationService.sendPushNotification(
            order.customer_id,
            NotificationType.ORDER_UPDATE,
            `Order #${order.order_number} Cancelled`,
            `Your order has been cancelled. ${updateDto.reason || 'Please contact support for more information.'}`,
            { 
              order_id: orderId, 
              order_number: order.order_number,
              status: updateDto.order_status,
              reason: updateDto.reason || 'Cancelled by vendor',
              order_type: order.order_type
            }
          );
          this.logger.log(`Push notification sent to customer ${order.customer_id} for order ${orderId} status: ${updateDto.order_status}`);
        } catch (error) {
          this.logger.error(`Failed to send push notification for order ${orderId}: ${error.message}`);
        }
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

    // Send SSE notification to relevant party
    try {
      if (userType === 'CUSTOMER') {
        // Notify vendor about customer cancellation
        this.notificationSSEService.sendOrderUpdate(
          order.vendor_id,
          orderId,
          OrderStatus.CANCELLED,
          `Order ${order.order_number} has been cancelled by the customer. Reason: ${reason}`
        );
      } else {
        // Notify customer about vendor cancellation
        this.notificationSSEService.sendOrderUpdate(
          order.customer_id,
          orderId,
          OrderStatus.CANCELLED,
          `Your order ${order.order_number} has been cancelled by the vendor. Reason: ${reason}`
        );
      }
      this.logger.log(`SSE notification sent for cancelled order ${orderId}`);
    } catch (error) {
      this.logger.error(`Failed to send SSE notification for cancelled order ${orderId}: ${error.message}`);
    }

    // Send push notification to customer (always notify customer regardless of who cancelled)
    try {
      const cancelledBy = userType === 'CUSTOMER' ? 'You' : 'The vendor';
      await this.notificationService.sendPushNotification(
        order.customer_id,
        NotificationType.ORDER_UPDATE,
        `Order #${order.order_number} Cancelled`,
        `${cancelledBy} cancelled this order. ${reason}`,
        { 
          order_id: orderId, 
          order_number: order.order_number,
          status: OrderStatus.CANCELLED,
          reason: reason,
          cancelled_by: userType,
          order_type: order.order_type
        }
      );
      this.logger.log(`Push notification sent to customer ${order.customer_id} for cancelled order ${orderId}`);
    } catch (error) {
      this.logger.error(`Failed to send push notification for cancelled order ${orderId}: ${error.message}`);
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

  // private calculateDeliveryFee(orderType: OrderType, subtotal: number): number {
  //   if (orderType === OrderType.PICKUP) {
  //     return 0;
  //   }
    
  //   // Base delivery fee: ₦200 for orders under ₦1000, ₦100 for orders over ₦1000
  //   return subtotal < 1000 ? 200 : 100;
  // }

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
      [OrderStatus.NEW]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED, OrderStatus.PREPARING, OrderStatus.READY],
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED, OrderStatus.READY, OrderStatus.PREPARING, OrderStatus.OUT_FOR_DELIVERY],
      [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED, OrderStatus.OUT_FOR_DELIVERY],
      [OrderStatus.READY]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED, OrderStatus.DELIVERED],
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


  private async validateVendorExistsAndActive(vendorId: string): Promise<void> {
    const vendor = await this.vendorService.getVendorById(vendorId);
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
    if (!vendor.is_active) {
      throw new BadRequestException('Vendor is not active');
    }
   
  }

  private mapToOrderResponse(order: Order): OrderResponseDto {
    return {
      id: order.id,
      order_number: order.order_number,
      customer_id: order.customer_id,
      customer_name: order.customer?.first_name + ' ' + order.customer?.last_name || 'Unknown',
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
      total_amount: order.total_amount,
      currency: order.currency,
      estimated_prep_time_minutes: order.estimated_prep_time_minutes,
      estimated_delivery_time: order.estimated_delivery_time,
      order_ready_at: order.order_ready_at,
      delivered_at: order.delivered_at,
      cancelled_at: order.cancelled_at,
      cancellation_reason: order.cancellation_reason,
      cancelled_by: order.cancelled_by,
      delivery_instructions: order.special_instructions,
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
      pickup_address: order.vendor?.address ? {
        address_line_1: order.vendor.address.address_line_1,
        address_line_2: order.vendor.address.address_line_2,
        city: order.vendor.address.city,
        state: order.vendor.address.state,
        postal_code: order.vendor.address.postal_code,
        country: order.vendor.address.country,
        latitude: order.vendor.address.latitude,
        longitude: order.vendor.address.longitude,
      } : undefined,
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
      created_at: orderItem.created_at,
    };
  }


  private async getDeliveryQuoteForOrder(
    vendor: any,
    deliveryAddress: any,
    cartItems: any[],
    subtotal: number,
    provider: DeliveryProvider
  ): Promise<{lowestFee: number, quotes: any[], requestToken?: string}> {
    this.logger.log(`Getting delivery quotes for provider: ${provider}`);

    // Validate addresses and get address codes for Shipbubble
    if (provider === DeliveryProvider.SHIPBUBBLE) {
      return await this.getShipbubbleQuoteForOrder(vendor, deliveryAddress, cartItems, subtotal);
    } else if (provider === DeliveryProvider.UBER) {
      return await this.getUberQuoteForOrder(vendor, deliveryAddress, cartItems, subtotal);
    }

    throw new Error(`Unsupported delivery provider: ${provider}`);
  }

  /**
   * Get Shipbubble delivery quote
   */
  private async getShipbubbleQuoteForOrder(
    vendor: any,
    deliveryAddress: any,
    cartItems: any[],
    subtotal: number
  ): Promise<{lowestFee: number, quotes: any[], requestToken: string}> {
    const shipbubbleService = this.deliveryService['providerFactory'].getShipbubbleProvider();

    // Validate vendor address and get/save address code
    const vendorAddressValidation = await shipbubbleService.validateAddress({
      name: vendor.business_name || 'Vendor',
      email: vendor.email || 'vendor@example.com',
      phone: vendor.phone || '+2348000000000',
      address: `${vendor.address.address_line_1}, ${vendor.address.city}, ${vendor.address.state}`,
      latitude: vendor.address.latitude,
      longitude: vendor.address.longitude,
    });

    if (!vendorAddressValidation.success || !vendorAddressValidation.data) {
      throw new Error('Vendor address validation failed');
    }

    // Update vendor address with Shipbubble address code if needed
    if (vendorAddressValidation.data.address_code) {
      await this.addressService.updateAddressCode(vendor.address.id, vendorAddressValidation.data.address_code);
    }

    // Validate customer delivery address and get/save address code
    const customerAddressValidation = await shipbubbleService.validateAddress({
      name: 'Customer', // We'll need to get customer name from user service
      email: 'customer@example.com', // We'll need to get customer email
      phone: '+2348000000000', // We'll need to get customer phone
      address: `${deliveryAddress.address_line_1}, ${deliveryAddress.city}, ${deliveryAddress.state}`,
      latitude: deliveryAddress.latitude,
      longitude: deliveryAddress.longitude,
    });

    if (!customerAddressValidation.success || !customerAddressValidation.data) {
      throw new Error('Customer address validation failed');
    }

    // Update customer address with Shipbubble address code if needed
    if (customerAddressValidation.data.address_code) {
      await this.addressService.updateAddressCode(deliveryAddress.id, customerAddressValidation.data.address_code);
    }

    // Get package categories
    const categories = await shipbubbleService.getPackageCategories();
    // choose food category
    const foodCategory = categories.data?.find((category: ShipbubblePackageCategoryDto) => category.category.toLowerCase() === 'ood');
    const categoryId = foodCategory?.category_id || categories.data?.[0]?.category_id || 1;

    // Calculate package dimensions based on cart items
    const packageDimensions = this.calculatePackageDimensions(cartItems);

    // Prepare Shipbubble rates request
    const ratesRequest = {
      sender_address_code: vendorAddressValidation.data.address_code,
      reciever_address_code: customerAddressValidation.data.address_code,
      category_id: categoryId,
      package_items: cartItems.map(item => ({
        name: item.menu_item?.name || 'Food Item',
        description: item.menu_item?.description || 'Food delivery',
        unit_weight: (item.quantity * 0.5).toString(), // Estimate 0.5kg per item
        unit_amount: item.unit_price.toString(),
        quantity: item.quantity.toString(),
      })),
      package_dimension: packageDimensions,
      pickup_date: new Date().toISOString().split('T')[0], // Today's date
    };

    // Fetch rates from Shipbubble
    const ratesResponse = await shipbubbleService.fetchShippingRates(ratesRequest);

    // Find the lowest fee
    const lowestFee = ratesResponse.couriers.reduce((min, courier) => 
      courier.total < min ? courier.total : min, 
      ratesResponse.couriers[0]?.total || 0
    );

    this.logger.log(`Shipbubble lowest delivery fee: ${lowestFee}`);

    // return request token too for later use
    const requestToken = ratesResponse.request_token;
    return {
      lowestFee,
      quotes: ratesResponse.couriers,
      requestToken,
    };
  }

  /**
   * Get Uber delivery quote
   */
  private async getUberQuoteForOrder(
    vendor: any,
    deliveryAddress: any,
    cartItems: any[],
    subtotal: number
  ): Promise<{lowestFee: number, quotes: any[]}> {
    const uberService = this.deliveryService['providerFactory'].getUberProvider();

    // Prepare Uber Direct quote request
    const quoteRequest = {
      pickup_address: JSON.stringify({
        street_address: [vendor.address.address_line_1],
        city: vendor.address.city,
        state: vendor.address.state,
        zip_code: vendor.address.postal_code || '100001',
        country: vendor.address.country,
      }),
      dropoff_address: JSON.stringify({
        street_address: [deliveryAddress.address_line_1],
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        zip_code: deliveryAddress.postal_code || '100001',
        country: deliveryAddress.country,
      }),
      pickup_phone_number: vendor.phone || '+1234567890',
      dropoff_phone_number: '+1234567890', // We'll need to get customer phone
      manifest_total_value: Math.round(subtotal * 100), // Convert to cents
      pickup_ready_dt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
      pickup_deadline_dt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      dropoff_ready_dt: new Date(Date.now() + 45 * 60 * 1000).toISOString(), // 45 minutes from now
      dropoff_deadline_dt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
    };

    // Create quote with Uber Direct
    const quoteResponse = await uberService.createDeliveryQuote(quoteRequest);

    // Convert fee from cents to naira (assuming USD to NGN conversion or direct NGN)
    const deliveryFee = quoteResponse.fee / 100;

    this.logger.log(`Uber Direct delivery fee: ${deliveryFee}`);

    return {
      lowestFee: deliveryFee,
      quotes: [quoteResponse],
    };
  }

  /**
   * Calculate package dimensions based on cart items
   */
  private calculatePackageDimensions(cartItems: any[]): {length: number, width: number, height: number} {
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    
    // Base dimensions for food delivery
    let length = 30; // cm
    let width = 30;  // cm
    let height = 15; // cm

    // Scale dimensions based on quantity
    if (totalQuantity > 5) {
      length = 40;
      width = 40;
      height = 20;
    } else if (totalQuantity > 10) {
      length = 50;
      width = 40;
      height = 25;
    }

    return { length, width, height };
  }

  /**
   * Calculate actual delivery fee using delivery service (legacy method)
   * @param provider Delivery provider
   * @param originAddress Vendor address
   * @param destinationAddress Customer address
   * @returns Promise<number> Delivery fee in kobo
   */
  private async calculateActualDeliveryFee(
    provider: DeliveryProvider,
    originAddress: any,
    destinationAddress: any
  ): Promise<number> {
    if (!originAddress || !destinationAddress) {
      throw new Error('Origin and destination addresses are required');
    }

    const rateRequest = {
      origin: {
        address: originAddress.address_line_1,
        city: originAddress.city,
        state: originAddress.state,
        country: originAddress.country,
        postalCode: originAddress.postal_code,
        latitude: originAddress.latitude,
        longitude: originAddress.longitude,
      },
      destination: {
        address: destinationAddress.address_line_1,
        city: destinationAddress.city,
        state: destinationAddress.state,
        country: destinationAddress.country,
        postalCode: destinationAddress.postal_code,
        latitude: destinationAddress.latitude,
        longitude: destinationAddress.longitude,
      },
      package: {
        weight: 1, // Default weight in kg
        length: 20, // Default dimensions in cm
        width: 20,
        height: 20,
      },
    };

    const rates = await this.deliveryService.getDeliveryRates( rateRequest);
    
    if (!rates || rates.length === 0) {
      throw new Error('No delivery rates available');
    }

    // Return the cheapest rate
    const cheapestRate = rates.reduce((min, rate) => 
      rate.amount < min.amount ? rate : min
    );

    // Convert to kobo (assuming rates are in naira)
    return Math.round(cheapestRate.amount * 100);
  }
} 