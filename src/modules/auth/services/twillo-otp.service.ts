import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

export interface VerifyOTPResult {
  isValid: boolean;
  status?: string;
  error?: string;
}

export interface SendOTPResult {
  success: boolean;
  sid?: string;
  to?: string;
  channel?: string;
  error?: string;
}

@Injectable()
export class TwilioVerifyService {
  private readonly logger = new Logger(TwilioVerifyService.name);
  private readonly twilioClient: Twilio;
  private readonly verifyServiceSid: string;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get('TWILIO_AUTH_TOKEN');
    const verifyServiceSid = this.configService.get('TWILIO_VERIFY_SERVICE_SID');

    this.isEnabled = !!(accountSid && authToken && verifyServiceSid);

    if (this.isEnabled) {
      try {
        this.twilioClient = new Twilio(accountSid, authToken);
        this.verifyServiceSid = verifyServiceSid;
        this.logger.log('Twilio Verify service initialized successfully');
      } catch (error) {
        this.logger.error('Twilio Verify initialization failed:', error.message);
        this.isEnabled = false;
      }
    } else {
      this.logger.warn('Twilio Verify credentials not configured properly');
      this.logger.warn('Missing: ' + [
        !accountSid && 'TWILIO_ACCOUNT_SID',
        !authToken && 'TWILIO_AUTH_TOKEN',
        !verifyServiceSid && 'TWILIO_VERIFY_SERVICE_SID'
      ].filter(Boolean).join(', '));
    }
  }

  /**
   * Send OTP to phone number using Twilio Verify API
   */
  async sendOTP(phoneNumber: string, channel: 'sms' | 'call' = 'sms'): Promise<SendOTPResult> {
    if (!this.isEnabled) {
      this.logger.warn(`[DEV MODE] OTP would be sent to ${phoneNumber} via ${channel}`);
      this.logger.warn(`[DEV MODE] Use OTP: 123456 for testing`);
      return {
        success: true,
        to: phoneNumber,
        channel,
        sid: 'dev-mode-sid'
      };
    }

    try {
      // Validate phone number format (E.164)
      if (!phoneNumber.startsWith('+')) {
        throw new BadRequestException('Phone number must be in E.164 format (e.g., +2348012345678)');
      }

      const verification = await this.twilioClient.verify.v2
        .services(this.verifyServiceSid)
        .verifications
        .create({
          to: phoneNumber,
          channel: channel
        });

      this.logger.log(`OTP sent successfully to ${phoneNumber} via ${channel}, SID: ${verification.sid}`);
      this.logger.log(`Verification status: ${verification.status}`);

      return {
        success: true,
        sid: verification.sid,
        to: phoneNumber,
        channel: verification.channel
      };
    } catch (error) {
      this.logger.error('Error sending OTP via Twilio Verify:', error.message);
      
      // Handle specific error cases
      if (error.code === 60200) {
        this.logger.error('Invalid phone number format');
        throw new BadRequestException('Invalid phone number format. Use E.164 format (e.g., +2348012345678)');
      }
      
      if (error.code === 60203) {
        this.logger.error('Max send attempts reached for this phone number');
        throw new BadRequestException('Too many OTP requests. Please try again later.');
      }

      if (error.code === 60202) {
        this.logger.error('Max check attempts reached');
        throw new BadRequestException('Too many verification attempts. Please request a new OTP.');
      }

      // Log full error for debugging
      this.logger.error('Full error details:', {
        code: error.code,
        status: error.status,
        message: error.message,
        moreInfo: error.moreInfo,
      });

      // For development, return success but log the OTP
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn(`[DEV MODE] Failed to send OTP, use 123456 for testing`);
        return {
          success: true,
          to: phoneNumber,
          channel,
          sid: 'dev-mode-fallback-sid'
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to send OTP'
      };
    }
  }

  /**
   * Verify OTP code using Twilio Verify API
   */
  async verifyOTP(phoneNumber: string, otpCode: string): Promise<VerifyOTPResult> {
    if (!this.isEnabled) {
      this.logger.warn(`[DEV MODE] Verifying OTP for ${phoneNumber}`);
      // In development, accept 123456 as valid OTP
      if (otpCode === '123456') {
        this.logger.log(`[DEV MODE] OTP verification successful for ${phoneNumber}`);
        return {
          isValid: true,
          status: 'approved'
        };
      }
      this.logger.warn(`[DEV MODE] Invalid OTP code. Use 123456 for testing`);
      return {
        isValid: false,
        error: 'Invalid OTP code'
      };
    }

    try {
      // Validate phone number format (E.164)
      if (!phoneNumber.startsWith('+')) {
        throw new BadRequestException('Phone number must be in E.164 format (e.g., +2348012345678)');
      }

      const verificationCheck = await this.twilioClient.verify.v2
        .services(this.verifyServiceSid)
        .verificationChecks
        .create({
          to: phoneNumber,
          code: otpCode
        });

      this.logger.log(`OTP verification for ${phoneNumber}: ${verificationCheck.status}`);

      const isValid = verificationCheck.status === 'approved';

      if (isValid) {
        this.logger.log(`OTP successfully verified for ${phoneNumber}`);
      } else {
        this.logger.warn(`OTP verification failed for ${phoneNumber}: ${verificationCheck.status}`);
      }

      return {
        isValid,
        status: verificationCheck.status
      };
    } catch (error) {
      this.logger.error('Error verifying OTP:', error.message);

      // Handle specific error cases
      if (error.code === 60200) {
        return {
          isValid: false,
          error: 'Invalid phone number format'
        };
      }

      if (error.code === 60202) {
        return {
          isValid: false,
          error: 'Max verification attempts reached. Please request a new OTP.'
        };
      }

      if (error.code === 60023) {
        return {
          isValid: false,
          error: 'No pending verification found. Please request a new OTP.'
        };
      }

      // Log full error for debugging
      this.logger.error('Full error details:', {
        code: error.code,
        status: error.status,
        message: error.message,
        moreInfo: error.moreInfo,
      });

      // For development, provide helpful message
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn(`[DEV MODE] Verification failed, use 123456 for testing`);
      }

      return {
        isValid: false,
        error: error.message || 'Failed to verify OTP'
      };
    }
  }

  /**
   * Cancel a pending verification
   * Note: Twilio Verify API doesn't support canceling verifications directly.
   * Verifications expire automatically after 10 minutes.
   */
  async cancelVerification(phoneNumber: string): Promise<boolean> {
    if (!this.isEnabled) {
      this.logger.warn(`[DEV MODE] Would cancel verification for ${phoneNumber}`);
      return true;
    }

    this.logger.warn(
      `Twilio Verify API doesn't support canceling verifications. ` +
      `Verifications for ${phoneNumber} will expire automatically after 10 minutes.`
    );
    
    // Verifications expire automatically, so we return true
    // to indicate the operation completed (even though no action was taken)
    return true;
  }

  /**
   * Check if service is enabled and configured
   */
  isServiceEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get verification status
   * Note: Twilio Verify API doesn't support checking status of pending verifications.
   * You can only verify codes that were sent.
   */
  async getVerificationStatus(phoneNumber: string): Promise<string | null> {
    if (!this.isEnabled) {
      this.logger.warn(`[DEV MODE] Would check verification status for ${phoneNumber}`);
      return 'pending';
    }

    this.logger.warn(
      `Twilio Verify API doesn't support checking verification status directly. ` +
      `You can only verify codes using verifyOTP().`
    );
    
    return null;
  }
}