// src/modules/user/dto/phone-change.dto.ts
import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendPhoneChangeOTPDto {
  @ApiProperty({
    description: 'New phone number in E.164 format',
    example: '+2348012345678',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +2348012345678)',
  })
  phoneNumber: string;
}

export class ChangePhoneNumberDto {
  @ApiProperty({
    description: 'New phone number in E.164 format',
    example: '+2348012345678',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +2348012345678)',
  })
  newPhoneNumber: string;

  @ApiProperty({
    description: 'OTP ID received from send OTP request',
    example: 'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
  })
  @IsString()
  @IsNotEmpty()
  otpId: string;

  @ApiProperty({
    description: 'OTP code received via SMS',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  otpCode: string;
}

export class ResendPhoneChangeOTPDto {
  @ApiProperty({
    description: 'OTP ID from previous OTP request',
    example: 'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
  })
  @IsString()
  @IsNotEmpty()
  otpId: string;
}