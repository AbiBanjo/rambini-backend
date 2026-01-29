import { IsString, IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ResendVerificationEmailDto {
  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com'
  })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim()) // ✅ ADD THIS LINE
  email: string;

  @ApiProperty({
    description: 'OTP ID from previous registration or resend attempt (optional)',
    example: 'abc123def456...',
    required: false
  })
  @IsString()
  otpId?: string;
}
