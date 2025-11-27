import { Injectable, Logger, BadRequestException, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, AuthProvider } from '../../../entities';
import { OTPService } from './otp.service';
import { UserService } from '../../user/services/user.service';
import { EmailNotificationService } from '../../notification/services/email-notification.service';
import { ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto, ResendForgotPasswordDto } from '../dto';
import { ConfigService } from '@nestjs/config';
import { EmailTemplates } from '../helpers/email-templates';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userService: UserService,
    private readonly otpService: OTPService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly configService: ConfigService,
  ) {}

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ otpId: string; message: string }> {
    const { email } = forgotPasswordDto;

    // Find user by email
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new ForbiddenException("User with email does not exist");
    }

    if (user.auth_provider !== AuthProvider.LOCAL) {
      throw new ForbiddenException(
        `User is already registered with ${user.auth_provider} authentication. Please sign in using ${user.auth_provider}.`
      );
    }

    // Generate password reset OTP
    const { otpId, otpCode } = await this.otpService.generateEmailOTP(email, 'password_reset');

    // Send password reset email with OTP
    await this.sendPasswordResetEmail(user.email, otpCode);

    this.logger.log(`Password reset OTP generated for user: ${user.id}`);

    return {
      otpId,
      message: 'Password reset OTP has been sent'
    };
  }

  async resendForgotPasswordOTP(resendDto: ResendForgotPasswordDto): Promise<{ otpId: string; message: string }> {
    const { email, otpId } = resendDto;

    // Find user by email
    const user = await this.userService.findByEmail(email);
    if (!user) {
      // Security: Don't reveal if user exists
      const { otpId: newOtpId } = await this.otpService.generateEmailOTP(email, 'password_reset');
      return {
        otpId: newOtpId,
        message: 'If the email exists, a password reset OTP has been sent'
      };
    }

    // Check if user is using local authentication
    if (user.auth_provider !== AuthProvider.LOCAL) {
      throw new ForbiddenException(
        `User is already registered with ${user.auth_provider} authentication. Please sign in using ${user.auth_provider}.`
      );
    }

    let otpCode: string;
    let finalOtpId: string;

    if (otpId) {
      const resendResult = await this.otpService.resendEmailOTP(otpId, 'password_reset');
      if (resendResult) {
        otpCode = resendResult.otpCode;
        finalOtpId = otpId;
      } else {
        const newOtp = await this.otpService.generateEmailOTP(email, 'password_reset');
        otpCode = newOtp.otpCode;
        finalOtpId = newOtp.otpId;
      }
    } else {
      const newOtp = await this.otpService.generateEmailOTP(email, 'password_reset');
      otpCode = newOtp.otpCode;
      finalOtpId = newOtp.otpId;
    }

    await this.sendPasswordResetEmail(user.email, otpCode);

    this.logger.log(`Password reset OTP resent for user: ${user.id}`);

    return {
      otpId: finalOtpId,
      message: 'Password reset OTP has been sent'
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { email, otpId, otpCode, password } = resetPasswordDto;

    // Validate OTP
    const validation = await this.otpService.validateEmailOTP(otpId, otpCode, 'password_reset');

    if (!validation.isValid) {
      throw new BadRequestException(validation.error || 'Invalid or expired OTP');
    }

    if (validation.email !== email) {
      throw new BadRequestException('Email does not match the OTP');
    }

    // Find user by email
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(password);

    // Update password
    user.password = hashedPassword;
    await this.userRepository.save(user);

    this.logger.log(`Password reset for user: ${user.id}`);

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Find user
    const user = await this.userService.findById(userId);

    if (user.auth_provider !== AuthProvider.LOCAL) {
      throw new ForbiddenException(
        `User is already registered with ${user.auth_provider} authentication. Please sign in using ${user.auth_provider}.`
      );
    }

    // Check if user has a password set
    if (!user.password) {
      throw new BadRequestException('Password not set. Please use password reset.');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password
    user.password = hashedPassword;
    await this.userRepository.save(user);

    this.logger.log(`Password changed for user: ${user.id}`);

    return { message: 'Password changed successfully' };
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = this.configService.get<number>('security.bcryptRounds') || 12;
    return bcrypt.hash(password, saltRounds);
  }

  private async sendPasswordResetEmail(email: string, otpCode: string): Promise<void> {
    const emailData = {
      to: email,
      subject: 'Reset Your Password - Rambini',
      html: EmailTemplates.passwordReset(otpCode),
      text: `Reset Your Password\n\nYou requested to reset your password for your Rambini account.\n\nYour password reset code is: ${otpCode}\n\nEnter this code along with your new password to reset your account password.\n\nThis code will expire in 10 minutes. If you didn't request a password reset, please ignore this email.`,
    };

    try {
      await this.emailNotificationService.sendEmail(emailData);
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error.message);
      throw new BadRequestException('Failed to send password reset email');
    }
  }
}