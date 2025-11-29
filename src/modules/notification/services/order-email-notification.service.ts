// src/modules/notification/services/order-email-notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { EmailNotificationService } from './email-notification.service';
import { OrderEmailTemplatesService } from './order-email-templates.service';
import { Order, OrderStatus, OrderType, User } from '@/entities';

@Injectable()
export class OrderEmailNotificationService {
  private readonly logger = new Logger(OrderEmailNotificationService.name);

  constructor(
    private readonly emailNotificationService: EmailNotificationService,
    private readonly orderEmailTemplates: OrderEmailTemplatesService,
  ) {}

  /**
   * Send new order email to vendor
   */
  async sendNewOrderEmailToVendor(order: Order, vendor: User): Promise<boolean> {
    try {
      if (!vendor.email) {
        this.logger.warn(`Vendor ${vendor.id} has no email address. Skipping new order email.`);
        return false;
      }

      const template = this.orderEmailTemplates.getNewOrderTemplate({
        vendorName: vendor.first_name || vendor.full_name || 'Vendor',
        orderNumber: order.order_number,
        customerName: order.customer?.first_name || order.customer?.full_name || 'Customer',
        customerPhone: order.customer?.phone_number || 'Not provided',
        orderType: order.order_type,
        totalAmount: order.total_amount,
        currency: order.currency,
        itemCount: order.order_items?.length || 0,
        items: order.order_items?.map(item => ({
          name: item.menu_item?.name || 'Item',
          quantity: item.quantity,
          price: item.total_price,
        })) || [],
        deliveryAddress: order.delivery_quote?.destination_address ? 
          `${order.delivery_quote.destination_address.address}, ${order.delivery_quote.destination_address.city}, ${order.delivery_quote.destination_address.state}` : 
          undefined,
        pickupAddress: order.vendor?.address ? 
          `${order.vendor.address.address_line_1}, ${order.vendor.address.city}, ${order.vendor.address.state}` : 
          undefined,
        specialInstructions: order.special_instructions,
        orderUrl: `${process.env.APP_URL || 'https://rambini.com'}/vendor/orders/${order.id}`,
      });

      await this.emailNotificationService.sendEmail({
        to: vendor.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: process.env.EMAIL_FROM || 'orders@rambini.com',
        replyTo: order.customer?.email || process.env.EMAIL_REPLY_TO || 'support@rambini.com',
      });

      this.logger.log(`New order email sent to vendor ${vendor.id} for order ${order.id}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send new order email to vendor ${vendor?.id} for order ${order.id}: ${error.message}`,
        error.stack
      );
      return false;
    }
  }

  /**
   * Send order confirmation email to customer
   */
  async sendOrderConfirmationToCustomer(order: Order, customer: User): Promise<boolean> {
    try {
      if (!customer.email) {
        this.logger.warn(`Customer ${customer.id} has no email address. Skipping order confirmation email.`);
        return false;
      }

      const template = this.orderEmailTemplates.getOrderConfirmationTemplate({
        customerName: customer.first_name || customer.full_name || 'Customer',
        orderNumber: order.order_number,
        vendorName: order.vendor?.business_name || 'Vendor',
        vendorPhone: order.vendor?.user?.phone_number,
        orderType: order.order_type,
        totalAmount: order.total_amount,
        currency: order.currency,
        items: order.order_items?.map(item => ({
          name: item.menu_item?.name || 'Item',
          quantity: item.quantity,
          price: item.total_price,
        })) || [],
        deliveryAddress: order.delivery_quote?.destination_address ? 
          `${order.delivery_quote.destination_address.address}, ${order.delivery_quote.destination_address.city}, ${order.delivery_quote.destination_address.state}` : 
          undefined,
        pickupAddress: order.vendor?.address ? 
          `${order.vendor.address.address_line_1}, ${order.vendor.address.city}, ${order.vendor.address.state}` : 
          undefined,
        estimatedPrepTime: order.estimated_prep_time_minutes,
        orderUrl: `${process.env.APP_URL || 'https://rambini.com'}/orders/${order.id}`,
      });

      await this.emailNotificationService.sendEmail({
        to: customer.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: process.env.EMAIL_FROM || 'orders@rambini.com',
        replyTo: order.vendor?.user?.email || process.env.EMAIL_REPLY_TO || 'support@rambini.com',
      });

      this.logger.log(`Order confirmation email sent to customer ${customer.id} for order ${order.id}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send order confirmation email to customer ${customer?.id} for order ${order.id}: ${error.message}`,
        error.stack
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
    additionalData?: {
      estimatedTime?: number | string;
      vendorNotes?: string;
    }
  ): Promise<boolean> {
    try {
      if (!customer.email) {
        this.logger.warn(`Customer ${customer.id} has no email address. Skipping status update email.`);
        return false;
      }

      const template = this.orderEmailTemplates.getOrderStatusUpdateTemplate({
        customerName: customer.first_name || customer.full_name || 'Customer',
        orderNumber: order.order_number,
        vendorName: order.vendor?.business_name || 'Vendor',
        orderStatus: newStatus,
        orderType: order.order_type,
        estimatedTime: additionalData?.estimatedTime,
        trackingUrl: order.delivery_quote?.labelUrl,
        orderUrl: `${process.env.APP_URL || 'https://rambini.com'}/orders/${order.id}`,
        additionalNotes: additionalData?.vendorNotes,
      });

      await this.emailNotificationService.sendEmail({
        to: customer.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: process.env.EMAIL_FROM || 'orders@rambini.com',
        replyTo: order.vendor?.user?.email || process.env.EMAIL_REPLY_TO || 'support@rambini.com',
      });

      this.logger.log(`Status update email sent to customer ${customer.id} for order ${order.id} - Status: ${newStatus}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send status update email to customer ${customer?.id} for order ${order.id}: ${error.message}`,
        error.stack
      );
      return false;
    }
  }

  /**
   * Helper method to format estimated time
   */
  private formatEstimatedTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes`;
  }
}