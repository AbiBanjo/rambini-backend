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
  private readonly adminEmail: string;

  constructor(
    private readonly emailService: EmailNotificationService,
    private readonly templateService: OrderEmailTemplatesService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://rambini.com';
    
    // ⭐ IMPROVED: Try multiple sources for admin email with fallback ⭐
    this.adminEmail = 
      this.configService.get<string>('ADMIN_EMAIL') || 
      process.env.ADMIN_EMAIL || 
      'mysirigu.bankfields@gmail.com';
    
    this.logger.log(`✅ Admin email configured: ${this.adminEmail}`);
    
    // Validate email format
    if (!this.isValidEmail(this.adminEmail)) {
      this.logger.error(`❌ Invalid admin email format: ${this.adminEmail}`);
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Send new order notification email to vendor
   */
  async sendNewOrderEmailToVendor(order: Order, vendor: User): Promise<boolean> {
    try {
      this.logger.log(`Sending new order email to vendor ${vendor.id} for order ${order.id}`);

      const formattedItems = order.order_items.map((item: OrderItem) => ({
        name: item.menu_item?.name || 'Unknown Item',
        quantity: item.quantity,
        price: Number(item.total_price),
      }));

      const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);

      const deliveryAddress = order.delivery_address
        ? this.formatAddress(order.delivery_address)
        : undefined;

      const pickupAddress = order.vendor?.address
        ? this.formatAddress(order.vendor.address)
        : undefined;

      const vendorName = order.vendor?.business_name || vendor.full_name || 'Vendor';
      const orderUrl = `${this.frontendUrl}/vendor/orders/${order.id}`;

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

      const formattedItems = order.order_items.map((item: OrderItem) => ({
        name: item.menu_item?.name || 'Unknown Item',
        quantity: item.quantity,
        price: Number(item.total_price),
      }));

      const deliveryAddress = order.delivery_address
        ? this.formatAddress(order.delivery_address)
        : undefined;

      const pickupAddress = order.vendor?.address
        ? this.formatAddress(order.vendor.address)
        : undefined;

      const vendorName = order.vendor?.business_name || 'Vendor';
      const vendorPhone = order.vendor?.user?.phone_number;
      const orderUrl = `${this.frontendUrl}/orders/${order.id}`;

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

      if (!customer || !customer.email) {
        this.logger.warn(
          `Cannot send email - customer email not found for order ${order.id}. Customer ID: ${customer?.id || 'unknown'}`,
        );
        return false;
      }

      const vendorName = order.vendor?.business_name || 'Vendor';
      const orderUrl = `${this.frontendUrl}/orders/${order.id}`;

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
   * Send order summary to admin for tracking
   */
  async sendOrderSummaryToAdmin(order: Order): Promise<boolean> {
    try {
      this.logger.log(`📧 Attempting to send order summary to admin for order ${order.id}`);
      
      // ⭐ SIMPLIFIED VALIDATION - Admin email always has fallback now ⭐
      if (!this.isValidEmail(this.adminEmail)) {
        this.logger.error(
          `❌ Invalid admin email: ${this.adminEmail}. Cannot send notification for order ${order.id}`
        );
        return false;
      }

      this.logger.log(`✅ Sending to admin email: ${this.adminEmail}`);

      const formattedItems = order.order_items.map((item: OrderItem) => ({
        name: item.menu_item?.name || 'Unknown Item',
        quantity: item.quantity,
        price: Number(item.total_price),
      }));

      const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);

      const deliveryAddress = order.delivery_address
        ? this.formatAddress(order.delivery_address)
        : undefined;

      const pickupAddress = order.vendor?.address
        ? this.formatAddress(order.vendor.address)
        : undefined;

      const customerName = order.customer?.full_name || 'Unknown Customer';
      const customerEmail = order.customer?.email || 'N/A';
      const customerPhone = order.customer?.phone_number || 'N/A';
      const vendorName = order.vendor?.business_name || 'Unknown Vendor';
      const vendorEmail = order.vendor?.user?.email || 'N/A';
      const vendorPhone = order.vendor?.user?.phone_number || 'N/A';

      const orderUrl = `${this.frontendUrl}/admin/orders/${order.id}`;

      this.logger.log(`📝 Generating admin email template for order ${order.order_number}`);

      const template = this.templateService.getAdminOrderSummaryTemplate({
        orderNumber: order.order_number,
        orderStatus: order.order_status,
        orderType: order.order_type,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        customerName,
        customerEmail,
        customerPhone,
        vendorName,
        vendorEmail,
        vendorPhone,
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.delivery_fee),
        totalAmount: Number(order.total_amount),
        currency: order.currency,
        itemCount,
        items: formattedItems,
        deliveryAddress,
        pickupAddress,
        specialInstructions: order.special_instructions,
        vendorNotes: order.vendor_notes,
        orderUrl,
        createdAt: order.created_at,
      });

      this.logger.log(`📨 Sending admin email to: ${this.adminEmail}`);
      this.logger.log(`📧 Email subject: ${template.subject}`);

      await this.emailService.sendEmail({
        to: this.adminEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: process.env.EMAIL_FROM || 'noreply@rambini.com',
        replyTo: process.env.EMAIL_REPLY_TO || 'support@rambini.com',
      });

      this.logger.log(`✅ Order summary email sent successfully to admin (${this.adminEmail}) for order ${order.id}`);
      return true;
    } catch (error) {
      this.logger.error(
        `❌ Failed to send order summary email to admin for order ${order.id}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Send order status change notification to admin
   */
  async sendOrderStatusChangeToAdmin(
    order: Order,
    oldStatus: OrderStatus,
    newStatus: OrderStatus,
    changedBy: string,
  ): Promise<boolean> {
    try {
      this.logger.log(
        `📧 Attempting to send order status change notification to admin for order ${order.id}`,
      );

      // ⭐ SIMPLIFIED VALIDATION ⭐
      if (!this.isValidEmail(this.adminEmail)) {
        this.logger.error(
          `❌ Invalid admin email: ${this.adminEmail}. Cannot send status change notification for order ${order.id}`
        );
        return false;
      }

      const customerName = order.customer?.full_name || 'Unknown Customer';
      const vendorName = order.vendor?.business_name || 'Unknown Vendor';
      const orderUrl = `${this.frontendUrl}/admin/orders/${order.id}`;

      this.logger.log(`📝 Generating status change email: ${oldStatus} → ${newStatus}`);

      const template = this.templateService.getAdminOrderStatusChangeTemplate({
        orderNumber: order.order_number,
        oldStatus,
        newStatus,
        changedBy,
        customerName,
        vendorName,
        totalAmount: Number(order.total_amount),
        currency: order.currency,
        orderType: order.order_type,
        orderUrl,
        timestamp: new Date(),
      });

      this.logger.log(`📨 Sending status change email to admin: ${this.adminEmail}`);

      await this.emailService.sendEmail({
        to: this.adminEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: process.env.EMAIL_FROM || 'noreply@rambini.com',
        replyTo: process.env.EMAIL_REPLY_TO || 'support@rambini.com',
      });

      this.logger.log(
        `✅ Order status change email sent successfully to admin (${this.adminEmail}) for order ${order.id}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `❌ Failed to send order status change email to admin for order ${order.id}: ${error.message}`,
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