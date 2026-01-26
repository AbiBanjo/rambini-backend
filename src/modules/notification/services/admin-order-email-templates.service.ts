// src/modules/notification/services/admin-order-email-templates.service.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
} from '@/entities';

export interface AdminEmailTemplate {
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class AdminOrderEmailTemplatesService {
  private readonly logger = new Logger(AdminOrderEmailTemplatesService.name);

  /**
   * Get email template for admin order summary (sent when new order is created)
   */
  getAdminOrderSummaryTemplate(data: {
    orderNumber: string;
    orderStatus: OrderStatus;
    orderType: OrderType;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    vendorName: string;
    vendorEmail: string;
    vendorPhone: string;
    subtotal: number;
    deliveryFee: number;
    totalAmount: number;
    currency: string;
    itemCount: number;
    items: Array<{ name: string; quantity: number; price: number }>;
    deliveryAddress?: string;
    pickupAddress?: string;
    specialInstructions?: string;
    vendorNotes?: string;
    orderUrl: string;
    createdAt: Date;
  }): AdminEmailTemplate {
    const itemsList = data.items
      .map(
        item =>
          `<tr>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${
              item.name
            }</td>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center;">${
              item.quantity
            }</td>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${
              data.currency
            }${item.price.toFixed(2)}</td>
          </tr>`,
      )
      .join('');

    const statusColor = this.getStatusColor(data.orderStatus);
    const paymentStatusColor = this.getPaymentStatusColor(data.paymentStatus);

    return {
      subject: `🔔 New Order Alert: #${data.orderNumber} - ${
        data.currency
      }${data.totalAmount.toFixed(2)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">🔔 New Order Received</h1>
              <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.95;">Order #${
                data.orderNumber
              }</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.85;">${new Date(
                data.createdAt,
              ).toLocaleString('en-US', {
                dateStyle: 'full',
                timeStyle: 'short',
              })}</p>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <!-- Quick Stats -->
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px;">
                <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; text-align: center; border: 2px solid #3b82f6;">
                  <div style="font-size: 24px; font-weight: bold; color: #1e40af;">${
                    data.currency
                  }${data.totalAmount.toFixed(2)}</div>
                  <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Total Amount</div>
                </div>
                <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; text-align: center; border: 2px solid #22c55e;">
                  <div style="font-size: 24px; font-weight: bold; color: #15803d;">${
                    data.itemCount
                  }</div>
                  <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Items</div>
                </div>
                <div style="background: #fef3c7; padding: 20px; border-radius: 8px; text-align: center; border: 2px solid #f59e0b;">
                  <div style="font-size: 14px; font-weight: bold; color: #92400e;">${
                    data.orderType
                  }</div>
                  <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Order Type</div>
                </div>
              </div>

              <!-- Order Status -->
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid ${statusColor};">
                <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 16px;">📊 Order Status</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                  <div>
                    <span style="color: #64748b; font-size: 13px;">Order Status:</span>
                    <div style="background: ${statusColor}; color: white; padding: 6px 12px; border-radius: 4px; display: inline-block; margin-left: 8px; font-size: 12px; font-weight: bold;">
                      ${data.orderStatus}
                    </div>
                  </div>
                  <div>
                    <span style="color: #64748b; font-size: 13px;">Payment Status:</span>
                    <div style="background: ${paymentStatusColor}; color: white; padding: 6px 12px; border-radius: 4px; display: inline-block; margin-left: 8px; font-size: 12px; font-weight: bold;">
                      ${data.paymentStatus}
                    </div>
                  </div>
                  <div>
                    <span style="color: #64748b; font-size: 13px;">Payment Method:</span>
                    <strong style="color: #1e293b; margin-left: 8px;">${
                      data.paymentMethod
                    }</strong>
                  </div>
                </div>
              </div>

              <!-- Customer Information -->
              <div style="background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 16px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">👤 Customer Information</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; width: 120px;">Name:</td>
                    <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${
                      data.customerName
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Email:</td>
                    <td style="padding: 8px 0; color: #1e293b;"><a href="mailto:${
                      data.customerEmail
                    }" style="color: #3b82f6; text-decoration: none;">${
        data.customerEmail
      }</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Phone:</td>
                    <td style="padding: 8px 0; color: #1e293b;"><a href="tel:${
                      data.customerPhone
                    }" style="color: #3b82f6; text-decoration: none;">${
        data.customerPhone
      }</a></td>
                  </tr>
                </table>
              </div>

              <!-- Vendor Information -->
              <div style="background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 16px; border-bottom: 2px solid #22c55e; padding-bottom: 10px;">🏪 Vendor Information</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; width: 120px;">Business:</td>
                    <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${
                      data.vendorName
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Email:</td>
                    <td style="padding: 8px 0; color: #1e293b;"><a href="mailto:${
                      data.vendorEmail
                    }" style="color: #3b82f6; text-decoration: none;">${
        data.vendorEmail
      }</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Phone:</td>
                    <td style="padding: 8px 0; color: #1e293b;"><a href="tel:${
                      data.vendorPhone
                    }" style="color: #3b82f6; text-decoration: none;">${
        data.vendorPhone
      }</a></td>
                  </tr>
                </table>
              </div>

              <!-- Order Items -->
              <div style="background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 16px; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">🛒 Order Items</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background: #f8fafc;">
                      <th style="padding: 12px; text-align: left; color: #64748b; font-size: 13px; border-bottom: 2px solid #e2e8f0;">Item</th>
                      <th style="padding: 12px; text-align: center; color: #64748b; font-size: 13px; border-bottom: 2px solid #e2e8f0;">Qty</th>
                      <th style="padding: 12px; text-align: right; color: #64748b; font-size: 13px; border-bottom: 2px solid #e2e8f0;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsList}
                  </tbody>
                </table>
              </div>

              <!-- Financial Summary -->
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 16px;">💰 Financial Summary</h3>
                <table style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Subtotal:</td>
                    <td style="padding: 8px 0; text-align: right; color: #1e293b; font-weight: 500;">${
                      data.currency
                    }${data.subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Delivery Fee:</td>
                    <td style="padding: 8px 0; text-align: right; color: #1e293b; font-weight: 500;">${
                      data.currency
                    }${data.deliveryFee.toFixed(2)}</td>
                  </tr>
                  <tr style="border-top: 2px solid #e2e8f0;">
                    <td style="padding: 12px 0 0 0; color: #1e293b; font-weight: bold; font-size: 16px;">Total Amount:</td>
                    <td style="padding: 12px 0 0 0; text-align: right; color: #1e40af; font-weight: bold; font-size: 18px;">${
                      data.currency
                    }${data.totalAmount.toFixed(2)}</td>
                  </tr>
                </table>
              </div>

              <!-- Address Information -->
              ${
                data.orderType === OrderType.DELIVERY && data.deliveryAddress
                  ? `
              <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
                <h4 style="margin: 0 0 10px 0; color: #92400e; font-size: 14px;">📍 Delivery Address</h4>
                <p style="margin: 0; color: #78350f; line-height: 1.6;">${data.deliveryAddress}</p>
              </div>
              `
                  : ''
              }

              ${
                data.orderType === OrderType.PICKUP && data.pickupAddress
                  ? `
              <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
                <h4 style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px;">🏪 Pickup Address</h4>
                <p style="margin: 0; color: #1e3a8a; line-height: 1.6;">${data.pickupAddress}</p>
              </div>
              `
                  : ''
              }

              <!-- Notes -->
              ${
                data.specialInstructions
                  ? `
              <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #ef4444;">
                <h4 style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px;">📝 Special Instructions</h4>
                <p style="margin: 0; color: #7f1d1d; line-height: 1.6;">${data.specialInstructions}</p>
              </div>
              `
                  : ''
              }

              ${
                data.vendorNotes
                  ? `
              <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #22c55e;">
                <h4 style="margin: 0 0 10px 0; color: #15803d; font-size: 14px;">📋 Vendor Notes</h4>
                <p style="margin: 0; color: #166534; line-height: 1.6;">${data.vendorNotes}</p>
              </div>
              `
                  : ''
              }

              <!-- Action Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${
                  data.orderUrl
                }" style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  View Full Order Details
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 13px;">
                This is an automated notification from Rambini Admin System
              </p>
              <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 12px;">
                © ${new Date().getFullYear()} Rambini. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
NEW ORDER ALERT - Order #${data.orderNumber}
========================================

Order Details:
- Order Number: ${data.orderNumber}
- Created: ${new Date(data.createdAt).toLocaleString()}
- Total Amount: ${data.currency}${data.totalAmount.toFixed(2)}
- Items: ${data.itemCount}
- Order Type: ${data.orderType}

Status:
- Order Status: ${data.orderStatus}
- Payment Status: ${data.paymentStatus}
- Payment Method: ${data.paymentMethod}

Customer Information:
- Name: ${data.customerName}
- Email: ${data.customerEmail}
- Phone: ${data.customerPhone}

Vendor Information:
- Business: ${data.vendorName}
- Email: ${data.vendorEmail}
- Phone: ${data.vendorPhone}

Order Items:
${data.items
  .map(
    item =>
      `- ${item.quantity}x ${item.name} - ${data.currency}${item.price.toFixed(
        2,
      )}`,
  )
  .join('\n')}

Financial Summary:
- Subtotal: ${data.currency}${data.subtotal.toFixed(2)}
- Delivery Fee: ${data.currency}${data.deliveryFee.toFixed(2)}
- Total: ${data.currency}${data.totalAmount.toFixed(2)}

${
  data.orderType === OrderType.DELIVERY && data.deliveryAddress
    ? `Delivery Address: ${data.deliveryAddress}`
    : ''
}
${
  data.orderType === OrderType.PICKUP && data.pickupAddress
    ? `Pickup Address: ${data.pickupAddress}`
    : ''
}
${
  data.specialInstructions
    ? `Special Instructions: ${data.specialInstructions}`
    : ''
}
${data.vendorNotes ? `Vendor Notes: ${data.vendorNotes}` : ''}

View full order details: ${data.orderUrl}
      `,
    };
  }

  /**
   * Get email template for admin order status change notification
   */
  getAdminOrderStatusChangeTemplate(data: {
    orderNumber: string;
    oldStatus: OrderStatus;
    newStatus: OrderStatus;
    changedBy: string;
    customerName: string;
    vendorName: string;
    totalAmount: number;
    currency: string;
    orderType: OrderType;
    orderUrl: string;
    timestamp: Date;
  }): AdminEmailTemplate {
    const statusColor = this.getStatusColor(data.newStatus);
    const oldStatusColor = this.getStatusColor(data.oldStatus);

    return {
      subject: `🔄 Order Status Update: #${data.orderNumber} - ${data.oldStatus} → ${data.newStatus}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">🔄 Order Status Changed</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Order #${
                data.orderNumber
              }</p>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <!-- Status Change Visual -->
              <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
                  <div style="flex: 1; text-align: center;">
                    <div style="background: ${oldStatusColor}; color: white; padding: 12px 20px; border-radius: 6px; font-weight: bold; font-size: 14px; margin-bottom: 5px;">
                      ${data.oldStatus}
                    </div>
                    <div style="color: #64748b; font-size: 12px;">Previous Status</div>
                  </div>
                  <div style="color: #6366f1; font-size: 24px; font-weight: bold;">→</div>
                  <div style="flex: 1; text-align: center;">
                    <div style="background: ${statusColor}; color: white; padding: 12px 20px; border-radius: 6px; font-weight: bold; font-size: 14px; margin-bottom: 5px;">
                      ${data.newStatus}
                    </div>
                    <div style="color: #64748b; font-size: 12px;">New Status</div>
                  </div>
                </div>
              </div>

              <!-- Order Information -->
              <div style="background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 16px; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">📦 Order Information</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; color: #64748b; width: 140px;">Order Number:</td>
                    <td style="padding: 10px 0; color: #1e293b; font-weight: 600;">#${
                      data.orderNumber
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #64748b;">Order Type:</td>
                    <td style="padding: 10px 0; color: #1e293b;">${
                      data.orderType
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #64748b;">Total Amount:</td>
                    <td style="padding: 10px 0; color: #1e293b; font-weight: 600;">${
                      data.currency
                    }${data.totalAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #64748b;">Customer:</td>
                    <td style="padding: 10px 0; color: #1e293b;">${
                      data.customerName
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #64748b;">Vendor:</td>
                    <td style="padding: 10px 0; color: #1e293b;">${
                      data.vendorName
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #64748b;">Changed By:</td>
                    <td style="padding: 10px 0; color: #1e293b; font-weight: 600;">${
                      data.changedBy
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #64748b;">Timestamp:</td>
                    <td style="padding: 10px 0; color: #1e293b;">${new Date(
                      data.timestamp,
                    ).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}</td>
                  </tr>
                </table>
              </div>

              <!-- Action Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${
                  data.orderUrl
                }" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  View Order Details
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f8fafc; padding: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                This is an automated notification from Rambini Admin System
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
ORDER STATUS CHANGE - Order #${data.orderNumber}
========================================

Status Update:
${data.oldStatus} → ${data.newStatus}

Order Information:
- Order Number: #${data.orderNumber}
- Order Type: ${data.orderType}
- Total Amount: ${data.currency}${data.totalAmount.toFixed(2)}
- Customer: ${data.customerName}
- Vendor: ${data.vendorName}
- Changed By: ${data.changedBy}
- Timestamp: ${new Date(data.timestamp).toLocaleString()}

View order details: ${data.orderUrl}
      `,
    };
  }

  /**
   * Get status color for visual representation
   */
  private getStatusColor(status: OrderStatus): string {
    const colorMap: Record<OrderStatus, string> = {
      [OrderStatus.NEW]: '#6b7280',
      [OrderStatus.CONFIRMED]: '#059669',
      [OrderStatus.PREPARING]: '#f59e0b',
      [OrderStatus.READY]: '#06b6d4',
      [OrderStatus.OUT_FOR_DELIVERY]: '#3b82f6',
      [OrderStatus.DELIVERED]: '#10b981',
      [OrderStatus.CANCELLED]: '#ef4444',
      [OrderStatus.REFUNDED]: '#8b5cf6',
    };
    return colorMap[status] || '#6b7280';
  }

  /**
   * Get payment status color
   */
  /**
   * Get payment status color
   */
  private getPaymentStatusColor(status: PaymentStatus): string {
    const colorMap: Record<PaymentStatus, string> = {
      [PaymentStatus.PENDING]: '#f59e0b',
      [PaymentStatus.PAID]: '#10b981',
      [PaymentStatus.FAILED]: '#ef4444',
      [PaymentStatus.REFUNDED]: '#8b5cf6',
      [PaymentStatus.PARTIALLY_REFUNDED]: '#a855f7', 
    };
    return colorMap[status] || '#6b7280';
  }
}
