// src/modules/user/services/user-otp.service.ts
import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { OTPService } from '@/modules/auth/services/otp.service';
import { EmailNotificationService } from '@/modules/notification/services/email-notification.service';

@Injectable()
export class UserOTPService {
  private readonly logger = new Logger(UserOTPService.name);

  constructor(
    private readonly otpService: OTPService,
    private readonly emailNotificationService: EmailNotificationService,
  ) {}

  async generateOTP(email: string): Promise<{ otpId: string }> {
    const { otpId, otpCode } = await this.otpService.generateEmailOTP(
      email,
      'password_reset',
    );

    await this.sendOTPEmail(email, otpCode);

    return { otpId };
  }

  private async sendOTPEmail(email: string, otpCode: string): Promise<void> {
    const emailData = {
      to: email,
      subject: 'Your OTP Code - Rambini',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; margin-bottom: 20px;">Your OTP Code</h2>
            <p>You requested an OTP code for your Rambini account.</p>
            <p>Your OTP code is:</p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; display: inline-block;">
                ${otpCode}
              </div>
            </div>
            <p>Enter this code to complete your request.</p>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
            </p>
          </div>
        </div>
      `,
      text: `Your OTP Code\n\nYou requested an OTP code for your Rambini account.\n\nYour OTP code is: ${otpCode}\n\nEnter this code to complete your request.\n\nThis code will expire in 10 minutes. If you didn't request this code, please ignore this email.`,
    };

    try {
      await this.emailNotificationService.sendEmail(emailData);
      this.logger.log(`OTP email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}:`, error.message);
      throw new BadRequestException('Failed to send OTP email');
    }
  }
}