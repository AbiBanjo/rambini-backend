export class EmailTemplates {
  static verification(otpCode: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h2 style="color: #333; margin-bottom: 20px;">Verify Your Email</h2>
          <p>Thank you for registering with Rambini!</p>
          <p>Your email verification code is:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; display: inline-block;">
              ${otpCode}
            </div>
          </div>
          <p>Enter this code in the app to verify your email address.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This code will expire in 10 minutes. If you didn't create an account, please ignore this email.
          </p>
        </div>
      </div>
    `;
  }

  static passwordReset(otpCode: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h2 style="color: #333; margin-bottom: 20px;">Reset Your Password</h2>
          <p>You requested to reset your password for your Rambini account.</p>
          <p>Your password reset code is:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; display: inline-block;">
              ${otpCode}
            </div>
          </div>
          <p>Enter this code along with your new password to reset your account password.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This code will expire in 10 minutes. If you didn't request a password reset, please ignore this email.
          </p>
        </div>
      </div>
    `;
  }
}