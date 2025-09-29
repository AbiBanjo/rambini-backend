import { Injectable, Logger } from '@nestjs/common';
import { Notification, User } from '../../../entities';
import * as nodemailer from 'nodemailer';

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
  private transporter: nodemailer.Transporter;

  // Email templates for different notification types
  private readonly templates = new Map<string, EmailTemplate>();

  constructor() {
    this.initializeTemplates();
    this.initializeTransporter();
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

    // Withdrawal OTP Template
    this.templates.set('WITHDRAWAL_OTP', {
      subject: 'Withdrawal Verification Code - {{otpCode}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; margin-bottom: 20px;">Withdrawal Verification</h2>
            <p>Hello {{userName}},</p>
            <p>You have requested to withdraw funds from your wallet. Please use the verification code below to complete your withdrawal request.</p>
            <div style="background: white; padding: 20px; border-radius: 4px; margin: 20px 0; text-align: center;">
              <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">{{otpCode}}</h1>
              <p style="color: #666; margin: 10px 0 0 0;">Valid for {{expiryMinutes}} minutes</p>
            </div>
            <p><strong>Important:</strong></p>
            <ul style="color: #666;">
              <li>Do not share this code with anyone</li>
              <li>This code will expire in {{expiryMinutes}} minutes</li>
              <li>If you didn't request this withdrawal, please contact support immediately</li>
            </ul>
            <p>Thank you for using Rambini!</p>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #666;">
                If you have any questions, please contact our support team.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
        Withdrawal Verification Code - {{otpCode}}
        
        Hello {{userName}},
        
        You have requested to withdraw funds from your wallet. Please use the verification code below to complete your withdrawal request.
        
        Verification Code: {{otpCode}}
        Valid for: {{expiryMinutes}} minutes
        
        Important:
        - Do not share this code with anyone
        - This code will expire in {{expiryMinutes}} minutes
        - If you didn't request this withdrawal, please contact support immediately
        
        Thank you for using Rambini!
        
        If you have any questions, please contact our support team.
      `
    });

    // Withdrawal Completed Template
    this.templates.set('WITHDRAWAL_COMPLETED', {
      subject: 'Withdrawal Completed - {{amount}} {{currency}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #28a745; margin-bottom: 20px;">✅ Withdrawal Completed</h2>
            <p>Hello {{userName}},</p>
            <p>Your withdrawal request has been completed successfully!</p>
            <div style="background: white; padding: 20px; border-radius: 4px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Transaction Details</h3>
              <p><strong>Amount:</strong> {{amount}} {{currency}}</p>
              <p><strong>Status:</strong> <span style="color: #28a745;">Completed</span></p>
              {{#if transactionRef}}
              <p><strong>Transaction Reference:</strong> {{transactionRef}}</p>
              {{/if}}
              <p><strong>Date:</strong> {{date}}</p>
            </div>
            <p>The funds should be available in your bank account within 1-3 business days.</p>
            <p>Thank you for using Rambini!</p>
          </div>
        </div>
      `,
      text: `
        Withdrawal Completed - {{amount}} {{currency}}
        
        Hello {{userName}},
        
        Your withdrawal request has been completed successfully!
        
        Transaction Details:
        Amount: {{amount}} {{currency}}
        Status: Completed
        {{#if transactionRef}}
        Transaction Reference: {{transactionRef}}
        {{/if}}
        Date: {{date}}
        
        The funds should be available in your bank account within 1-3 business days.
        
        Thank you for using Rambini!
      `
    });

    // Withdrawal Failed Template
    this.templates.set('WITHDRAWAL_FAILED', {
      subject: 'Withdrawal Failed - {{amount}} {{currency}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #dc3545; margin-bottom: 20px;">❌ Withdrawal Failed</h2>
            <p>Hello {{userName}},</p>
            <p>Unfortunately, your withdrawal request could not be processed.</p>
            <div style="background: white; padding: 20px; border-radius: 4px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Transaction Details</h3>
              <p><strong>Amount:</strong> {{amount}} {{currency}}</p>
              <p><strong>Status:</strong> <span style="color: #dc3545;">Failed</span></p>
              {{#if reason}}
              <p><strong>Reason:</strong> {{reason}}</p>
              {{/if}}
              <p><strong>Date:</strong> {{date}}</p>
            </div>
            <p>Your funds have been returned to your wallet. You can try again or contact support if you need assistance.</p>
            <p>Thank you for using Rambini!</p>
          </div>
        </div>
      `,
      text: `
        Withdrawal Failed - {{amount}} {{currency}}
        
        Hello {{userName}},
        
        Unfortunately, your withdrawal request could not be processed.
        
        Transaction Details:
        Amount: {{amount}} {{currency}}
        Status: Failed
        {{#if reason}}
        Reason: {{reason}}
        {{/if}}
        Date: {{date}}
        
        Your funds have been returned to your wallet. You can try again or contact support if you need assistance.
        
        Thank you for using Rambini!
      `
    });

    // Withdrawal Rejected Template
    this.templates.set('WITHDRAWAL_REJECTED', {
      subject: 'Withdrawal Rejected - {{amount}} {{currency}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #ffc107; margin-bottom: 20px;">⚠️ Withdrawal Rejected</h2>
            <p>Hello {{userName}},</p>
            <p>Your withdrawal request has been rejected by our team.</p>
            <div style="background: white; padding: 20px; border-radius: 4px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Transaction Details</h3>
              <p><strong>Amount:</strong> {{amount}} {{currency}}</p>
              <p><strong>Status:</strong> <span style="color: #ffc107;">Rejected</span></p>
              {{#if reason}}
              <p><strong>Reason:</strong> {{reason}}</p>
              {{/if}}
              <p><strong>Date:</strong> {{date}}</p>
            </div>
            <p>Your funds have been returned to your wallet. Please review the reason and contact support if you have any questions.</p>
            <p>Thank you for using Rambini!</p>
          </div>
        </div>
      `,
      text: `
        Withdrawal Rejected - {{amount}} {{currency}}
        
        Hello {{userName}},
        
        Your withdrawal request has been rejected by our team.
        
        Transaction Details:
        Amount: {{amount}} {{currency}}
        Status: Rejected
        {{#if reason}}
        Reason: {{reason}}
        {{/if}}
        Date: {{date}}
        
        Your funds have been returned to your wallet. Please review the reason and contact support if you have any questions.
        
        Thank you for using Rambini!
      `
    });

    // Admin Withdrawal Request Template
    this.templates.set('ADMIN_WITHDRAWAL_REQUEST', {
      subject: 'New Withdrawal Request - {{amount}} {{currency}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; margin-bottom: 20px;">New Withdrawal Request</h2>
            <p>Hello Admin,</p>
            <p>A new withdrawal request has been submitted and requires your attention.</p>
            <div style="background: white; padding: 20px; border-radius: 4px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Withdrawal Details</h3>
              <p><strong>User:</strong> {{userName}} ({{userEmail}})</p>
              <p><strong>Amount:</strong> {{amount}} {{currency}}</p>
              <p><strong>Country:</strong> {{country}}</p>
              <p><strong>Bank:</strong> {{bankName}}</p>
              <p><strong>Account:</strong> {{accountNumber}}</p>
              <p><strong>Request ID:</strong> {{withdrawalId}}</p>
              <p><strong>Date:</strong> {{date}}</p>
            </div>
            <div style="background: #e9ecef; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <h4 style="margin-top: 0;">Admin Actions</h4>
              <p>Use the following links to process this withdrawal request:</p>
              <p>
                <a href="{{baseUrl}}/admin/withdrawal/{{withdrawalId}}/done" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px;">Mark as Done</a>
                <a href="{{baseUrl}}/admin/withdrawal/{{withdrawalId}}/failed" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px;">Mark as Failed</a>
                <a href="{{baseUrl}}/admin/withdrawal/{{withdrawalId}}/rejected" style="background: #ffc107; color: black; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Mark as Rejected</a>
              </p>
            </div>
            <p>Please review and process this request promptly.</p>
          </div>
        </div>
      `,
      text: `
        New Withdrawal Request - {{amount}} {{currency}}
        
        Hello Admin,
        
        A new withdrawal request has been submitted and requires your attention.
        
        Withdrawal Details:
        User: {{userName}} ({{userEmail}})
        Amount: {{amount}} {{currency}}
        Country: {{country}}
        Bank: {{bankName}}
        Account: {{accountNumber}}
        Request ID: {{withdrawalId}}
        Date: {{date}}
        
        Admin Actions:
        Mark as Done: {{baseUrl}}/admin/withdrawal/{{withdrawalId}}/done
        Mark as Failed: {{baseUrl}}/admin/withdrawal/{{withdrawalId}}/failed
        Mark as Rejected: {{baseUrl}}/admin/withdrawal/{{withdrawalId}}/rejected
        
        Please review and process this request promptly.
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

  private initializeTransporter(): void {
    try {
      // Create transporter with SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Verify connection configuration
      this.transporter.verify((error, success) => {
        if (error) {
          this.logger.error('Email transporter verification failed:', error);
        } else {
          this.logger.log('Email transporter is ready to send messages');
        }
      });
    } catch (error) {
      this.logger.error('Failed to initialize email transporter:', error);
    }
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

  private  prepareEmailData(
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
    if (!this.transporter) {
      throw new Error('Email transporter is not initialized');
    }

    // Validate email address
    if (!this.isValidEmail(emailData.to)) {
      throw new Error(`Invalid email address: ${emailData.to}`);
    }

    this.logger.log(`[EMAIL SERVICE] Sending email to ${emailData.to}`);
    this.logger.log(`[EMAIL SERVICE] Subject: ${emailData.subject}`);
    this.logger.log(`[EMAIL SERVICE] HTML Content Length: ${emailData.html.length} characters`);

    try {
      // Prepare email options
      const mailOptions: nodemailer.SendMailOptions = {
        from: emailData.from || process.env.EMAIL_FROM || 'noreply@rambini.com',
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        replyTo: emailData.replyTo || process.env.EMAIL_REPLY_TO || 'support@rambini.com',
      };

      // Add attachments if provided
      if (emailData.attachments && emailData.attachments.length > 0) {
        mailOptions.attachments = emailData.attachments.map(attachment => ({
          filename: attachment.filename,
          content: attachment.content,
          contentType: attachment.contentType,
        }));
      }

      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      
      this.logger.log(`[EMAIL SERVICE] Email sent successfully. Message ID: ${info.messageId}`);
      
      // Log additional info in development
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(`[EMAIL SERVICE] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
    } catch (error) {
      this.logger.error(`[EMAIL SERVICE] Failed to send email to ${emailData.to}:`, error);
      throw new Error(`Email delivery failed: ${error.message}`);
    }
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

  // Method to test email configuration
  async testEmailConfiguration(): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.logger.error('Email transporter is not initialized');
        return false;
      }

      await this.transporter.verify();
      this.logger.log('Email configuration test successful');
      return true;
    } catch (error) {
      this.logger.error('Email configuration test failed:', error);
      return false;
    }
  }

  // Method to send a test email
  async sendTestEmail(to: string, subject: string = 'Test Email from Rambini'): Promise<boolean> {
    try {
      const testEmailData: EmailNotificationData = {
        to,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h2 style="color: #333;">Test Email</h2>
              <p>This is a test email from Rambini to verify email configuration.</p>
              <p>If you received this email, your email service is working correctly!</p>
              <p>Timestamp: ${new Date().toISOString()}</p>
            </div>
          </div>
        `,
        text: `Test Email\n\nThis is a test email from Rambini to verify email configuration.\n\nIf you received this email, your email service is working correctly!\n\nTimestamp: ${new Date().toISOString()}`,
      };

      await this.deliverEmail(testEmailData);
      return true;
    } catch (error) {
      this.logger.error('Failed to send test email:', error);
      return false;
    }
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
