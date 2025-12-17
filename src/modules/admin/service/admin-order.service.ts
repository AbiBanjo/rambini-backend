// src/modules/admin/services/admin-order.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Order,
  OrderStatus,
  PaymentStatus,
  User,
  Wallet,
  NotificationType,
  Payment,
} from '@/entities';
import { OrderRepository } from '../../order/repositories/order.repository';
import { OrderEmailNotificationService } from '../../notification/services/order-email-notification.service';
import { NotificationService } from '../../notification/notification.service';
import { OrderResponseDto, UpdateOrderStatusDto } from '../../order/dto';
import {
  AdminCancelOrderDto,
  AdminCancelOrderResponseDto,
} from '../dto/admin-order.dto';

@Injectable()
export class AdminOrderService {
  private readonly logger = new Logger(AdminOrderService.name);
  
  // Platform service fee percentage (15%)
  private readonly SERVICE_FEE_PERCENTAGE = 0.15;

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly orderRepository: OrderRepository,
    private readonly orderEmailNotification: OrderEmailNotificationService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Calculate service fee from subtotal
   */
  private calculateServiceFee(subtotal: number): number {
    return Number((subtotal * this.SERVICE_FEE_PERCENTAGE).toFixed(2));
  }

  /**
   * Calculate refund breakdown for order cancellation
   * 
   * Order Total Breakdown:
   * - Subtotal: Vendor's food price
   * - Service Fee: Platform's commission (15% of subtotal)
   * - Delivery Fee: Third-party delivery cost (may be 0 for pickup orders)
   * - Total: subtotal + service_fee + delivery_fee
   * 
   * Vendor actually received:
   * - Subtotal - Service Fee (Platform keeps service fee)
   * - Example: ₦10,000 subtotal - ₦1,500 service fee = ₦8,500 to vendor
   * 
   * On cancellation:
   * - Customer gets full refund: Total amount paid
   * - Vendor pays back: Only what they received (subtotal - service fee)
   * - Platform absorbs: Service fee + Delivery fee (if any)
   */
  private calculateRefundBreakdown(order: Order) {
    const subtotal = Number(order.subtotal) || 0;
    // Handle null/undefined delivery_fee - default to 0 for pickup orders
    const deliveryFee = Number(order.delivery_fee) || 0;
    const totalAmount = Number(order.total_amount) || 0;
    
    // Calculate service fee (15% of subtotal) - this is the platform commission
    const serviceFee = this.calculateServiceFee(subtotal);

    // What vendor actually received (subtotal minus platform commission)
    const vendorReceivedAmount = subtotal - serviceFee;

    // Customer gets full refund
    const customerRefundAmount = totalAmount;

    // Vendor only returns what they received
    const vendorDebitAmount = vendorReceivedAmount;

    // Platform absorbs service fee and delivery fee (if any)
    const platformAbsorbedAmount = serviceFee + deliveryFee;

    return {
      subtotal,
      serviceFee,
      deliveryFee,
      totalAmount,
      vendorReceivedAmount,
      customerRefundAmount,
      vendorDebitAmount,
      platformAbsorbedAmount,
    };
  }

  /**
   * Ensure customer wallet exists and return it
   * Customer refunds go to: wallet.balance (NOT vendor_balance)
   */
  private async ensureCustomerWallet(customerId: string): Promise<Wallet> {
    let wallet = await this.walletRepo.findOne({
      where: { user_id: customerId },
    });

    if (!wallet) {
      this.logger.warn(
        `[ADMIN CANCEL] Customer wallet not found for user ${customerId}. Creating new wallet.`,
      );
      
      wallet = this.walletRepo.create({
        user_id: customerId,
        balance: 0, // Customer balance - used for refunds
        vendor_balance: 0,
        last_transaction_at: new Date(),
      });
      
      await this.walletRepo.save(wallet);
      this.logger.log(
        `[ADMIN CANCEL] ✓ Created new wallet for customer ${customerId}`,
      );
    }

    return wallet;
  }

  /**
   * Ensure vendor wallet exists and return it
   * Vendor debits come from: wallet.vendor_balance (NOT regular balance)
   */
  private async ensureVendorWallet(vendorUserId: string): Promise<Wallet> {
    let wallet = await this.walletRepo.findOne({
      where: { user_id: vendorUserId },
    });

    if (!wallet) {
      this.logger.warn(
        `[ADMIN CANCEL] Vendor wallet not found for user ${vendorUserId}. Creating new wallet.`,
      );
      
      wallet = this.walletRepo.create({
        user_id: vendorUserId,
        balance: 0,
        vendor_balance: 0, // Vendor earnings - used for debits on refunds
        last_transaction_at: new Date(),
      });
      
      await this.walletRepo.save(wallet);
      this.logger.log(
        `[ADMIN CANCEL] ✓ Created new wallet for vendor ${vendorUserId}`,
      );
    }

    return wallet;
  }

  /**
   * Cancel order as admin with proper wallet refund and payment record update
   * Can only cancel orders with status: NEW, CONFIRMED, or PREPARING
   */
  async cancelOrderAsAdmin(
    orderId: string,
    admin: User,
    cancelDto: AdminCancelOrderDto,
  ): Promise<AdminCancelOrderResponseDto> {
    this.logger.log(
      `[ADMIN CANCEL] ================================================`,
    );
    this.logger.log(
      `[ADMIN CANCEL] User ${admin.email} (${admin.id}) cancelling order ${orderId}`,
    );

    // Get order with basic relations (NOT wallets - we'll fetch those separately)
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['customer', 'vendor', 'vendor.user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!order.customer) {
      throw new BadRequestException('Order customer not found');
    }

    if (!order.vendor?.user) {
      throw new BadRequestException('Order vendor not found');
    }

    this.logger.log(
      `[ADMIN CANCEL] Order Status: ${order.order_status}, Payment Status: ${order.payment_status}`,
    );
    this.logger.log(
      `[ADMIN CANCEL] Customer ID: ${order.customer_id}, Vendor User ID: ${order.vendor.user_id}`,
    );

    // Check if order can be cancelled
    const cancellableStatuses = [
      OrderStatus.NEW,
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
    ];

    if (!cancellableStatuses.includes(order.order_status)) {
      throw new BadRequestException(
        `Cannot cancel order with status ${order.order_status}. Only NEW, CONFIRMED, or PREPARING orders can be cancelled.`,
      );
    }

    if (order.order_status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    // Prepare refund details
    let refundProcessed = false;
    let customerPreviousBalance = 0;
    let customerNewBalance = 0;
    let vendorPreviousBalance = 0;
    let vendorNewBalance = 0;
    let refundBreakdown: any = null;

    // Process refund if payment was successful
    if (order.payment_status === PaymentStatus.PAID) {
      this.logger.log(
        `[ADMIN CANCEL] Processing refund for paid order.`,
      );

      // Fetch wallets separately (more reliable than relations)
      const customerWallet = await this.ensureCustomerWallet(order.customer_id);
      const vendorWallet = await this.ensureVendorWallet(order.vendor.user_id);

      this.logger.log(
        `[ADMIN CANCEL] Customer Wallet - Balance: ${customerWallet.balance}, Vendor Balance: ${customerWallet.vendor_balance}`,
      );
      this.logger.log(
        `[ADMIN CANCEL] Vendor Wallet - Balance: ${vendorWallet.balance}, Vendor Balance: ${vendorWallet.vendor_balance}`,
      );

      // Calculate refund breakdown
      refundBreakdown = this.calculateRefundBreakdown(order);

      this.logger.log(
        `[ADMIN CANCEL] Refund Breakdown:`,
      );
      this.logger.log(
        `[ADMIN CANCEL]   - Subtotal: ${refundBreakdown.subtotal}`,
      );
      this.logger.log(
        `[ADMIN CANCEL]   - Service Fee (Platform): ${refundBreakdown.serviceFee}`,
      );
      this.logger.log(
        `[ADMIN CANCEL]   - Delivery Fee: ${refundBreakdown.deliveryFee}${refundBreakdown.deliveryFee === 0 ? ' (Pickup order - no delivery fee)' : ''}`,
      );
      this.logger.log(
        `[ADMIN CANCEL]   - Total Amount: ${refundBreakdown.totalAmount}`,
      );
      this.logger.log(
        `[ADMIN CANCEL]   - Vendor Received: ${refundBreakdown.vendorReceivedAmount}`,
      );
      this.logger.log(
        `[ADMIN CANCEL]   - Customer Refund: ${refundBreakdown.customerRefundAmount}`,
      );
      this.logger.log(
        `[ADMIN CANCEL]   - Vendor Debit: ${refundBreakdown.vendorDebitAmount}`,
      );
      this.logger.log(
        `[ADMIN CANCEL]   - Platform Absorbs: ${refundBreakdown.platformAbsorbedAmount}`,
      );

      // Store previous balances
      customerPreviousBalance = Number(customerWallet.balance);
      vendorPreviousBalance = Number(vendorWallet.vendor_balance);

      // ✅ CRITICAL: Credit customer REGULAR balance (not vendor_balance)
      // Customer refunds always go to wallet.balance
      customerWallet.balance = Number(customerWallet.balance) + refundBreakdown.customerRefundAmount;
      customerWallet.last_transaction_at = new Date();
      await this.walletRepo.save(customerWallet);
      customerNewBalance = Number(customerWallet.balance);

      this.logger.log(
        `[ADMIN CANCEL] ✓ Credited CUSTOMER wallet.balance: ${customerPreviousBalance} → ${customerNewBalance} (+${refundBreakdown.customerRefundAmount})`,
      );

      // Debit vendor wallet - only what they actually received
      if (vendorPreviousBalance < refundBreakdown.vendorDebitAmount) {
        this.logger.warn(
          `[ADMIN CANCEL] ⚠️ Vendor has insufficient vendor_balance. Current: ${vendorPreviousBalance}, Needed: ${refundBreakdown.vendorDebitAmount}`,
        );
        this.logger.warn(
          `[ADMIN CANCEL] ⚠️ Proceeding with debit (will create negative balance)`,
        );
      }

      // ✅ CRITICAL: Debit vendor VENDOR_BALANCE (not regular balance)
      // Vendor earnings are stored in wallet.vendor_balance
      vendorWallet.vendor_balance = Number(vendorWallet.vendor_balance) - refundBreakdown.vendorDebitAmount;
      vendorWallet.last_transaction_at = new Date();
      await this.walletRepo.save(vendorWallet);
      vendorNewBalance = Number(vendorWallet.vendor_balance);

      this.logger.log(
        `[ADMIN CANCEL] ✓ Debited VENDOR wallet.vendor_balance: ${vendorPreviousBalance} → ${vendorNewBalance} (-${refundBreakdown.vendorDebitAmount})`,
      );

      // Update payment record to REFUNDED
      try {
        const payment = await this.paymentRepo.findOne({
          where: { order_id: orderId },
        });

        if (payment) {
          // Ensure refund amount is a proper number, not a string
          const refundAmount = Number(refundBreakdown.customerRefundAmount);
          
          this.logger.log(
            `[ADMIN CANCEL] Updating payment record with refund amount: ${refundAmount} (type: ${typeof refundAmount})`,
          );
          
          payment.processRefund(
            refundAmount,
            `Order cancelled by admin: ${cancelDto.reason || 'Administrative action'}`,
          );
          await this.paymentRepo.save(payment);
          this.logger.log(
            `[ADMIN CANCEL] ✓ Payment record updated to REFUNDED`,
          );
        } else {
          this.logger.warn(
            `[ADMIN CANCEL] ⚠️ No payment record found for order ${orderId}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `[ADMIN CANCEL] ⚠️ Failed to update payment record: ${error.message}`,
        );
        // Don't throw - continue with cancellation even if payment update fails
      }

      refundProcessed = true;
    } else {
      this.logger.log(
        `[ADMIN CANCEL] Payment status is ${order.payment_status}. No refund needed.`,
      );
    }

    // Update order status
    order.order_status = OrderStatus.CANCELLED;
    order.payment_status = refundProcessed ? PaymentStatus.REFUNDED : order.payment_status;
    order.cancelled_at = new Date();
    order.cancellation_reason = cancelDto.reason || 'Cancelled by admin';
    order.cancelled_by = 'ADMIN';

    await this.orderRepo.save(order);

    this.logger.log(`[ADMIN CANCEL] ✓ Order status updated to CANCELLED`);

    // Send notifications
    try {
      const deliveryFeeText = refundBreakdown?.deliveryFee 
        ? ` (including ${refundBreakdown.deliveryFee.toFixed(2)} ${order.currency} delivery fee)`
        : '';

      // Email to customer
      await this.orderEmailNotification.sendOrderStatusUpdateToCustomer(
        order,
        order.customer,
        OrderStatus.CANCELLED,
        {
          vendorNotes: `Order cancelled by admin. Reason: ${cancelDto.reason || 'Administrative action'}. ${refundProcessed ? `Full refund of ${refundBreakdown.customerRefundAmount.toFixed(2)} ${order.currency}${deliveryFeeText} has been processed to your wallet.` : ''}`,
        },
      );

      // Push notification to customer
      await this.notificationService.sendPushNotification(
        order.customer_id,
        NotificationType.ORDER_UPDATE,
        `Order #${order.order_number} Cancelled`,
        `Your order has been cancelled by admin. ${refundProcessed ? `Full refund of ${refundBreakdown.customerRefundAmount.toFixed(2)} ${order.currency} has been credited to your wallet.` : ''}`,
        {
          order_id: orderId,
          order_number: order.order_number,
          status: OrderStatus.CANCELLED,
          reason: cancelDto.reason,
          refund_amount: refundBreakdown?.customerRefundAmount,
          refund_processed: refundProcessed,
        },
      );

      this.logger.log(`[ADMIN CANCEL] ✓ Customer notifications sent`);

      // Email to vendor
      if (order.vendor?.user) {
        await this.orderEmailNotification.sendOrderStatusChangeToAdmin(
          order,
          order.order_status,
          OrderStatus.CANCELLED,
          `Admin: ${admin.email}`,
        );

        // Push notification to vendor
        await this.notificationService.sendPushNotification(
          order.vendor.user_id,
          NotificationType.ORDER_UPDATE,
          `Order #${order.order_number} Cancelled by Admin`,
          `Order has been cancelled by admin. ${refundProcessed ? `${refundBreakdown.vendorDebitAmount.toFixed(2)} ${order.currency} (amount you received) has been debited from your wallet.` : ''}`,
          {
            order_id: orderId,
            order_number: order.order_number,
            status: OrderStatus.CANCELLED,
            cancelled_by: 'ADMIN',
            admin_email: admin.email,
            debit_amount: refundBreakdown?.vendorDebitAmount,
          },
        );

        this.logger.log(`[ADMIN CANCEL] ✓ Vendor notifications sent`);
      }

      // Email to admin for record
      await this.orderEmailNotification.sendOrderStatusChangeToAdmin(
        order,
        order.order_status,
        OrderStatus.CANCELLED,
        `Admin: ${admin.email} - Reason: ${cancelDto.reason}`,
      );

      this.logger.log(`[ADMIN CANCEL] ✓ Admin notification sent`);
    } catch (error) {
      this.logger.error(
        `[ADMIN CANCEL] ⚠️ Failed to send notifications: ${error.message}`,
      );
    }

    const response: AdminCancelOrderResponseDto = {
      success: true,
      message: refundProcessed
        ? `Order cancelled successfully. Customer refunded ${refundBreakdown.customerRefundAmount.toFixed(2)} ${order.currency}. Vendor debited ${refundBreakdown.vendorDebitAmount.toFixed(2)} ${order.currency}. Platform absorbed ${refundBreakdown.platformAbsorbedAmount.toFixed(2)} ${order.currency} (service fee${refundBreakdown.deliveryFee > 0 ? ' + delivery fee' : ''}).`
        : 'Order cancelled successfully. No refund needed (payment was not completed).',
      order: this.mapToOrderResponse(order),
      refund_details: refundProcessed
        ? {
            refund_processed: true,
            customer_refund_amount: refundBreakdown.customerRefundAmount,
            vendor_debit_amount: refundBreakdown.vendorDebitAmount,
            platform_absorbed_amount: refundBreakdown.platformAbsorbedAmount,
            currency: order.currency,
            breakdown: {
              subtotal: refundBreakdown.subtotal,
              service_fee: refundBreakdown.serviceFee,
              delivery_fee: refundBreakdown.deliveryFee,
              total_amount: refundBreakdown.totalAmount,
              vendor_received_amount: refundBreakdown.vendorReceivedAmount,
            },
            customer_previous_balance: customerPreviousBalance,
            customer_new_balance: customerNewBalance,
            vendor_previous_balance: vendorPreviousBalance,
            vendor_new_balance: vendorNewBalance,
          }
        : {
            refund_processed: false,
            reason: `Payment status was ${order.payment_status}`,
          },
      admin_info: {
        admin_id: admin.id,
        admin_email: admin.email,
        cancelled_at: order.cancelled_at,
        cancellation_reason: order.cancellation_reason,
      },
    };

    this.logger.log(
      `[ADMIN CANCEL] ================================================`,
    );
    this.logger.log(
      `[ADMIN CANCEL] ✓ Order ${orderId} cancelled successfully`,
    );
    if (refundProcessed) {
      this.logger.log(
        `[ADMIN CANCEL] Customer wallet.balance Refunded: ${refundBreakdown.customerRefundAmount}`,
      );
      this.logger.log(
        `[ADMIN CANCEL] Vendor wallet.vendor_balance Debited: ${refundBreakdown.vendorDebitAmount}`,
      );
      this.logger.log(
        `[ADMIN CANCEL] Platform Absorbed: ${refundBreakdown.platformAbsorbedAmount}`,
      );
    }
    this.logger.log(
      `[ADMIN CANCEL] ================================================`,
    );

    return response;
  }

  /**
   * Get order by ID for admin (with all relations)
   */
  async getOrderByIdForAdmin(orderId: string): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.mapToOrderResponse(order);
  }

  /**
   * Get orders with failed payments
   */
  async getFailedPaymentOrders(): Promise<OrderResponseDto[]> {
    const orders = await this.orderRepo.find({
      where: {
        order_status: OrderStatus.NEW,
        payment_status: PaymentStatus.FAILED,
      },
      relations: ['customer', 'vendor', 'order_items', 'delivery_quote'],
      order: { created_at: 'DESC' },
    });

    return orders.map(order => this.mapToOrderResponse(order));
  }

  /**
   * Update order status as admin
   */
  async updateOrderStatusAsAdmin(
    orderId: string,
    adminId: string,
    updateDto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    this.logger.log(
      `[ADMIN ORDER] User ${adminId} updating order ${orderId} to ${updateDto.order_status}`,
    );

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updateData: Partial<Order> = {
      order_status: updateDto.order_status,
    };

    if (updateDto.vendor_notes) {
      updateData.vendor_notes = updateDto.vendor_notes;
    }

    const updatedOrder = await this.orderRepository.update(orderId, updateData);

    this.logger.log(
      `[ADMIN ORDER] Order ${orderId} status updated to ${updateDto.order_status}`,
    );

    return this.mapToOrderResponse(updatedOrder);
  }

  /**
   * Mark order with failed payment as cancelled
   */
  async markFailedOrderCancelled(
    orderId: string,
    admin: User,
    reason?: string,
  ): Promise<{ message: string; order: OrderResponseDto }> {
    this.logger.log(
      `[ADMIN MARK FAILED] User ${admin.email} marking order ${orderId} as cancelled`,
    );

    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['customer', 'vendor'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.order_status !== OrderStatus.NEW) {
      throw new BadRequestException(
        'Only orders with NEW status can be marked as failed',
      );
    }

    if (order.payment_status !== PaymentStatus.FAILED) {
      throw new BadRequestException(
        'Only orders with FAILED payment can be marked as cancelled',
      );
    }

    order.order_status = OrderStatus.CANCELLED;
    order.cancelled_at = new Date();
    order.cancellation_reason =
      reason || 'Payment failed - marked as cancelled by admin';
    order.cancelled_by = 'ADMIN';

    await this.orderRepo.save(order);

    this.logger.log(
      `[ADMIN MARK FAILED] ✓ Order ${orderId} marked as cancelled`,
    );

    try {
      await this.notificationService.sendPushNotification(
        order.customer_id,
        NotificationType.ORDER_UPDATE,
        `Order #${order.order_number} Cancelled`,
        'Your order has been cancelled due to payment failure.',
        {
          order_id: orderId,
          order_number: order.order_number,
          status: OrderStatus.CANCELLED,
          reason: 'Payment failed',
        },
      );
    } catch (error) {
      this.logger.error(
        `[ADMIN MARK FAILED] Failed to send notification: ${error.message}`,
      );
    }

    return {
      message: 'Order marked as cancelled successfully',
      order: this.mapToOrderResponse(order),
    };
  }

  /**
   * Map order to response DTO
   */
  private mapToOrderResponse(order: Order): OrderResponseDto {
    const serviceFee = this.calculateServiceFee(Number(order.subtotal));
    
    return {
      id: order.id,
      order_number: order.order_number,
      customer_id: order.customer_id,
      customer_name: order.customer
        ? `${order.customer.first_name} ${order.customer.last_name}`
        : 'Unknown',
      customer_phone: order.customer?.phone_number || '',
      vendor: order.vendor,
      vendor_id: order.vendor_id,
      vendor_name: order.vendor?.business_name || 'Unknown',
      vendor_phone: order.vendor?.user?.phone_number || '',
      delivery_address_id: order.delivery_address_id,
      order_status: order.order_status,
      order_type: order.order_type,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      service_fee: serviceFee,
      payment_reference: order.payment_reference,
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      total_amount: order.total_amount,
      tracking_url: order.delivery_quote?.labelUrl,
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
      order_items:
        order.order_items?.map(item => ({
          id: item.id,
          menu_item_id: item.menu_item_id,
          menu_item_name: item.menu_item?.name || 'Unknown',
          menu_item_image: item.menu_item?.image_url,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          created_at: item.created_at,
        })) || [],
      delivery_address: order.delivery_quote?.destination_address
        ? {
            address_line_1: order.delivery_quote.destination_address.address,
            address_line_2: '',
            city: order.delivery_quote.destination_address.city,
            state: order.delivery_quote.destination_address.state,
            postal_code: order.delivery_quote.destination_address.postalCode,
            country: order.delivery_quote.destination_address.country,
            latitude: order.delivery_quote.destination_address.latitude,
            longitude: order.delivery_quote.destination_address.longitude,
          }
        : {
            address_line_1: '',
            city: '',
            state: '',
            country: '',
          },
      pickup_address: order.vendor?.address
        ? {
            address_line_1: order.vendor.address.address_line_1,
            address_line_2: order.vendor.address.address_line_2,
            city: order.vendor.address.city,
            state: order.vendor.address.state,
            postal_code: order.vendor.address.postal_code,
            country: order.vendor.address.country,
            latitude: order.vendor.address.latitude,
            longitude: order.vendor.address.longitude,
          }
        : undefined,
    };
  }
}