import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SMSOptions {
  to: string;
  message: string;
  from?: string;
}

@Injectable()
export class SMSService {
  private readonly logger = new Logger(SMSService.name);
  private readonly twilioClient: any;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isEnabled = !!(
      this.configService.get('TWILIO_ACCOUNT_SID') &&
      this.configService.get('TWILIO_AUTH_TOKEN') &&
      this.configService.get('TWILIO_PHONE_NUMBER')
    );

    if (this.isEnabled) {
      try {
        // Dynamically import Twilio to avoid issues in development
        const twilio = require('twilio');
        this.twilioClient = twilio(
          this.configService.get('TWILIO_ACCOUNT_SID'),
          this.configService.get('TWILIO_AUTH_TOKEN')
        );
        this.logger.log('Twilio SMS service initialized');
      } catch (error) {
        this.logger.warn('Twilio not available, SMS service disabled');
        this.isEnabled = false;
      }
    } else {
      this.logger.warn('Twilio credentials not configured, SMS service disabled');
    }
  }

  async sendOTP(phoneNumber: string, otpCode: string): Promise<boolean> {
    const message = `Your Rambini verification code is: ${otpCode}. Valid for 10 minutes. Do not share this code with anyone.`;
    
    return this.sendSMS({
      to: phoneNumber,
      message,
    });
  }

  async sendSMS(options: SMSOptions): Promise<boolean> {
    if (!this.isEnabled) {
      this.logger.log(`SMS would be sent to ${options.to}: ${options.message}`);
      return true; // Simulate success in development
    }

    try {
      const from = options.from || this.configService.get('TWILIO_PHONE_NUMBER');
      
      const result = await this.twilioClient.messages.create({
        body: options.message,
        from,
        to: options.to,
      });

      this.logger.log(`SMS sent successfully to ${options.to}, SID: ${result.sid}`);
      return true;
    } catch (error) {
      // Check if it's a network/DNS error
      if (error.code === 'EAI_AGAIN' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        this.logger.warn(`Network issue connecting to Twilio. SMS not sent to ${options.to}. Using mock OTP for development.`);
        this.logger.warn(`OTP Code for ${options.to}: ${options.message.match(/\d{6}/)?.[0] || 'N/A'}`);
        return true; // Return true to not block authentication in development
      }
      
      // Log detailed error information
      const errorDetails = {
        message: error.message,
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo,
        to: options.to,
      };
      
      this.logger.error(`Failed to send SMS to ${options.to}:`, errorDetails);
      
      // Check if it's an authentication error
      if (error.message?.toLowerCase().includes('authenticate') || error.status === 401) {
        this.logger.error('Twilio authentication failed. Please verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are correct.');
        this.logger.error('For now, logging OTP for manual verification:');
        this.logger.warn(`OTP Code for ${options.to}: ${options.message.match(/\d{6}/)?.[0] || 'N/A'}`);
        // Return false to indicate failure, but log the OTP for manual use
        return false;
      }
      
      return false;
    }
  }

  async sendOrderUpdate(phoneNumber: string, orderNumber: string, status: string): Promise<boolean> {
    const message = `Your order #${orderNumber} status has been updated to: ${status}. Track your order on the Rambini app.`;
    
    return this.sendSMS({
      to: phoneNumber,
      message,
    });
  }

  async sendPaymentConfirmation(phoneNumber: string, amount: number, orderNumber: string): Promise<boolean> {
    const message = `Payment of ₦${amount} for order #${orderNumber} has been confirmed. Thank you for using Rambini!`;
    
    return this.sendSMS({
      to: phoneNumber,
      message,
    });
  }

  async sendDeliveryUpdate(phoneNumber: string, orderNumber: string, estimatedTime: string): Promise<boolean> {
    const message = `Your order #${orderNumber} is on its way! Estimated delivery time: ${estimatedTime}.`;
    
    return this.sendSMS({
      to: phoneNumber,
      message,
    });
  }

  isServiceEnabled(): boolean {
    return this.isEnabled;
  }
} 