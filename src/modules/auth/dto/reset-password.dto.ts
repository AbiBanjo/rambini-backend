import { IsString, IsNotEmpty, IsEmail, MinLength, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com'
  })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'OTP ID from forgot password response',
    example: 'abc123def456...'
  })
  @IsString()
  @IsNotEmpty()
  otpId: string;

  @ApiProperty({
    description: '6-digit OTP code',
    example: '123456',
    minLength: 6,
    maxLength: 6
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, {
    message: 'OTP code must be exactly 6 digits'
  })
  otpCode: string;

  @ApiProperty({
    description: 'New password (minimum 8 characters)',
    example: 'NewSecurePassword123!',
    minLength: 8
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, {
    message: 'Password must be at least 8 characters long'
  })
  password: string;
}

