// src/modules/notification/services/order-email-notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order, OrderItem, User, OrderStatus, OrderType } from '@/entities';
import { EmailNotificationService } from './email-notification.service';
import { OrderEmailTemplatesService } from './order-email-templates.service';

@Injectable()
export class OrderEmailNotificationService {
  private readonly logger = new Logger(OrderEmailNotificationService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly emailService: EmailNotificationService,
    private readonly templateService: OrderEmailTemplatesService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://rambini.com';
  }

  /**
   * Send new order notification email to vendor
   */
  async sendNewOrderEmailToVendor(order: Order, vendor: User): Promise<boolean> {
    try {
      this.logger.log(`Sending new order email to vendor ${vendor.id} for order ${order.id}`);

      // Format order items with proper numeric prices
      const formattedItems = order.order_items.map((item: OrderItem) => ({
        name: item.menu_item?.name || 'Unknown Item',
        quantity: item.quantity,
        price: Number(item.total_price), // Convert to number explicitly
      }));

      // Calculate total item count
      const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);

      // Format addresses
      const deliveryAddress = order.delivery_address
        ? this.formatAddress(order.delivery_address)
        : undefined;

      const pickupAddress = order.vendor?.address
        ? this.formatAddress(order.vendor.address)
        : undefined;

      // Get vendor name
      const vendorName = order.vendor?.business_name || vendor.full_name || 'Vendor';

      // Generate order URL
      const orderUrl = `${this.frontendUrl}/vendor/orders/${order.id}`;

      // Get email template
      const template = this.templateService.getNewOrderTemplate({
        vendorName,
        orderNumber: order.order_number,
        customerName: order.customer?.full_name || 'Customer',
        customerPhone: order.customer?.phone_number || 'N/A',
        orderType: order.order_type,
        totalAmount: Number(order.total_amount),
        currency: order.currency,
        itemCount,
        items: formattedItems,
        deliveryAddress,
        pickupAddress,
        specialInstructions: order.special_instructions,
        orderUrl,
      });

      // Send email using the correct method signature
      await this.emailService.sendEmail({
        to: vendor.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: process.env.EMAIL_FROM || 'noreply@rambini.com',
        replyTo: process.env.EMAIL_REPLY_TO || 'support@rambini.com',
      });

      this.logger.log(`New order email sent successfully to vendor ${vendor.id} for order ${order.id}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send new order email to vendor ${vendor.id} for order ${order.id}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Send order confirmation email to customer
   */
  async sendOrderConfirmationToCustomer(order: Order, customer: User): Promise<boolean> {
    try {
      this.logger.log(`Sending order confirmation email to customer ${customer.id} for order ${order.id}`);

      // Format order items with proper numeric prices
      const formattedItems = order.order_items.map((item: OrderItem) => ({
        name: item.menu_item?.name || 'Unknown Item',
        quantity: item.quantity,
        price: Number(item.total_price), // Convert to number explicitly
      }));

      // Format addresses
      const deliveryAddress = order.delivery_address
        ? this.formatAddress(order.delivery_address)
        : undefined;

      const pickupAddress = order.vendor?.address
        ? this.formatAddress(order.vendor.address)
        : undefined;

      // Get vendor details
      const vendorName = order.vendor?.business_name || 'Vendor';
      const vendorPhone = order.vendor?.user?.phone_number;

      // Generate order URL
      const orderUrl = `${this.frontendUrl}/orders/${order.id}`;

      // Get email template
      const template = this.templateService.getOrderConfirmationTemplate({
        customerName: customer.full_name || 'Customer',
        orderNumber: order.order_number,
        vendorName,
        vendorPhone,
        orderType: order.order_type,
        totalAmount: Number(order.total_amount),
        currency: order.currency,
        items: formattedItems,
        deliveryAddress,
        pickupAddress,
        estimatedPrepTime: order.estimated_prep_time_minutes,
        orderUrl,
      });

      // Send email using the correct method signature
      await this.emailService.sendEmail({
        to: customer.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: process.env.EMAIL_FROM || 'noreply@rambini.com',
        replyTo: process.env.EMAIL_REPLY_TO || 'support@rambini.com',
      });

      this.logger.log(`Order confirmation email sent successfully to customer ${customer.id} for order ${order.id}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send order confirmation email to customer ${customer.id} for order ${order.id}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Send order status update email to customer
   */
  async sendOrderStatusUpdateToCustomer(
    order: Order,
    customer: User,
    newStatus: OrderStatus,
    options?: {
      estimatedTime?: string;
      trackingUrl?: string;
      vendorNotes?: string;
    },
  ): Promise<boolean> {
    try {
      this.logger.log(
        `Sending order status update email to customer ${customer.id} for order ${order.id} with status ${newStatus}`,
      );

      // Validate customer email
      if (!customer || !customer.email) {
        this.logger.warn(
          `Cannot send email - customer email not found for order ${order.id}. Customer ID: ${customer?.id || 'unknown'}`,
        );
        return false;
      }

      // Get vendor name
      const vendorName = order.vendor?.business_name || 'Vendor';

      // Generate order URL
      const orderUrl = `${this.frontendUrl}/orders/${order.id}`;

      // Get email template
      const template = this.templateService.getOrderStatusUpdateTemplate({
        customerName: customer.full_name || 'Customer',
        orderNumber: order.order_number,
        vendorName,
        orderStatus: newStatus,
        orderType: order.order_type,
        estimatedTime: options?.estimatedTime,
        trackingUrl: options?.trackingUrl,
        orderUrl,
        additionalNotes: options?.vendorNotes,
      });

      // Send email using the correct method signature
      await this.emailService.sendEmail({
        to: customer.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: process.env.EMAIL_FROM || 'noreply@rambini.com',
        replyTo: process.env.EMAIL_REPLY_TO || 'support@rambini.com',
      });

      this.logger.log(
        `Order status update email sent successfully to customer ${customer.id} for order ${order.id}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send order status update email to customer ${customer.id} for order ${order.id}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Format address for display
   */
  private formatAddress(address: any): string {
    const parts = [
      address.address_line_1,
      address.address_line_2,
      address.city,
      address.state,
      address.postal_code,
      address.country,
    ].filter(Boolean);

    return parts.join(', ');
  }
}