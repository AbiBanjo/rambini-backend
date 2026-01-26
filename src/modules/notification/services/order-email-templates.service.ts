// src/modules/notification/services/order-email-templates.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus, OrderType } from '@/entities';
import { AdminOrderEmailTemplatesService } from './admin-order-email-templates.service';

export interface OrderEmailTemplate {
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class OrderEmailTemplatesService {
  private readonly logger = new Logger(OrderEmailTemplatesService.name);

  constructor(
    private readonly adminTemplates: AdminOrderEmailTemplatesService,
  ) {}

  /**
   * Delegate admin order summary to admin templates service
   */
  getAdminOrderSummaryTemplate(data: Parameters<typeof this.adminTemplates.getAdminOrderSummaryTemplate>[0]) {
    return this.adminTemplates.getAdminOrderSummaryTemplate(data);
  }

  /**
   * Delegate admin order status change to admin templates service
   */
  getAdminOrderStatusChangeTemplate(data: Parameters<typeof this.adminTemplates.getAdminOrderStatusChangeTemplate>[0]) {
    return this.adminTemplates.getAdminOrderStatusChangeTemplate(data);
  }

  /**
   * Get email template for new order (sent to vendor)
   */
  getNewOrderTemplate(data: {
    vendorName: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    orderType: OrderType;
    totalAmount: number;
    currency: string;
    itemCount: number;
    items: Array<{ name: string; quantity: number; price: number }>;
    deliveryAddress?: string;
    pickupAddress?: string;
    specialInstructions?: string;
    orderUrl: string;
  }): OrderEmailTemplate {
    const itemsList = data.items
      .map(item => `<li>${item.quantity}x ${item.name} - ${data.currency}${item.price.toFixed(2)}</li>`)
      .join('');

    const deliveryInfo = data.orderType === OrderType.DELIVERY
      ? `
        <div style="background: #fff3cd; padding: 15px; border-radius: 4px; margin: 15px 0;">
          <p style="margin: 0;"><strong>📍 Delivery Address:</strong></p>
          <p style="margin: 5px 0 0 0;">${data.deliveryAddress}</p>
        </div>
      `
      : `
        <div style="background: #d1ecf1; padding: 15px; border-radius: 4px; margin: 15px 0;">
          <p style="margin: 0;"><strong>🏪 Pickup Address:</strong></p>
          <p style="margin: 5px 0 0 0;">${data.pickupAddress}</p>
          <p style="margin: 10px 0 0 0; color: #0c5460; font-size: 14px;">Customer will pick up the order</p>
        </div>
      `;

    return {
      subject: `🔔 New ${data.orderType === OrderType.DELIVERY ? 'Delivery' : 'Pickup'} Order #${data.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🎉 New Order Received!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Order #${data.orderNumber}</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 18px; margin: 0 0 20px 0;">Hello <strong>${data.vendorName}</strong>,</p>
            <p>You have received a new ${data.orderType.toLowerCase()} order! Please confirm and prepare it as soon as possible.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="margin: 0 0 15px 0; color: #333;">📋 Order Summary</h3>
              <p><strong>Customer:</strong> ${data.customerName}</p>
              <p><strong>Phone:</strong> ${data.customerPhone}</p>
              <p><strong>Order Type:</strong> ${data.orderType === OrderType.DELIVERY ? '🚚 Delivery' : '🏪 Pickup'}</p>
              <p><strong>Total Items:</strong> ${data.itemCount}</p>
              <p style="font-size: 20px; margin: 15px 0 0 0;"><strong>Total Amount:</strong> <span style="color: #28a745;">${data.currency}${data.totalAmount.toFixed(2)}</span></p>
            </div>

            ${deliveryInfo}

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #333;">🛒 Order Items</h3>
              <ul style="list-style: none; padding: 0; margin: 0;">
                ${itemsList}
              </ul>
            </div>

            ${data.specialInstructions ? `
              <div style="background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0;"><strong>📝 Special Instructions:</strong></p>
                <p style="margin: 5px 0 0 0;">${data.specialInstructions}</p>
              </div>
            ` : ''}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.orderUrl}" style="background: #28a745; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">View Order Details</a>
            </div>

            <div style="background: #e9ecef; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                <strong>⚡ Quick Actions:</strong><br>
                • Confirm the order to let the customer know you're preparing it<br>
                • Update the order status as you progress<br>
                • Contact the customer if you have any questions
              </p>
            </div>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
              Need help? Contact our support team at <a href="mailto:support@rambini.com" style="color: #667eea;">support@rambini.com</a>
            </p>
          </div>
        </div>
      `,
      text: `
        New ${data.orderType === OrderType.DELIVERY ? 'Delivery' : 'Pickup'} Order #${data.orderNumber}
        
        Hello ${data.vendorName},
        
        You have received a new ${data.orderType.toLowerCase()} order!
        
        Order Summary:
        - Customer: ${data.customerName}
        - Phone: ${data.customerPhone}
        - Order Type: ${data.orderType}
        - Total Items: ${data.itemCount}
        - Total Amount: ${data.currency}${data.totalAmount.toFixed(2)}
        
        ${data.orderType === OrderType.DELIVERY ? `Delivery Address: ${data.deliveryAddress}` : `Pickup Address: ${data.pickupAddress}`}
        
        Order Items:
        ${data.items.map(item => `- ${item.quantity}x ${item.name} - ${data.currency}${item.price.toFixed(2)}`).join('\n')}
        
        ${data.specialInstructions ? `Special Instructions: ${data.specialInstructions}` : ''}
        
        View order details: ${data.orderUrl}
        
        Please confirm and prepare the order as soon as possible.
      `
    };
  }

  /**
   * Get email template for order confirmation (sent to customer)
   */
  getOrderConfirmationTemplate(data: {
    customerName: string;
    orderNumber: string;
    vendorName: string;
    vendorPhone?: string;
    orderType: OrderType;
    totalAmount: number;
    currency: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    deliveryAddress?: string;
    pickupAddress?: string;
    estimatedPrepTime?: number;
    orderUrl: string;
  }): OrderEmailTemplate {
    const itemsList = data.items
      .map(item => `<li style="padding: 8px 0; border-bottom: 1px solid #eee;">${item.quantity}x ${item.name} - ${data.currency}${item.price.toFixed(2)}</li>`)
      .join('');

    return {
      subject: `✅ Order Confirmed #${data.orderNumber} - ${data.vendorName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #28a745; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">✅ Order Confirmed!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Order #${data.orderNumber}</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 18px; margin: 0 0 20px 0;">Hi <strong>${data.customerName}</strong>,</p>
            <p>Great news! Your order has been confirmed and is being prepared by ${data.vendorName}.</p>
            
            ${data.estimatedPrepTime ? `
              <div style="background: #d4edda; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #28a745;">
                <p style="margin: 0;"><strong>⏱️ Estimated Preparation Time:</strong> ${data.estimatedPrepTime} minutes</p>
              </div>
            ` : ''}

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="margin: 0 0 15px 0; color: #333;">📋 Order Details</h3>
              <p><strong>Vendor:</strong> ${data.vendorName}</p>
              ${data.vendorPhone ? `<p><strong>Vendor Phone:</strong> ${data.vendorPhone}</p>` : ''}
              <p><strong>Order Type:</strong> ${data.orderType === OrderType.DELIVERY ? '🚚 Delivery' : '🏪 Pickup'}</p>
              <p style="font-size: 20px; margin: 15px 0 0 0;"><strong>Total:</strong> <span style="color: #28a745;">${data.currency}${data.totalAmount.toFixed(2)}</span></p>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="margin: 0 0 15px 0; color: #333;">🛒 Your Items</h3>
              <ul style="list-style: none; padding: 0; margin: 0;">
                ${itemsList}
              </ul>
            </div>

            ${data.orderType === OrderType.DELIVERY ? `
              <div style="background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0;"><strong>📍 Delivery Address:</strong></p>
                <p style="margin: 5px 0 0 0;">${data.deliveryAddress}</p>
              </div>
            ` : `
              <div style="background: #d1ecf1; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0;"><strong>🏪 Pickup Location:</strong></p>
                <p style="margin: 5px 0 0 0;">${data.pickupAddress}</p>
                <p style="margin: 10px 0 0 0; color: #0c5460; font-size: 14px;">Please pick up your order at the above address when it's ready.</p>
              </div>
            `}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.orderUrl}" style="background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">Track Your Order</a>
            </div>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; text-align: center;">
              Thank you for choosing Rambini! 🎉
            </p>
          </div>
        </div>
      `,
      text: `
        Order Confirmed #${data.orderNumber}
        
        Hi ${data.customerName},
        
        Your order has been confirmed and is being prepared by ${data.vendorName}.
        
        ${data.estimatedPrepTime ? `Estimated Preparation Time: ${data.estimatedPrepTime} minutes` : ''}
        
        Order Details:
        - Vendor: ${data.vendorName}
        ${data.vendorPhone ? `- Vendor Phone: ${data.vendorPhone}` : ''}
        - Order Type: ${data.orderType}
        - Total: ${data.currency}${data.totalAmount.toFixed(2)}
        
        Your Items:
        ${data.items.map(item => `- ${item.quantity}x ${item.name} - ${data.currency}${item.price.toFixed(2)}`).join('\n')}
        
        ${data.orderType === OrderType.DELIVERY ? `Delivery Address: ${data.deliveryAddress}` : `Pickup Location: ${data.pickupAddress}`}
        
        Track your order: ${data.orderUrl}
        
        Thank you for choosing Rambini!
      `
    };
  }

  /**
   * Get email template for order status update (sent to customer)
   */
  getOrderStatusUpdateTemplate(data: {
    customerName: string;
    orderNumber: string;
    vendorName: string;
    orderStatus: OrderStatus;
    orderType: OrderType;
    estimatedTime?: number | string;
    trackingUrl?: string;
    orderUrl: string;
    additionalNotes?: string;
  }): OrderEmailTemplate {
    const statusInfo = this.getStatusInfo(data.orderStatus);
    
    return {
      subject: `${statusInfo.emoji} Order #${data.orderNumber} - ${statusInfo.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${statusInfo.color}; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">${statusInfo.emoji} ${statusInfo.title}</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Order #${data.orderNumber}</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 18px; margin: 0 0 20px 0;">Hi <strong>${data.customerName}</strong>,</p>
            <p style="font-size: 16px;">${statusInfo.message}</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="margin: 0 0 15px 0; color: #333;">📦 Order Information</h3>
              <p><strong>Order Number:</strong> ${data.orderNumber}</p>
              <p><strong>Vendor:</strong> ${data.vendorName}</p>
              <p><strong>Status:</strong> <span style="color: ${statusInfo.color}; font-weight: bold;">${statusInfo.statusText}</span></p>
              <p><strong>Order Type:</strong> ${data.orderType === OrderType.DELIVERY ? '🚚 Delivery' : '🏪 Pickup'}</p>
            </div>

            ${data.estimatedTime ? `
              <div style="background: #d1ecf1; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0;"><strong>⏱️ Estimated Time:</strong> ${data.estimatedTime}</p>
              </div>
            ` : ''}

            ${data.trackingUrl ? `
              <div style="background: #d4edda; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>📍 Track Your Delivery:</strong></p>
                <a href="${data.trackingUrl}" style="color: #155724; text-decoration: underline;">Click here to track your order in real-time</a>
              </div>
            ` : ''}

            ${data.additionalNotes ? `
              <div style="background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0;"><strong>📝 Note:</strong></p>
                <p style="margin: 5px 0 0 0;">${data.additionalNotes}</p>
              </div>
            ` : ''}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.orderUrl}" style="background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">View Order Details</a>
            </div>

            ${statusInfo.additionalInfo ? `
              <div style="background: #e9ecef; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #666;">${statusInfo.additionalInfo}</p>
              </div>
            ` : ''}

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; text-align: center;">
              Thank you for choosing Rambini! 🎉
            </p>
          </div>
        </div>
      `,
      text: `
        Order #${data.orderNumber} - ${statusInfo.title}
        
        Hi ${data.customerName},
        
        ${statusInfo.message}
        
        Order Information:
        - Order Number: ${data.orderNumber}
        - Vendor: ${data.vendorName}
        - Status: ${statusInfo.statusText}
        - Order Type: ${data.orderType}
        
        ${data.estimatedTime ? `Estimated Time: ${data.estimatedTime}` : ''}
        ${data.trackingUrl ? `Track your delivery: ${data.trackingUrl}` : ''}
        ${data.additionalNotes ? `Note: ${data.additionalNotes}` : ''}
        
        View order details: ${data.orderUrl}
        
        ${statusInfo.additionalInfo || ''}
        
        Thank you for choosing Rambini!
      `
    };
  }

  /**
   * Get status-specific information
   */
  private getStatusInfo(status: OrderStatus): {
    emoji: string;
    title: string;
    statusText: string;
    message: string;
    color: string;
    additionalInfo?: string;
  } {
    switch (status) {
      case OrderStatus.NEW:
        return {
          emoji: '🔔',
          title: 'Order Received',
          statusText: 'New',
          message: 'Your order has been received and is awaiting confirmation from the vendor.',
          color: '#6c757d',
          additionalInfo: 'You will receive an update once the vendor confirms your order.'
        };
      
      case OrderStatus.CONFIRMED:
        return {
          emoji: '✅',
          title: 'Order Confirmed',
          statusText: 'Confirmed',
          message: 'Great news! Your order has been confirmed by the vendor.',
          color: '#28a745',
          additionalInfo: 'The vendor is getting ready to prepare your order.'
        };
      
      case OrderStatus.PREPARING:
        return {
          emoji: '👨‍🍳',
          title: 'Preparing Your Order',
          statusText: 'Preparing',
          message: 'Your delicious meal is being prepared with care!',
          color: '#ffc107',
          additionalInfo: 'The vendor is working hard to prepare your order. It will be ready soon!'
        };
      
      case OrderStatus.READY:
        return {
          emoji: '🎉',
          title: 'Order Ready',
          statusText: 'Ready',
          message: 'Your order is ready!',
          color: '#17a2b8',
          additionalInfo: 'Your order is packaged and ready for pickup or delivery.'
        };
      
      case OrderStatus.OUT_FOR_DELIVERY:
        return {
          emoji: '🚚',
          title: 'Out for Delivery',
          statusText: 'Out for Delivery',
          message: 'Your order is on its way to you!',
          color: '#007bff',
          additionalInfo: 'Track your delivery in real-time using the tracking link above.'
        };
      
      case OrderStatus.DELIVERED:
        return {
          emoji: '✨',
          title: 'Order Delivered',
          statusText: 'Delivered',
          message: 'Your order has been successfully delivered! Enjoy your meal!',
          color: '#28a745',
          additionalInfo: 'We hope you enjoy your order! Please rate your experience to help us improve.'
        };
      
      case OrderStatus.CANCELLED:
        return {
          emoji: '❌',
          title: 'Order Cancelled',
          statusText: 'Cancelled',
          message: 'Your order has been cancelled.',
          color: '#dc3545',
          additionalInfo: 'If you have any questions, please contact our support team.'
        };
      
      default:
        return {
          emoji: '📦',
          title: 'Order Update',
          statusText: status,
          message: 'There has been an update to your order.',
          color: '#6c757d'
        };
    }
  }
}