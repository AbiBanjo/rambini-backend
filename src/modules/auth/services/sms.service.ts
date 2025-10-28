import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

export interface SMSOptions {
  to: string;
  message: string;
  from?: string;
}

@Injectable()
export class SMSService {
  private readonly logger = new Logger(SMSService.name);
  private readonly twilioClient: Twilio;
  private readonly twilioPhoneNumber: string;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get('TWILIO_AUTH_TOKEN');
    const phoneNumber = this.configService.get('TWILIO_PHONE_NUMBER');

    this.isEnabled = !!(accountSid && authToken && phoneNumber);

    if (this.isEnabled) {
      try {
        this.twilioClient = new Twilio(accountSid, authToken);
        this.twilioPhoneNumber = phoneNumber;
        this.logger.log('Twilio SMS service initialized successfully');
      } catch (error) {
        this.logger.error('Twilio initialization failed:', error.message);
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
      const from =  this.twilioPhoneNumber;
      
      const result = await this.twilioClient.messages.create({
        body: options.message,
        from,
        to: options.to,
      });

      this.logger.log(`SMS sent successfully to ${options.to}, SID: ${result.sid}`);
      return true;
    } catch (error) {
      // Log error details
      this.logger.error('Error sending SMS:', error.message);
      this.logger.error('Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo,
      });

      // Check if it's a network/DNS error
      if (error.code === 'EAI_AGAIN' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        this.logger.warn(`Network issue connecting to Twilio. SMS not sent to ${options.to}`);
        this.logger.warn(`OTP Code for ${options.to}: ${options.message.match(/\d{6}/)?.[0] || 'N/A'}`);
        return true; // Return true to not block authentication in development
      }
      
      // Check if it's an authentication error
      if (error.message?.toLowerCase().includes('authenticate') || error.status === 401) {
        this.logger.error('Twilio authentication failed. Please verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are correct.');
        this.logger.warn(`OTP Code for manual verification ${options.to}: ${options.message.match(/\d{6}/)?.[0] || 'N/A'}`);
        return false;
      }
      
      // Extract OTP for manual verification
      const otpMatch = options.message.match(/\d{6}/)?.[0];
      if (otpMatch) {
        this.logger.warn(`Manual OTP for ${options.to}: ${otpMatch}`);
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