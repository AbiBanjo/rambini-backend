// src/modules/notification/services/withdrawal-email-templates.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { WithdrawalStatus, Currency, Country } from '@/entities';

export interface WithdrawalEmailTemplate {
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class WithdrawalEmailTemplatesService {
  private readonly logger = new Logger(WithdrawalEmailTemplatesService.name);

  /**
   * Get email template for withdrawal OTP (sent to user)
   */
  // Add to withdrawal-email-templates.service.ts

  getWithdrawalOTPTemplate(data: {
    userName: string;
    otpCode: string;
    expiryMinutes: number;
  }): WithdrawalEmailTemplate {
    this.logger.log(`[TEMPLATE] ========================================`);
    this.logger.log(`[TEMPLATE] Generating withdrawal OTP template`);
    this.logger.log(`[TEMPLATE] Input data:`, {
      userName: data.userName,
      otpCode: data.otpCode,
      otpLength: data.otpCode?.length,
      otpType: typeof data.otpCode,
      expiryMinutes: data.expiryMinutes,
    });

    // Validate input data
    if (!data.otpCode) {
      this.logger.error(`[TEMPLATE] ❌ No OTP code provided!`);
    } else if (data.otpCode.length !== 6) {
      this.logger.error(
        `[TEMPLATE] ❌ OTP is not 6 digits! Length: ${data.otpCode.length}, Value: "${data.otpCode}"`,
      );
    } else if (!/^\d{6}$/.test(data.otpCode)) {
      this.logger.error(
        `[TEMPLATE] ❌ OTP is not all digits! Value: "${data.otpCode}"`,
      );
    } else {
      this.logger.log(`[TEMPLATE] ✓ OTP validation passed: "${data.otpCode}"`);
    }

    const subject = `Withdrawal Verification Code - ${data.otpCode}`;
    this.logger.log(`[TEMPLATE] Generated subject: ${subject}`);

    // Build HTML template with the OTP
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">🔐 Withdrawal Verification</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 18px; margin: 0 0 20px 0;">Hello <strong>${data.userName}</strong>,</p>
        <p>You have requested to withdraw funds from your wallet. Please use the verification code below to complete your withdrawal request.</p>
        
        <div style="background: white; padding: 30px; border-radius: 8px; margin: 30px 0; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">Your Verification Code</p>
          <h1 style="color: #667eea; font-size: 48px; margin: 0; letter-spacing: 8px; font-weight: bold;">${data.otpCode}</h1>
          <p style="color: #dc3545; margin: 15px 0 0 0; font-size: 14px; font-weight: bold;">Valid for ${data.expiryMinutes} minutes</p>
        </div>

        <div style="background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0; font-size: 14px;"><strong>⚠️ Security Notice:</strong></p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px;">
            <li>Do not share this code with anyone</li>
            <li>This code will expire in ${data.expiryMinutes} minutes</li>
            <li>If you didn't request this withdrawal, please contact support immediately</li>
          </ul>
        </div>

        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
          Need help? Contact our support team at <a href="mailto:support@rambini.com" style="color: #667eea;">support@rambini.com</a>
        </p>
      </div>
    </div>
  `;

    const text = `
    Withdrawal Verification Code - ${data.otpCode}
    
    Hello ${data.userName},
    
    You have requested to withdraw funds from your wallet. Please use the verification code below to complete your withdrawal request.
    
    Verification Code: ${data.otpCode}
    Valid for: ${data.expiryMinutes} minutes
    
    Security Notice:
    - Do not share this code with anyone
    - This code will expire in ${data.expiryMinutes} minutes
    - If you didn't request this withdrawal, please contact support immediately
    
    Need help? Contact our support team at support@rambini.com
  `;

    // Verify OTP is in the generated templates
    const subjectHasOTP = subject.includes(data.otpCode);
    const htmlHasOTP = html.includes(data.otpCode);
    const textHasOTP = text.includes(data.otpCode);

    this.logger.log(`[TEMPLATE] Subject contains OTP: ${subjectHasOTP}`);
    this.logger.log(`[TEMPLATE] HTML contains OTP: ${htmlHasOTP}`);
    this.logger.log(`[TEMPLATE] Text contains OTP: ${textHasOTP}`);

    if (!htmlHasOTP) {
      this.logger.error(
        `[TEMPLATE] ❌ CRITICAL: Generated HTML does not contain OTP "${data.otpCode}"!`,
      );
      this.logger.error(`[TEMPLATE] This is a template generation bug!`);
    }

    // Count OTP occurrences
    const htmlOtpCount = (html.match(new RegExp(data.otpCode, 'g')) || [])
      .length;
    const textOtpCount = (text.match(new RegExp(data.otpCode, 'g')) || [])
      .length;

    this.logger.log(`[TEMPLATE] OTP appears ${htmlOtpCount} times in HTML`);
    this.logger.log(`[TEMPLATE] OTP appears ${textOtpCount} times in text`);
    this.logger.log(`[TEMPLATE] Template generation complete`);
    this.logger.log(`[TEMPLATE] ========================================`);

    return {
      subject,
      html,
      text,
    };
  }

  /**
   * Get email template for withdrawal request notification to admin
   */
  getAdminWithdrawalRequestTemplate(data: {
    withdrawalId: string;
    userName: string;
    userEmail: string;
    amount: number;
    currency: Currency;
    country: Country;
    bankName: string;
    accountNumber: string;
    accountName?: string;
    routingNumber?: string;
    sortCode?: string;
    accountType?: string;
    date: string;
    baseUrl: string;
  }): WithdrawalEmailTemplate {
    return {
      subject: `New Withdrawal Request - ${data.amount} ${data.currency}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc3545; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🔔 New Withdrawal Request</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 18px; margin: 0 0 20px 0;">Hello <strong>Admin</strong>,</p>
            <p>A new withdrawal request has been submitted and requires your attention.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="margin: 0 0 15px 0; color: #333;">👤 User Information</h3>
              <p><strong>Name:</strong> ${data.userName}</p>
              <p><strong>Email:</strong> ${data.userEmail}</p>
              <p><strong>Request ID:</strong> ${data.withdrawalId}</p>
              <p><strong>Date:</strong> ${new Date(
                data.date,
              ).toLocaleString()}</p>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="margin: 0 0 15px 0; color: #333;">💰 Withdrawal Details</h3>
              <p style="font-size: 24px; margin: 15px 0;"><strong>Amount:</strong> <span style="color: #dc3545;">${
                data.currency
              } ${data.amount.toFixed(2)}</span></p>
              <p><strong>Country:</strong> ${data.country}</p>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="margin: 0 0 15px 0; color: #333;">🏦 Bank Details</h3>
              <p><strong>Bank Name:</strong> ${data.bankName}</p>
              <p><strong>Account Number:</strong> ${data.accountNumber}</p>
              ${
                data.accountName
                  ? `<p><strong>Account Name:</strong> ${data.accountName}</p>`
                  : ''
              }
              ${
                data.routingNumber
                  ? `<p><strong>Routing Number:</strong> ${data.routingNumber}</p>`
                  : ''
              }
              ${
                data.sortCode
                  ? `<p><strong>Sort Code:</strong> ${data.sortCode}</p>`
                  : ''
              }
              ${
                data.accountType
                  ? `<p><strong>Account Type:</strong> ${data.accountType}</p>`
                  : ''
              }
            </div>

            <div style="background: #e9ecef; padding: 20px; border-radius: 4px; margin: 30px 0;">
              <h4 style="margin: 0 0 15px 0; color: #333;">⚡ Admin Actions</h4>
              <p style="margin-bottom: 15px;">Use the following links to process this withdrawal request:</p>
              <div style="text-align: center;">
                <a href="${data.baseUrl}/admin/withdrawal/${
        data.withdrawalId
      }/done" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 5px; display: inline-block;">✅ Mark as Done</a>
                <a href="${data.baseUrl}/admin/withdrawal/${
        data.withdrawalId
      }/failed" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 5px; display: inline-block;">❌ Mark as Failed</a>
                <a href="${data.baseUrl}/admin/withdrawal/${
        data.withdrawalId
      }/rejected" style="background: #ffc107; color: black; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 5px; display: inline-block;">🚫 Mark as Rejected</a>
              </div>
            </div>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #dc3545; font-size: 14px; font-weight: bold; text-align: center;">
              ⚠️ Please review and process this request promptly
            </p>
          </div>
        </div>
      `,
      text: `
        New Withdrawal Request - ${data.amount} ${data.currency}
        
        Hello Admin,
        
        A new withdrawal request has been submitted and requires your attention.
        
        User Information:
        - Name: ${data.userName}
        - Email: ${data.userEmail}
        - Request ID: ${data.withdrawalId}
        - Date: ${new Date(data.date).toLocaleString()}
        
        Withdrawal Details:
        - Amount: ${data.currency} ${data.amount.toFixed(2)}
        - Country: ${data.country}
        
        Bank Details:
        - Bank Name: ${data.bankName}
        - Account Number: ${data.accountNumber}
        ${data.accountName ? `- Account Name: ${data.accountName}` : ''}
        ${data.routingNumber ? `- Routing Number: ${data.routingNumber}` : ''}
        ${data.sortCode ? `- Sort Code: ${data.sortCode}` : ''}
        ${data.accountType ? `- Account Type: ${data.accountType}` : ''}
        
        Admin Actions:
        Mark as Done: ${data.baseUrl}/admin/withdrawal/${data.withdrawalId}/done
        Mark as Failed: ${data.baseUrl}/admin/withdrawal/${
        data.withdrawalId
      }/failed
        Mark as Rejected: ${data.baseUrl}/admin/withdrawal/${
        data.withdrawalId
      }/rejected
        
        Please review and process this request promptly.
      `,
    };
  }

  /**
   * Get email template for withdrawal completed notification
   */
  getWithdrawalCompletedTemplate(data: {
    userName: string;
    amount: number;
    currency: Currency;
    transactionRef?: string;
    date: string;
  }): WithdrawalEmailTemplate {
    return {
      subject: `✅ Withdrawal Completed - ${
        data.currency
      } ${data.amount.toFixed(2)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #28a745; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">✅ Withdrawal Completed!</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 18px; margin: 0 0 20px 0;">Hello <strong>${
              data.userName
            }</strong>,</p>
            <p>Great news! Your withdrawal request has been completed successfully!</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="margin: 0 0 15px 0; color: #333;">💰 Transaction Details</h3>
              <p style="font-size: 24px; margin: 15px 0;"><strong>Amount:</strong> <span style="color: #28a745;">${
                data.currency
              } ${data.amount.toFixed(2)}</span></p>
              <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">✅ Completed</span></p>
              ${
                data.transactionRef
                  ? `<p><strong>Transaction Reference:</strong> ${data.transactionRef}</p>`
                  : ''
              }
              <p><strong>Date:</strong> ${new Date(
                data.date,
              ).toLocaleString()}</p>
            </div>

            <div style="background: #d4edda; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #28a745;">
              <p style="margin: 0; font-size: 14px;"><strong>✨ What's Next?</strong></p>
              <p style="margin: 10px 0 0 0; font-size: 14px;">The funds should be available in your bank account within 1-3 business days, depending on your bank's processing time.</p>
            </div>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; text-align: center;">
              Thank you for using Rambini! 🎉
            </p>
          </div>
        </div>
      `,
      text: `
        Withdrawal Completed - ${data.currency} ${data.amount.toFixed(2)}
        
        Hello ${data.userName},
        
        Great news! Your withdrawal request has been completed successfully!
        
        Transaction Details:
        - Amount: ${data.currency} ${data.amount.toFixed(2)}
        - Status: Completed
        ${
          data.transactionRef
            ? `- Transaction Reference: ${data.transactionRef}`
            : ''
        }
        - Date: ${new Date(data.date).toLocaleString()}
        
        What's Next?
        The funds should be available in your bank account within 1-3 business days, depending on your bank's processing time.
        
        Thank you for using Rambini!
      `,
    };
  }

  /**
   * Get email template for withdrawal failed notification
   */
  getWithdrawalFailedTemplate(data: {
    userName: string;
    amount: number;
    currency: Currency;
    reason?: string;
    date: string;
  }): WithdrawalEmailTemplate {
    return {
      subject: `❌ Withdrawal Failed - ${data.currency} ${data.amount.toFixed(
        2,
      )}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc3545; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">❌ Withdrawal Failed</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 18px; margin: 0 0 20px 0;">Hello <strong>${
              data.userName
            }</strong>,</p>
            <p>Unfortunately, your withdrawal request could not be processed at this time.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="margin: 0 0 15px 0; color: #333;">💰 Transaction Details</h3>
              <p style="font-size: 24px; margin: 15px 0;"><strong>Amount:</strong> <span style="color: #dc3545;">${
                data.currency
              } ${data.amount.toFixed(2)}</span></p>
              <p><strong>Status:</strong> <span style="color: #dc3545; font-weight: bold;">❌ Failed</span></p>
              ${
                data.reason
                  ? `<p><strong>Reason:</strong> ${data.reason}</p>`
                  : ''
              }
              <p><strong>Date:</strong> ${new Date(
                data.date,
              ).toLocaleString()}</p>
            </div>

            <div style="background: #f8d7da; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <p style="margin: 0; font-size: 14px;"><strong>🔄 What Happens Now?</strong></p>
              <p style="margin: 10px 0 0 0; font-size: 14px;">Your funds have been returned to your wallet. You can try submitting a new withdrawal request or contact our support team if you need assistance.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${
                process.env.APP_URL || 'https://rambini.com'
              }/wallet" style="background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">View Wallet</a>
            </div>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
              Need help? Contact our support team at <a href="mailto:support@rambini.com" style="color: #667eea;">support@rambini.com</a>
            </p>
          </div>
        </div>
      `,
      text: `
        Withdrawal Failed - ${data.currency} ${data.amount.toFixed(2)}
        
        Hello ${data.userName},
        
        Unfortunately, your withdrawal request could not be processed at this time.
        
        Transaction Details:
        - Amount: ${data.currency} ${data.amount.toFixed(2)}
        - Status: Failed
        ${data.reason ? `- Reason: ${data.reason}` : ''}
        - Date: ${new Date(data.date).toLocaleString()}
        
        What Happens Now?
        Your funds have been returned to your wallet. You can try submitting a new withdrawal request or contact our support team if you need assistance.
        
        View your wallet: ${process.env.APP_URL || 'https://rambini.com'}/wallet
        
        Need help? Contact our support team at support@rambini.com
      `,
    };
  }

  /**
   * Get email template for withdrawal rejected notification
   */
  getWithdrawalRejectedTemplate(data: {
    userName: string;
    amount: number;
    currency: Currency;
    reason?: string;
    date: string;
  }): WithdrawalEmailTemplate {
    return {
      subject: `🚫 Withdrawal Rejected - ${data.currency} ${data.amount.toFixed(
        2,
      )}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #ffc107; color: #000; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🚫 Withdrawal Rejected</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 18px; margin: 0 0 20px 0;">Hello <strong>${
              data.userName
            }</strong>,</p>
            <p>Your withdrawal request has been reviewed and rejected by our team.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="margin: 0 0 15px 0; color: #333;">💰 Transaction Details</h3>
              <p style="font-size: 24px; margin: 15px 0;"><strong>Amount:</strong> <span style="color: #ffc107;">${
                data.currency
              } ${data.amount.toFixed(2)}</span></p>
              <p><strong>Status:</strong> <span style="color: #ffc107; font-weight: bold;">🚫 Rejected</span></p>
              ${
                data.reason
                  ? `<p><strong>Reason:</strong> ${data.reason}</p>`
                  : ''
              }
              <p><strong>Date:</strong> ${new Date(
                data.date,
              ).toLocaleString()}</p>
            </div>

            <div style="background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p style="margin: 0; font-size: 14px;"><strong>⚠️ Important Information</strong></p>
              <p style="margin: 10px 0 0 0; font-size: 14px;">Your funds have been returned to your wallet. Please review the reason for rejection and ensure all information is correct before submitting a new request. If you have any questions, please contact our support team.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${
                process.env.APP_URL || 'https://rambini.com'
              }/wallet" style="background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">View Wallet</a>
            </div>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
              Need help? Contact our support team at <a href="mailto:support@rambini.com" style="color: #667eea;">support@rambini.com</a>
            </p>
          </div>
        </div>
      `,
      text: `
        Withdrawal Rejected - ${data.currency} ${data.amount.toFixed(2)}
        
        Hello ${data.userName},
        
        Your withdrawal request has been reviewed and rejected by our team.
        
        Transaction Details:
        - Amount: ${data.currency} ${data.amount.toFixed(2)}
        - Status: Rejected
        ${data.reason ? `- Reason: ${data.reason}` : ''}
        - Date: ${new Date(data.date).toLocaleString()}
        
        Important Information:
        Your funds have been returned to your wallet. Please review the reason for rejection and ensure all information is correct before submitting a new request. If you have any questions, please contact our support team.
        
        View your wallet: ${process.env.APP_URL || 'https://rambini.com'}/wallet
        
        Need help? Contact our support team at support@rambini.com
      `,
    };
  }
}
