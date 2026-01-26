import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

export interface VerifyOTPResult {
  isValid: boolean;
  status?: string;
  error?: string;
  phoneNumber?: string;
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

    // Validate Twilio credentials
    const isValidAccountSid = this.isValidAccountSid(accountSid);
    const isValidAuthToken = this.isValidAuthToken(authToken);
    const isValidVerifyServiceSid = this.isValidVerifyServiceSid(verifyServiceSid);

    this.isEnabled = !!(isValidAccountSid && isValidAuthToken && isValidVerifyServiceSid);

    if (this.isEnabled) {
      try {
        this.twilioClient = new Twilio(accountSid, authToken);
        this.verifyServiceSid = verifyServiceSid;
        this.logger.log('✅ Twilio Verify service initialized successfully');
        this.logger.log(`   Account SID: ${accountSid.substring(0, 10)}...${accountSid.slice(-4)}`);
        this.logger.log(`   Verify Service SID: ${verifyServiceSid.substring(0, 10)}...${verifyServiceSid.slice(-4)}`);
        this.logger.log(`   🚀 Production mode: Real SMS will be sent`);
      } catch (error) {
        this.logger.error('❌ Twilio Verify initialization failed:', error.message);
        throw error;
      }
    } else {
      this.logConfigurationErrors(accountSid, authToken, verifyServiceSid);
    }
  }

  /**
   * Validate Account SID format
   */
  private isValidAccountSid(sid: string | undefined): boolean {
    if (!sid) return false;
    if (sid === 'your_actual_account_sid') return false;
    if (!sid.startsWith('AC')) return false;
    if (sid.length !== 34) return false;
    return true;
  }

  /**
   * Validate Auth Token format
   */
  private isValidAuthToken(token: string | undefined): boolean {
    if (!token) return false;
    if (token === 'your_actual_auth_token') return false;
    if (token.length !== 32) return false;
    return true;
  }

  /**
   * Validate Verify Service SID format
   */
  private isValidVerifyServiceSid(sid: string | undefined): boolean {
    if (!sid) return false;
    if (sid === 'your_actual_verify_service_sid') return false;
    // Accept both VA (standard) and other formats (for custom setups)
    if (sid.startsWith('VA') && sid.length === 34) return true;
    // Allow other SID formats but they must be at least 20 chars
    if (sid.length >= 20) return true;
    return false;
  }

  /**
   * Log detailed configuration errors
   */
  private logConfigurationErrors(
    accountSid: string | undefined,
    authToken: string | undefined,
    verifyServiceSid: string | undefined
  ): void {
    this.logger.error('❌ Twilio Verify is NOT configured for production use!');
    this.logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const issues: string[] = [];

    // Account SID validation
    if (!accountSid) {
      issues.push('❌ TWILIO_ACCOUNT_SID is missing');
    } else if (accountSid === 'your_actual_account_sid') {
      issues.push('❌ TWILIO_ACCOUNT_SID still has placeholder value');
    } else if (!accountSid.startsWith('AC')) {
      issues.push(`❌ TWILIO_ACCOUNT_SID should start with "AC" (got: ${accountSid.substring(0, 5)}...)`);
    } else if (accountSid.length !== 34) {
      issues.push(`❌ TWILIO_ACCOUNT_SID should be 34 characters (got: ${accountSid.length})`);
    }

    // Auth Token validation
    if (!authToken) {
      issues.push('❌ TWILIO_AUTH_TOKEN is missing');
    } else if (authToken === 'your_actual_auth_token') {
      issues.push('❌ TWILIO_AUTH_TOKEN still has placeholder value');
    } else if (authToken.length !== 32) {
      issues.push(`❌ TWILIO_AUTH_TOKEN should be 32 characters (got: ${authToken.length})`);
    }

    // Verify Service SID validation
    if (!verifyServiceSid) {
      issues.push('❌ TWILIO_VERIFY_SERVICE_SID is missing');
    } else if (verifyServiceSid === 'your_actual_verify_service_sid') {
      issues.push('❌ TWILIO_VERIFY_SERVICE_SID still has placeholder value');
    } else if (!verifyServiceSid.startsWith('VA') && verifyServiceSid.length < 20) {
      issues.push(`❌ TWILIO_VERIFY_SERVICE_SID format is invalid (got: ${verifyServiceSid.substring(0, 5)}...)`);
      issues.push(`   Standard format starts with "VA" (34 chars)`);
    } else if (!verifyServiceSid.startsWith('VA')) {
      this.logger.warn(`⚠️  TWILIO_VERIFY_SERVICE_SID doesn't start with "VA" (got: ${verifyServiceSid.substring(0, 5)}...)`);
      this.logger.warn(`   This might work but is non-standard. Verify it's correct.`);
    }

    issues.forEach(issue => this.logger.error(issue));

    this.logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.error('📝 To fix this:');
    this.logger.error('1. Go to https://console.twilio.com/us1/develop/verify/services');
    this.logger.error('2. Create or select a Verify Service');
    this.logger.error('3. Copy the Service SID (starts with VA)');
    this.logger.error('4. Update your .env file with the correct value');
    this.logger.error('5. Restart your application with: pm2 restart <app> --update-env');
    this.logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.warn('⚠️  Running in DEV MODE - OTPs will NOT be sent!');
    this.logger.warn('⚠️  Use OTP code: 123456 for testing');
  }

  /**
   * Send OTP to phone number using Twilio Verify API
   */
  async sendOTP(phoneNumber: string, channel: 'sms' | 'call' = 'sms'): Promise<SendOTPResult> {
    // DEV MODE fallback
    if (!this.isEnabled) {
      this.logger.warn(`⚠️  [DEV MODE] OTP would be sent to ${phoneNumber} via ${channel}`);
      this.logger.warn(`⚠️  [DEV MODE] Use OTP: 123456 for testing`);
      return {
        success: true,
        to: phoneNumber,
        channel,
        sid: 'dev-mode-sid'
      };
    }

    // Validate phone number format
    if (!phoneNumber.startsWith('+')) {
      throw new BadRequestException('Phone number must be in E.164 format (e.g., +2348012345678)');
    }

    try {
      this.logger.log(`📤 Sending OTP to ${phoneNumber} via ${channel}...`);

      const verification = await this.twilioClient.verify.v2
        .services(this.verifyServiceSid)
        .verifications
        .create({
          to: phoneNumber,
          channel: channel
        });

      this.logger.log(`✅ OTP sent successfully to ${phoneNumber}`);
      this.logger.log(`   SID: ${verification.sid}`);
      this.logger.log(`   Status: ${verification.status}`);
      this.logger.log(`   Channel: ${verification.channel}`);

      return {
        success: true,
        sid: verification.sid,
        to: phoneNumber,
        channel: verification.channel
      };
    } catch (error: any) {
      this.logger.error('❌ Error sending OTP via Twilio Verify');
      this.logger.error(`   Message: ${error.message}`);
      this.logger.error(`   Code: ${error.code || 'N/A'}`);

      // Handle specific Twilio error codes
      if (error.code === 60200) {
        throw new BadRequestException('Invalid phone number format. Use E.164 format (e.g., +2348012345678)');
      }

      if (error.code === 60203) {
        throw new BadRequestException('Too many OTP requests. Please try again later.');
      }

      if (error.code === 60202) {
        throw new BadRequestException('Too many verification attempts. Please request a new OTP.');
      }

      if (error.code === 20003) {
        this.logger.error('   Authentication failed - check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
        throw new BadRequestException('SMS service temporarily unavailable. Please contact support.');
      }

      if (error.code === 20404) {
        this.logger.error('   Verify Service not found - check TWILIO_VERIFY_SERVICE_SID');
        throw new BadRequestException('SMS service configuration error. Please contact support.');
      }

      if (error.code === 21608) {
        this.logger.error('   Phone number is unverified. Add it to Verified Caller IDs in Twilio Console');
        throw new BadRequestException('Cannot send SMS to this number. Please contact support.');
      }

      // Log full error details for debugging
      this.logger.error('   Full error details:', {
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo,
      });

      throw new BadRequestException(error.message || 'Failed to send OTP. Please try again later.');
    }
  }

  /**
   * Verify OTP code using Twilio Verify API
   */
  async verifyOTP(phoneNumber: string, otpCode: string): Promise<VerifyOTPResult> {
    // DEV MODE fallback
    if (!this.isEnabled) {
      this.logger.warn(`⚠️  [DEV MODE] Verifying OTP for ${phoneNumber}`);
      if (otpCode === '123456') {
        this.logger.log(`✅ [DEV MODE] OTP verification successful`);
        return {
          isValid: true,
          status: 'approved',
          phoneNumber
        };
      }
      this.logger.warn(`❌ [DEV MODE] Invalid OTP. Use 123456 for testing`);
      return {
        isValid: false,
        error: 'Invalid OTP code',
        phoneNumber
      };
    }

    // Validate phone number format
    if (!phoneNumber.startsWith('+')) {
      throw new BadRequestException('Phone number must be in E.164 format (e.g., +2348012345678)');
    }

    try {
      this.logger.log(`🔐 Verifying OTP for ${phoneNumber}...`);

      const verificationCheck = await this.twilioClient.verify.v2
        .services(this.verifyServiceSid)
        .verificationChecks
        .create({
          to: phoneNumber,
          code: otpCode
        });

      const isValid = verificationCheck.status === 'approved';

      if (isValid) {
        this.logger.log(`✅ OTP successfully verified for ${phoneNumber}`);
      } else {
        this.logger.warn(`❌ OTP verification failed: ${verificationCheck.status}`);
      }

      return {
        isValid,
        status: verificationCheck.status,
        phoneNumber
      };
    } catch (error: any) {
      this.logger.error('❌ Error verifying OTP');
      this.logger.error(`   Message: ${error.message}`);
      this.logger.error(`   Code: ${error.code || 'N/A'}`);

      // Handle specific error codes
      if (error.code === 60200) {
        return {
          isValid: false,
          error: 'Invalid phone number format',
          phoneNumber
        };
      }

      if (error.code === 60202) {
        return {
          isValid: false,
          error: 'Max verification attempts reached. Please request a new OTP.',
          phoneNumber
        };
      }

      if (error.code === 60023) {
        return {
          isValid: false,
          error: 'No pending verification found. Please request a new OTP.',
          phoneNumber
        };
      }

      return {
        isValid: false,
        error: error.message || 'Failed to verify OTP',
        phoneNumber
      };
    }
  }

  /**
   * Check if service is enabled and configured
   */
  isServiceEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get service configuration status
   */
  getServiceStatus(): {
    isEnabled: boolean;
    mode: 'production' | 'development';
    message: string;
  } {
    if (this.isEnabled) {
      return {
        isEnabled: true,
        mode: 'production',
        message: 'Twilio Verify is configured and ready to send SMS'
      };
    }

    return {
      isEnabled: false,
      mode: 'development',
      message: 'Running in DEV MODE. Configure Twilio credentials to send real SMS.'
    };
  }
}