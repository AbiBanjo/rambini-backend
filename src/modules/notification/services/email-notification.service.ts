import { Injectable, Logger } from '@nestjs/common';
import { Notification, User } from '../../../entities';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailNotificationData {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);

  // Email templates for different notification types
  private readonly templates = new Map<string, EmailTemplate>();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    // Order Update Template
    this.templates.set('ORDER_UPDATE', {
      subject: 'Order Update - {{orderId}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; margin-bottom: 20px;">Order Update</h2>
            <p>Hello {{userName}},</p>
            <p>Your order <strong>{{orderId}}</strong> has been updated.</p>
            <div style="background: white; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <p><strong>Status:</strong> {{status}}</p>
              <p><strong>Message:</strong> {{message}}</p>
              {{#if estimatedDelivery}}
              <p><strong>Estimated Delivery:</strong> {{estimatedDelivery}}</p>
              {{/if}}
            </div>
            <p>Thank you for choosing Rambini!</p>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #666;">
                If you have any questions, please contact our support team.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
        Order Update - {{orderId}}
        
        Hello {{userName}},
        
        Your order {{orderId}} has been updated.
        
        Status: {{status}}
        Message: {{message}}
        {{#if estimatedDelivery}}
        Estimated Delivery: {{estimatedDelivery}}
        {{/if}}
        
        Thank you for choosing Rambini!
        
        If you have any questions, please contact our support team.
      `
    });

    // Payment Template
    this.templates.set('PAYMENT', {
      subject: 'Payment {{status}} - {{amount}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; margin-bottom: 20px;">Payment {{status}}</h2>
            <p>Hello {{userName}},</p>
            <p>Your payment has been {{status.toLowerCase()}}.</p>
            <div style="background: white; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <p><strong>Amount:</strong> {{amount}}</p>
              <p><strong>Status:</strong> {{status}}</p>
              <p><strong>Transaction ID:</strong> {{transactionId}}</p>
              {{#if message}}
              <p><strong>Message:</strong> {{message}}</p>
              {{/if}}
            </div>
            <p>Thank you for your business!</p>
          </div>
        </div>
      `,
      text: `
        Payment {{status}} - {{amount}}
        
        Hello {{userName}},
        
        Your payment has been {{status.toLowerCase()}}.
        
        Amount: {{amount}}
        Status: {{status}}
        Transaction ID: {{transactionId}}
        {{#if message}}
        Message: {{message}}
        {{/if}}
        
        Thank you for your business!
      `
    });

    // System Notification Template
    this.templates.set('SYSTEM', {
      subject: '{{title}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; margin-bottom: 20px;">{{title}}</h2>
            <p>Hello {{userName}},</p>
            <div style="background: white; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <p>{{message}}</p>
            </div>
            <p>Best regards,<br>The Rambini Team</p>
          </div>
        </div>
      `,
      text: `
        {{title}}
        
        Hello {{userName}},
        
        {{message}}
        
        Best regards,
        The Rambini Team
      `
    });

    // Promotion Template
    this.templates.set('PROMOTION', {
      subject: '🎉 Special Offer: {{title}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; text-align: center;">🎉 Special Offer</h2>
          </div>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
            <p>Hello {{userName}},</p>
            <h3 style="color: #333;">{{title}}</h3>
            <div style="background: white; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <p>{{message}}</p>
              {{#if discountCode}}
              <p style="background: #e8f5e8; padding: 10px; border-radius: 4px; text-align: center;">
                <strong>Use code: {{discountCode}}</strong>
              </p>
              {{/if}}
            </div>
            <p>Don't miss out on this amazing deal!</p>
          </div>
        </div>
      `,
      text: `
        🎉 Special Offer: {{title}}
        
        Hello {{userName}},
        
        {{title}}
        
        {{message}}
        
        {{#if discountCode}}
        Use code: {{discountCode}}
        {{/if}}
        
        Don't miss out on this amazing deal!
      `
    });
  }

  async sendEmailNotification(
    notification: Notification,
    user: User,
    customData?: Record<string, any>
  ): Promise<boolean> {
    try {
      const template = this.getTemplate(notification.notification_type);
      const emailData = this.prepareEmailData(notification, user, template, customData);
      
      // Here you would integrate with your email service (SendGrid, AWS SES, etc.)
      await this.deliverEmail(emailData);
      
      this.logger.log(`Email notification sent to ${user.email} for notification ${notification.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email notification: ${error.message}`, error.stack);
      return false;
    }
  }

  private getTemplate(notificationType: string): EmailTemplate {
    return this.templates.get(notificationType) || this.templates.get('SYSTEM');
  }

  private prepareEmailData(
    notification: Notification,
    user: User,
    template: EmailTemplate,
    customData?: Record<string, any>
  ): EmailNotificationData {
    const templateData = {
      userName: user.first_name || user.email,
      title: notification.title,
      message: notification.message,
      ...notification.data,
      ...customData,
    };

    return {
      to: user.email,
      subject: this.renderTemplate(template.subject, templateData),
      html: this.renderTemplate(template.html, templateData),
      text: this.renderTemplate(template.text, templateData),
      from: process.env.EMAIL_FROM || 'noreply@rambini.com',
      replyTo: process.env.EMAIL_REPLY_TO || 'support@rambini.com',
    };
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    let rendered = template;

    // Simple template rendering (you might want to use a more robust templating engine like Handlebars)
    Object.keys(data).forEach(key => {
      const value = data[key];
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, value !== null && value !== undefined ? String(value) : '');
    });

    // Handle conditional blocks {{#if condition}}...{{/if}}
    rendered = rendered.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
      return data[condition] ? content : '';
    });

    return rendered;
  }

  private async deliverEmail(emailData: EmailNotificationData): Promise<void> {
    // This is a placeholder implementation
    // In a real application, you would integrate with an email service like:
    // - SendGrid
    // - AWS SES
    // - Mailgun
    // - Nodemailer with SMTP
    
    this.logger.log(`[EMAIL SERVICE] Sending email to ${emailData.to}`);
    this.logger.log(`[EMAIL SERVICE] Subject: ${emailData.subject}`);
    this.logger.log(`[EMAIL SERVICE] HTML Content Length: ${emailData.html.length} characters`);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In production, replace this with actual email service call:
    /*
    const emailService = new SendGridService(process.env.SENDGRID_API_KEY);
    await emailService.send({
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    });
    */
  }

  // Method to add custom templates at runtime
  addTemplate(notificationType: string, template: EmailTemplate): void {
    this.templates.set(notificationType, template);
  }

  // Method to get all available templates
  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  // Method to validate email address
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Method to send bulk emails
  async sendBulkEmails(
    notifications: Array<{ notification: Notification; user: User; customData?: Record<string, any> }>
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    const promises = notifications.map(async ({ notification, user, customData }) => {
      try {
        const result = await this.sendEmailNotification(notification, user, customData);
        if (result) {
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        this.logger.error(`Bulk email failed for user ${user.id}: ${error.message}`);
        failed++;
      }
    });

    await Promise.allSettled(promises);

    this.logger.log(`Bulk email completed: ${success} successful, ${failed} failed`);
    return { success, failed };
  }
}
