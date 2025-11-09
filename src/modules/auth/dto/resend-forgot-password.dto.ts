import { IsString, IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendForgotPasswordDto {
  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com'
  })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'OTP ID from previous forgot password attempt (optional)',
    example: 'abc123def456...',
    required: false
  })
  @IsString()
  otpId?: string;
}

