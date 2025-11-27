// src/modules/auth/dto/verify-profile-otp.dto.ts

import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyProfileOtpDto {
  @ApiProperty({ 
    description: 'Phone number in E.164 format',
    example: '+2347074425150' 
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ 
    description: '6-digit OTP code',
    example: '123456' 
  })
  @IsString()
  @IsNotEmpty()
  otpCode: string;
}

// ============================================================
// IMPORTANT: Export this in your dto/index.ts file
// ============================================================
// 
// Add this line to src/modules/auth/dto/index.ts:
// export * from './verify-profile-otp.dto';
//
// This ensures the DTO is properly imported in your controller
// ============================================================