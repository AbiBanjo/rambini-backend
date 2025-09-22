import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, NotificationPriority } from '../../../entities';

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  channels: {
    inApp: {
      title: string;
      message: string;
      actionUrl?: string;
      imageUrl?: string;
      category?: string;
    };
    push: {
      title: string;
      body: string;
      actionUrl?: string;
      imageUrl?: string;
      sound?: string;
      badge?: number;
    };
    email: {
      subject: string;
      html: string;
      text: string;
      from?: string;
      replyTo?: string;
    };
  };
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object';
  required: boolean;
  description: string;
  defaultValue?: any;
}

@Injectable()
export class NotificationTemplateService {
  private readonly logger = new Logger(NotificationTemplateService.name);
  private readonly templates = new Map<string, NotificationTemplate>();
  private readonly variables = new Map<string, TemplateVariable>();

  constructor() {
    this.initializeDefaultTemplates();
    this.initializeDefaultVariables();
  }

  private initializeDefaultTemplates(): void {
    // Order Update Template
    this.templates.set('ORDER_UPDATE', {
      id: 'ORDER_UPDATE',
      type: NotificationType.ORDER_UPDATE,
      priority: NotificationPriority.HIGH,
      channels: {
        inApp: {
          title: 'Order Update - {{orderNumber}}',
          message: 'Your order {{orderNumber}} status has been updated to {{status}}',
          actionUrl: '/orders/{{orderId}}',
          category: 'order',
        },
        push: {
          title: 'Order Update',
          body: 'Your order {{orderNumber}} is now {{status}}',
          actionUrl: '/orders/{{orderId}}',
          sound: 'order_update.wav',
          badge: 1,
        },
        email: {
          subject: 'Order Update - {{orderNumber}}',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Order Update</h2>
              <p>Hello {{customerName}},</p>
              <p>Your order <strong>{{orderNumber}}</strong> status has been updated.</p>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 4px;">
                <p><strong>Status:</strong> {{status}}</p>
                <p><strong>Order Number:</strong> {{orderNumber}}</p>
                {{#if estimatedDelivery}}
                <p><strong>Estimated Delivery:</strong> {{estimatedDelivery}}</p>
                {{/if}}
                {{#if trackingNumber}}
                <p><strong>Tracking Number:</strong> {{trackingNumber}}</p>
                {{/if}}
              </div>
              <p><a href="{{orderUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Order</a></p>
            </div>
          `,
          text: `
            Order Update - {{orderNumber}}
            
            Hello {{customerName}},
            
            Your order {{orderNumber}} status has been updated.
            
            Status: {{status}}
            Order Number: {{orderNumber}}
            {{#if estimatedDelivery}}
            Estimated Delivery: {{estimatedDelivery}}
            {{/if}}
            {{#if trackingNumber}}
            Tracking Number: {{trackingNumber}}
            {{/if}}
            
            View your order: {{orderUrl}}
          `,
        },
      },
      variables: ['orderId', 'orderNumber', 'status', 'customerName', 'estimatedDelivery', 'trackingNumber', 'orderUrl'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Payment Template
    this.templates.set('PAYMENT', {
      id: 'PAYMENT',
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.HIGH,
      channels: {
        inApp: {
          title: 'Payment {{status}}',
          message: 'Your payment of {{amount}} has been {{status}}',
          actionUrl: '/payments/{{transactionId}}',
          category: 'payment',
        },
        push: {
          title: 'Payment {{status}}',
          body: 'Payment of {{amount}} {{status}}',
          actionUrl: '/payments/{{transactionId}}',
          sound: 'payment.wav',
          badge: 1,
        },
        email: {
          subject: 'Payment {{status}} - {{amount}}',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Payment {{status}}</h2>
              <p>Hello {{customerName}},</p>
              <p>Your payment has been {{status}}.</p>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 4px;">
                <p><strong>Amount:</strong> {{amount}}</p>
                <p><strong>Status:</strong> {{status}}</p>
                <p><strong>Transaction ID:</strong> {{transactionId}}</p>
                <p><strong>Payment Method:</strong> {{paymentMethod}}</p>
                {{#if message}}
                <p><strong>Message:</strong> {{message}}</p>
                {{/if}}
              </div>
              <p><a href="{{paymentUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Payment</a></p>
            </div>
          `,
          text: `
            Payment {{status}} - {{amount}}
            
            Hello {{customerName}},
            
            Your payment has been {{status}}.
            
            Amount: {{amount}}
            Status: {{status}}
            Transaction ID: {{transactionId}}
            Payment Method: {{paymentMethod}}
            {{#if message}}
            Message: {{message}}
            {{/if}}
            
            View payment: {{paymentUrl}}
          `,
        },
      },
      variables: ['transactionId', 'amount', 'status', 'customerName', 'paymentMethod', 'message', 'paymentUrl'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Promotion Template
    this.templates.set('PROMOTION', {
      id: 'PROMOTION',
      type: NotificationType.PROMOTION,
      priority: NotificationPriority.NORMAL,
      channels: {
        inApp: {
          title: '🎉 {{promotionTitle}}',
          message: '{{promotionMessage}}',
          actionUrl: '/promotions/{{promotionId}}',
          imageUrl: '{{promotionImage}}',
          category: 'promotion',
        },
        push: {
          title: '🎉 Special Offer!',
          body: '{{promotionMessage}}',
          actionUrl: '/promotions/{{promotionId}}',
          imageUrl: '{{promotionImage}}',
          sound: 'promotion.wav',
        },
        email: {
          subject: '🎉 {{promotionTitle}} - Don\'t Miss Out!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h2 style="margin: 0;">🎉 Special Offer!</h2>
              </div>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
                <p>Hello {{customerName}},</p>
                <h3>{{promotionTitle}}</h3>
                <p>{{promotionMessage}}</p>
                {{#if promotionImage}}
                <div style="text-align: center; margin: 20px 0;">
                  <img src="{{promotionImage}}" alt="{{promotionTitle}}" style="max-width: 100%; height: auto; border-radius: 4px;">
                </div>
                {{/if}}
                {{#if discountCode}}
                <div style="background: #e8f5e8; padding: 15px; border-radius: 4px; text-align: center; margin: 20px 0;">
                  <p style="margin: 0; font-size: 18px; font-weight: bold;">Use code: {{discountCode}}</p>
                </div>
                {{/if}}
                <p><a href="{{promotionUrl}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Claim Offer</a></p>
                {{#if expiryDate}}
                <p style="color: #dc3545; font-weight: bold;">Offer expires on {{expiryDate}}</p>
                {{/if}}
              </div>
            </div>
          `,
          text: `
            🎉 {{promotionTitle}} - Don't Miss Out!
            
            Hello {{customerName}},
            
            {{promotionTitle}}
            
            {{promotionMessage}}
            
            {{#if discountCode}}
            Use code: {{discountCode}}
            {{/if}}
            
            Claim your offer: {{promotionUrl}}
            
            {{#if expiryDate}}
            Offer expires on {{expiryDate}}
            {{/if}}
          `,
        },
      },
      variables: ['promotionId', 'promotionTitle', 'promotionMessage', 'promotionImage', 'discountCode', 'promotionUrl', 'expiryDate', 'customerName'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // System Notification Template
    this.templates.set('SYSTEM', {
      id: 'SYSTEM',
      type: NotificationType.SYSTEM,
      priority: NotificationPriority.NORMAL,
      channels: {
        inApp: {
          title: '{{title}}',
          message: '{{message}}',
          actionUrl: '{{actionUrl}}',
          category: 'system',
        },
        push: {
          title: 'System Notification',
          body: '{{message}}',
          actionUrl: '{{actionUrl}}',
          sound: 'system.wav',
        },
        email: {
          subject: '{{title}}',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>{{title}}</h2>
              <p>Hello {{customerName}},</p>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 4px;">
                <p>{{message}}</p>
              </div>
              {{#if actionUrl}}
              <p><a href="{{actionUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Take Action</a></p>
              {{/if}}
              <p>Best regards,<br>The Rambini Team</p>
            </div>
          `,
          text: `
            {{title}}
            
            Hello {{customerName}},
            
            {{message}}
            
            {{#if actionUrl}}
            Take action: {{actionUrl}}
            {{/if}}
            
            Best regards,
            The Rambini Team
          `,
        },
      },
      variables: ['title', 'message', 'actionUrl', 'customerName'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  private initializeDefaultVariables(): void {
    const defaultVariables: TemplateVariable[] = [
      {
        name: 'customerName',
        type: 'string',
        required: true,
        description: 'Customer\'s full name',
      },
      {
        name: 'orderId',
        type: 'string',
        required: true,
        description: 'Unique order identifier',
      },
      {
        name: 'orderNumber',
        type: 'string',
        required: true,
        description: 'Human-readable order number',
      },
      {
        name: 'status',
        type: 'string',
        required: true,
        description: 'Current status of the order/payment',
      },
      {
        name: 'amount',
        type: 'string',
        required: true,
        description: 'Monetary amount with currency',
      },
      {
        name: 'transactionId',
        type: 'string',
        required: true,
        description: 'Payment transaction identifier',
      },
      {
        name: 'paymentMethod',
        type: 'string',
        required: false,
        description: 'Payment method used',
        defaultValue: 'Card',
      },
      {
        name: 'estimatedDelivery',
        type: 'date',
        required: false,
        description: 'Estimated delivery date',
      },
      {
        name: 'trackingNumber',
        type: 'string',
        required: false,
        description: 'Package tracking number',
      },
      {
        name: 'orderUrl',
        type: 'string',
        required: false,
        description: 'URL to view order details',
      },
      {
        name: 'paymentUrl',
        type: 'string',
        required: false,
        description: 'URL to view payment details',
      },
      {
        name: 'promotionId',
        type: 'string',
        required: true,
        description: 'Promotion identifier',
      },
      {
        name: 'promotionTitle',
        type: 'string',
        required: true,
        description: 'Promotion title',
      },
      {
        name: 'promotionMessage',
        type: 'string',
        required: true,
        description: 'Promotion description',
      },
      {
        name: 'promotionImage',
        type: 'string',
        required: false,
        description: 'Promotion image URL',
      },
      {
        name: 'discountCode',
        type: 'string',
        required: false,
        description: 'Discount code for the promotion',
      },
      {
        name: 'promotionUrl',
        type: 'string',
        required: false,
        description: 'URL to claim the promotion',
      },
      {
        name: 'expiryDate',
        type: 'date',
        required: false,
        description: 'Promotion expiry date',
      },
      {
        name: 'actionUrl',
        type: 'string',
        required: false,
        description: 'URL for user action',
      },
      {
        name: 'message',
        type: 'string',
        required: true,
        description: 'Notification message content',
      },
    ];

    defaultVariables.forEach(variable => {
      this.variables.set(variable.name, variable);
    });
  }

  getTemplate(type: NotificationType): NotificationTemplate | null {
    return this.templates.get(type) || null;
  }

  getAllTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  getActiveTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values()).filter(template => template.isActive);
  }

  createTemplate(template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): NotificationTemplate {
    const newTemplate: NotificationTemplate = {
      ...template,
      id: this.generateTemplateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(newTemplate.id, newTemplate);
    this.logger.log(`Created new template: ${newTemplate.id}`);
    
    return newTemplate;
  }

  updateTemplate(id: string, updates: Partial<NotificationTemplate>): NotificationTemplate | null {
    const template = this.templates.get(id);
    if (!template) {
      return null;
    }

    const updatedTemplate: NotificationTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date(),
    };

    this.templates.set(id, updatedTemplate);
    this.logger.log(`Updated template: ${id}`);
    
    return updatedTemplate;
  }

  deleteTemplate(id: string): boolean {
    const deleted = this.templates.delete(id);
    if (deleted) {
      this.logger.log(`Deleted template: ${id}`);
    }
    return deleted;
  }

  renderTemplate(
    template: NotificationTemplate,
    channel: 'inApp' | 'push' | 'email',
    variables: Record<string, any>
  ): string {
    const channelTemplate = template.channels[channel];
    if (!channelTemplate) {
      throw new Error(`Template ${template.id} does not support ${channel} channel`);
    }

    let content: string;
    switch (channel) {
      case 'inApp':
        content = (channelTemplate as any).title + '\n' + (channelTemplate as any).message;
        break;
      case 'push':
        content = (channelTemplate as any).title + '\n' + (channelTemplate as any).body;
        break;
      case 'email':
        content = (channelTemplate as any).subject + '\n' + (channelTemplate as any).html;
        break;
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }

    return this.renderString(content, variables);
  }

  renderString(template: string, variables: Record<string, any>): string {
    let rendered = template;

    // Replace simple variables {{variable}}
    Object.keys(variables).forEach(key => {
      const value = variables[key];
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, value !== null && value !== undefined ? String(value) : '');
    });

    // Handle conditional blocks {{#if condition}}...{{/if}}
    rendered = rendered.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
      return variables[condition] ? content : '';
    });

    // Handle else blocks {{#if condition}}...{{else}}...{{/if}}
    rendered = rendered.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, ifContent, elseContent) => {
      return variables[condition] ? ifContent : elseContent;
    });

    return rendered;
  }

  validateVariables(template: NotificationTemplate, variables: Record<string, any>): {
    valid: boolean;
    missing: string[];
    invalid: string[];
  } {
    const missing: string[] = [];
    const invalid: string[] = [];

    template.variables.forEach(variableName => {
      const variable = this.variables.get(variableName);
      if (!variable) {
        this.logger.warn(`Unknown variable: ${variableName}`);
        return;
      }

      if (variable.required && !(variableName in variables)) {
        missing.push(variableName);
      }

      if (variableName in variables) {
        const value = variables[variableName];
        if (!this.validateVariableType(value, variable.type)) {
          invalid.push(variableName);
        }
      }
    });

    return {
      valid: missing.length === 0 && invalid.length === 0,
      missing,
      invalid,
    };
  }

  private validateVariableType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return value instanceof Date || !isNaN(Date.parse(value));
      case 'object':
        return typeof value === 'object' && value !== null;
      default:
        return true;
    }
  }

  private generateTemplateId(): string {
    return 'TEMPLATE_' + Math.random().toString(36).substring(2, 15);
  }

  getVariableDefinition(name: string): TemplateVariable | null {
    return this.variables.get(name) || null;
  }

  getAllVariables(): TemplateVariable[] {
    return Array.from(this.variables.values());
  }

  addVariable(variable: TemplateVariable): void {
    this.variables.set(variable.name, variable);
    this.logger.log(`Added variable: ${variable.name}`);
  }

  removeVariable(name: string): boolean {
    const deleted = this.variables.delete(name);
    if (deleted) {
      this.logger.log(`Removed variable: ${name}`);
    }
    return deleted;
  }

  // Method to get template statistics
  getTemplateStats(): {
    totalTemplates: number;
    activeTemplates: number;
    templatesByType: Record<string, number>;
    variablesCount: number;
  } {
    const templates = Array.from(this.templates.values());
    
    return {
      totalTemplates: templates.length,
      activeTemplates: templates.filter(t => t.isActive).length,
      templatesByType: templates.reduce((acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      variablesCount: this.variables.size,
    };
  }
}
