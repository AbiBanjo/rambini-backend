// src/modules/notification/services/withdrawal-email-notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Withdrawal, User, Currency, Country } from '@/entities';
import { EmailNotificationService } from './email-notification.service';
import { WithdrawalEmailTemplatesService } from './withdrawal-email-templates.service';

@Injectable()
export class WithdrawalEmailNotificationService {
  private readonly logger = new Logger(WithdrawalEmailNotificationService.name);
  private readonly appUrl: string;
  private readonly adminEmail: string;

  constructor(
    private readonly emailService: EmailNotificationService,
    private readonly templateService: WithdrawalEmailTemplatesService,
    private readonly configService: ConfigService,
  ) {
    this.appUrl =
      this.configService.get<string>('APP_URL') || 'https://rambini.com';
    this.adminEmail =
      this.configService.get<string>('ADMIN_EMAIL') || 'info@bankfields.com';
  }

  /**
   * Send withdrawal OTP email to user
   */
  // Add to withdrawal-email-notification.service.ts

  async sendWithdrawalOTPEmail(
    user: User,
    otpCode: string,
    expiryMinutes: number = 10,
  ): Promise<boolean> {
    try {
      this.logger.log(`[EMAIL SVC] ========================================`);
      this.logger.log(`[EMAIL SVC] Starting sendWithdrawalOTPEmail`);
      this.logger.log(`[EMAIL SVC] User ID: ${user.id}`);
      this.logger.log(`[EMAIL SVC] User Email: ${user.email}`);
      this.logger.log(`[EMAIL SVC] Received OTP: "${otpCode}"`);
      this.logger.log(`[EMAIL SVC] OTP Type: ${typeof otpCode}`);
      this.logger.log(`[EMAIL SVC] OTP Length: ${otpCode.length}`);
      this.logger.log(`[EMAIL SVC] Expiry Minutes: ${expiryMinutes}`);

      // Validate user email
      if (!user || !user.email) {
        this.logger.warn(
          `[EMAIL SVC] ❌ Cannot send OTP email - user email not found for user ${
            user?.id || 'unknown'
          }`,
        );
        return false;
      }

      // Validate OTP format
      if (!otpCode || otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
        this.logger.error(
          `[EMAIL SVC] ❌ Invalid OTP format! Received: "${otpCode}"`,
        );
        return false;
      }

      this.logger.log(`[EMAIL SVC] ✓ User email validated: ${user.email}`);
      this.logger.log(`[EMAIL SVC] ✓ OTP format validated: "${otpCode}"`);

      const userName = user.first_name || user.full_name || 'User';
      this.logger.log(`[EMAIL SVC] User name for template: ${userName}`);

      // Get email template
      this.logger.log(
        `[EMAIL SVC] Calling templateService.getWithdrawalOTPTemplate()`,
      );
      this.logger.log(`[EMAIL SVC] Template params:`, {
        userName,
        otpCode,
        expiryMinutes,
      });

      const template = this.templateService.getWithdrawalOTPTemplate({
        userName,
        otpCode,
        expiryMinutes,
      });

      this.logger.log(`[EMAIL SVC] ✓ Template generated`);
      this.logger.log(`[EMAIL SVC] Template subject: ${template.subject}`);
      this.logger.log(
        `[EMAIL SVC] Template HTML length: ${template.html.length} characters`,
      );
      this.logger.log(
        `[EMAIL SVC] Template text length: ${template.text.length} characters`,
      );

      // CRITICAL: Verify OTP is in the template
      const subjectContainsOTP = template.subject.includes(otpCode);
      const htmlContainsOTP = template.html.includes(otpCode);
      const textContainsOTP = template.text.includes(otpCode);

      this.logger.log(
        `[EMAIL SVC] Subject contains OTP: ${subjectContainsOTP}`,
      );
      this.logger.log(`[EMAIL SVC] HTML contains OTP: ${htmlContainsOTP}`);
      this.logger.log(`[EMAIL SVC] Text contains OTP: ${textContainsOTP}`);

      if (!htmlContainsOTP) {
        this.logger.error(
          `[EMAIL SVC] ❌ CRITICAL: OTP "${otpCode}" NOT FOUND IN HTML TEMPLATE!`,
        );
        this.logger.error(
          `[EMAIL SVC] This means the template rendering failed!`,
        );

        // Log a snippet of the HTML to debug
        const htmlSnippet = template.html.substring(0, 500);
        this.logger.error(
          `[EMAIL SVC] HTML snippet (first 500 chars):`,
          htmlSnippet,
        );
      }

      // Try to extract what OTP is actually in the template
      const otpMatches = template.html.match(/\d{6}/g);
      if (otpMatches && otpMatches.length > 0) {
        this.logger.log(
          `[EMAIL SVC] OTPs found in template: ${otpMatches.join(', ')}`,
        );

        if (!otpMatches.includes(otpCode)) {
          this.logger.error(
            `[EMAIL SVC] ❌ WRONG OTP IN TEMPLATE! Expected: "${otpCode}", Found: "${otpMatches.join(
              ', ',
            )}"`,
          );
        } else {
          this.logger.log(`[EMAIL SVC] ✓ Correct OTP found in template`);
        }
      } else {
        this.logger.error(
          `[EMAIL SVC] ❌ No 6-digit numbers found in template at all!`,
        );
      }

      // Prepare email data
      const emailData = {
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: process.env.EMAIL_FROM || 'noreply@rambini.com',
        replyTo: process.env.EMAIL_REPLY_TO || 'support@rambini.com',
      };

      this.logger.log(`[EMAIL SVC] Prepared email data:`, {
        to: emailData.to,
        subject: emailData.subject,
        from: emailData.from,
        replyTo: emailData.replyTo,
        htmlLength: emailData.html.length,
        textLength: emailData.text.length,
      });

      // Send email
      this.logger.log(`[EMAIL SVC] Calling emailService.sendEmail()...`);

      await this.emailService.sendEmail(emailData);

      this.logger.log(`[EMAIL SVC] ✓ Email sent successfully!`);
      this.logger.log(`[EMAIL SVC] Final OTP sent: "${otpCode}"`);
      this.logger.log(`[EMAIL SVC] Sent to: ${user.email}`);
      this.logger.log(`[EMAIL SVC] ========================================`);

      return true;
    } catch (error) {
      this.logger.error(
        `[EMAIL SVC] ❌ Failed to send withdrawal OTP email to user ${user.id}`,
      );
      this.logger.error(`[EMAIL SVC] Error: ${error.message}`);

      if (error.stack) {
        this.logger.error(`[EMAIL SVC] Stack trace:`, error.stack);
      }

      // Log SendGrid specific errors
      if (error.response?.body) {
        this.logger.error(
          `[EMAIL SVC] SendGrid error details:`,
          JSON.stringify(error.response.body, null, 2),
        );
      }

      this.logger.error(`[EMAIL SVC] ========================================`);
      return false;
    }
  }

  /**
   * Send withdrawal request notification to admin
   */
  async sendWithdrawalRequestToAdmin(withdrawal: Withdrawal): Promise<boolean> {
    try {
      this.logger.log(
        `Sending withdrawal request notification to admin for withdrawal ${withdrawal.id}`,
      );

      // Get email template
      const template = this.templateService.getAdminWithdrawalRequestTemplate({
        withdrawalId: withdrawal.id,
        userName: withdrawal.user?.full_name || 'User',
        userEmail: withdrawal.user?.email || 'N/A',
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        country: withdrawal.country,
        bankName: withdrawal.bank_name,
        accountNumber: withdrawal.account_number,
        accountName: withdrawal.account_name,
        routingNumber: withdrawal.routing_number,
        sortCode: withdrawal.sort_code,
        accountType: withdrawal.account_type,
        date: withdrawal.created_at.toISOString(),
        baseUrl: this.appUrl,
      });

      // Send email to admin
      await this.emailService.sendEmail({
        to: this.adminEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: process.env.EMAIL_FROM || 'noreply@rambini.com',
        replyTo: process.env.EMAIL_REPLY_TO || 'support@rambini.com',
      });

      this.logger.log(
        `Withdrawal request notification sent to admin for withdrawal ${withdrawal.id}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send withdrawal request notification to admin for withdrawal ${withdrawal.id}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Send withdrawal completed email to user
   */
  async sendWithdrawalCompletedEmail(
    withdrawal: Withdrawal,
    user: User,
  ): Promise<boolean> {
    try {
      this.logger.log(
        `Sending withdrawal completed email to user ${user.id} for withdrawal ${withdrawal.id}`,
      );

      // Validate user email
      if (!user || !user.email) {
        this.logger.warn(
          `Cannot send email - user email not found for withdrawal ${
            withdrawal.id
          }. User ID: ${user?.id || 'unknown'}`,
        );
        return false;
      }

      // Get email template
      const template = this.templateService.getWithdrawalCompletedTemplate({
        userName: user.first_name || user.full_name || 'User',
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        transactionRef: withdrawal.transaction_reference,
        date:
          withdrawal.processed_at?.toISOString() || new Date().toISOString(),
      });

      // Send email
      await this.emailService.sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: process.env.EMAIL_FROM || 'noreply@rambini.com',
        replyTo: process.env.EMAIL_REPLY_TO || 'support@rambini.com',
      });

      this.logger.log(
        `Withdrawal completed email sent successfully to user ${user.id} for withdrawal ${withdrawal.id}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send withdrawal completed email to user ${user.id} for withdrawal ${withdrawal.id}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Send withdrawal failed email to user
   */
  async sendWithdrawalFailedEmail(
    withdrawal: Withdrawal,
    user: User,
  ): Promise<boolean> {
    try {
      this.logger.log(
        `Sending withdrawal failed email to user ${user.id} for withdrawal ${withdrawal.id}`,
      );

      // Validate user email
      if (!user || !user.email) {
        this.logger.warn(
          `Cannot send email - user email not found for withdrawal ${
            withdrawal.id
          }. User ID: ${user?.id || 'unknown'}`,
        );
        return false;
      }

      // Get email template
      const template = this.templateService.getWithdrawalFailedTemplate({
        userName: user.first_name || user.full_name || 'User',
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        reason: withdrawal.admin_notes,
        date:
          withdrawal.processed_at?.toISOString() || new Date().toISOString(),
      });

      // Send email
      await this.emailService.sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: process.env.EMAIL_FROM || 'noreply@rambini.com',
        replyTo: process.env.EMAIL_REPLY_TO || 'support@rambini.com',
      });

      this.logger.log(
        `Withdrawal failed email sent successfully to user ${user.id} for withdrawal ${withdrawal.id}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send withdrawal failed email to user ${user.id} for withdrawal ${withdrawal.id}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Send withdrawal rejected email to user
   */
  async sendWithdrawalRejectedEmail(
    withdrawal: Withdrawal,
    user: User,
  ): Promise<boolean> {
    try {
      this.logger.log(
        `Sending withdrawal rejected email to user ${user.id} for withdrawal ${withdrawal.id}`,
      );

      // Validate user email
      if (!user || !user.email) {
        this.logger.warn(
          `Cannot send email - user email not found for withdrawal ${
            withdrawal.id
          }. User ID: ${user?.id || 'unknown'}`,
        );
        return false;
      }

      // Get email template
      const template = this.templateService.getWithdrawalRejectedTemplate({
        userName: user.first_name || user.full_name || 'User',
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        reason: withdrawal.admin_notes,
        date:
          withdrawal.processed_at?.toISOString() || new Date().toISOString(),
      });

      // Send email
      await this.emailService.sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: process.env.EMAIL_FROM || 'noreply@rambini.com',
        replyTo: process.env.EMAIL_REPLY_TO || 'support@rambini.com',
      });

      this.logger.log(
        `Withdrawal rejected email sent successfully to user ${user.id} for withdrawal ${withdrawal.id}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send withdrawal rejected email to user ${user.id} for withdrawal ${withdrawal.id}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }
}
