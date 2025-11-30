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
    this.appUrl = this.configService.get<string>('APP_URL') || 'https://rambini.com';
    this.adminEmail = this.configService.get<string>('ADMIN_EMAIL') || 'info@bankfields.com';
  }

  /**
   * Send withdrawal OTP email to user
   */
  async sendWithdrawalOTPEmail(
    user: User,
    otpCode: string,
    expiryMinutes: number = 10,
  ): Promise<boolean> {
    try {
      this.logger.log(`Sending withdrawal OTP email to user ${user.id}`);

      // Validate user email
      if (!user || !user.email) {
        this.logger.warn(`Cannot send OTP email - user email not found for user ${user?.id || 'unknown'}`);
        return false;
      }

      // Get email template
      const template = this.templateService.getWithdrawalOTPTemplate({
        userName: user.first_name || user.full_name || 'User',
        otpCode,
        expiryMinutes,
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

      this.logger.log(`Withdrawal OTP email sent successfully to user ${user.id}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send withdrawal OTP email to user ${user.id}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Send withdrawal request notification to admin
   */
  async sendWithdrawalRequestToAdmin(withdrawal: Withdrawal): Promise<boolean> {
    try {
      this.logger.log(`Sending withdrawal request notification to admin for withdrawal ${withdrawal.id}`);

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

      this.logger.log(`Withdrawal request notification sent to admin for withdrawal ${withdrawal.id}`);
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
  async sendWithdrawalCompletedEmail(withdrawal: Withdrawal, user: User): Promise<boolean> {
    try {
      this.logger.log(`Sending withdrawal completed email to user ${user.id} for withdrawal ${withdrawal.id}`);

      // Validate user email
      if (!user || !user.email) {
        this.logger.warn(
          `Cannot send email - user email not found for withdrawal ${withdrawal.id}. User ID: ${user?.id || 'unknown'}`,
        );
        return false;
      }

      // Get email template
      const template = this.templateService.getWithdrawalCompletedTemplate({
        userName: user.first_name || user.full_name || 'User',
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        transactionRef: withdrawal.transaction_reference,
        date: withdrawal.processed_at?.toISOString() || new Date().toISOString(),
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

      this.logger.log(`Withdrawal completed email sent successfully to user ${user.id} for withdrawal ${withdrawal.id}`);
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
  async sendWithdrawalFailedEmail(withdrawal: Withdrawal, user: User): Promise<boolean> {
    try {
      this.logger.log(`Sending withdrawal failed email to user ${user.id} for withdrawal ${withdrawal.id}`);

      // Validate user email
      if (!user || !user.email) {
        this.logger.warn(
          `Cannot send email - user email not found for withdrawal ${withdrawal.id}. User ID: ${user?.id || 'unknown'}`,
        );
        return false;
      }

      // Get email template
      const template = this.templateService.getWithdrawalFailedTemplate({
        userName: user.first_name || user.full_name || 'User',
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        reason: withdrawal.admin_notes,
        date: withdrawal.processed_at?.toISOString() || new Date().toISOString(),
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

      this.logger.log(`Withdrawal failed email sent successfully to user ${user.id} for withdrawal ${withdrawal.id}`);
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
  async sendWithdrawalRejectedEmail(withdrawal: Withdrawal, user: User): Promise<boolean> {
    try {
      this.logger.log(`Sending withdrawal rejected email to user ${user.id} for withdrawal ${withdrawal.id}`);

      // Validate user email
      if (!user || !user.email) {
        this.logger.warn(
          `Cannot send email - user email not found for withdrawal ${withdrawal.id}. User ID: ${user?.id || 'unknown'}`,
        );
        return false;
      }

      // Get email template
      const template = this.templateService.getWithdrawalRejectedTemplate({
        userName: user.first_name || user.full_name || 'User',
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        reason: withdrawal.admin_notes,
        date: withdrawal.processed_at?.toISOString() || new Date().toISOString(),
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

      this.logger.log(`Withdrawal rejected email sent successfully to user ${user.id} for withdrawal ${withdrawal.id}`);
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