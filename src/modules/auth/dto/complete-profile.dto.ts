import { IsString, IsNotEmpty, IsOptional, ValidateNested, IsBoolean, Length, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AddressDto {
  @ApiProperty({ example: '123 Main Street' })
  @IsString()
  @IsNotEmpty()
  address_line_1: string;

  @ApiPropertyOptional({ example: 'Apt 4B' })
  @IsString()
  @IsOptional()
  address_line_2?: string;

  @ApiProperty({ example: 'Lagos' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Lagos State' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: '100001' })
  @IsString()
  @IsNotEmpty()
  postal_code: string;

  @ApiProperty({ example: 6.5244 })
  @IsOptional()
  latitude?: number;

  @ApiProperty({ example: 3.3792 })
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  is_default?: boolean;
}

export class CompleteProfileDto {
  @ApiProperty({
    description: 'User first name',
    example: 'John'
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe'
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  // ✅ CHANGED: Phone number is now OPTIONAL
  @ApiPropertyOptional({
    description: 'Phone number in E.164 format (optional - can be added later in profile)',
    example: '+2348012345678',
    pattern: '^\\+[1-9]\\d{1,14}$'
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Invalid phone number format. Use E.164 format (e.g., +2348012345678)'
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'User country code (ISO 3166-1 alpha-2)',
    example: 'NG',
    required: false
  })
  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'Country must be exactly 2 characters' })
  @Matches(/^[A-Z]{2}$/, { message: 'Country must be a 2-letter uppercase ISO code (e.g., NG, US, UK)' })
  country?: string;

  // ✅ CHANGED: OTP ID is optional (only needed if phone is provided)
  @ApiPropertyOptional({ 
    description: 'OTP ID received from sending OTP to phone number (required only if phoneNumber is provided)',
    example: 'abc123-def456-ghi789'
  })
  @IsOptional()
  @IsString()
  otpId?: string;

  // ✅ CHANGED: OTP code is optional (only needed if phone is provided)
  @ApiPropertyOptional({ 
    description: 'OTP code sent to phone number (required only if phoneNumber is provided)',
    example: '123456'
  })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'OTP code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP code must be 6 digits' })
  otpCode?: string;

  @ApiPropertyOptional({
    description: 'User address information (optional)',
    type: AddressDto,
    required: false
  })
  @IsOptional()
  @Type(() => AddressDto)
  address?: AddressDto;
}