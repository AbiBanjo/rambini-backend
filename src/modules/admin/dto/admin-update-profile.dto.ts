// src/modules/admin/dto/admin-update-profile.dto.ts

import { IsOptional, IsString, IsPhoneNumber, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AddressType } from 'src/entities';

/**
 * DTO for admin to update user phone number
 */
export class AdminUpdatePhoneDto {
  @ApiProperty({
    description: 'New phone number for the user',
    example: '+2348012345678',
  })
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiProperty({
    description: 'Reason for admin phone update',
    example: 'User requested phone change via support ticket',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for admin to update user address
 */
export class AdminUpdateAddressDto {
  @ApiProperty({
    description: 'Primary address line',
    example: '123 Main Street',
    required: false,
  })
  @IsOptional()
  @IsString()
  address_line_1?: string;

  @ApiProperty({
    description: 'Secondary address line (apartment, suite, etc.)',
    example: 'Apt 4B',
    required: false,
  })
  @IsOptional()
  @IsString()
  address_line_2?: string;

  @ApiProperty({
    description: 'City',
    example: 'Lagos',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    description: 'State or province',
    example: 'Lagos',
    required: false,
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    description: 'Postal/ZIP code',
    example: '100001',
    required: false,
  })
  @IsOptional()
  @IsString()
  postal_code?: string;

  @ApiProperty({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'NG',
    required: false,
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: 6.5244,
    required: false,
  })
  @IsOptional()
  latitude?: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: 3.3792,
    required: false,
  })
  @IsOptional()
  longitude?: number;

  @ApiProperty({
    description: 'Address type',
    enum: AddressType,
    example: AddressType.HOME,
    required: false,
  })
  @IsOptional()
  @IsEnum(AddressType)
  address_type?: AddressType;

  @ApiProperty({
    description: 'Reason for admin address update',
    example: 'User reported incorrect address via support',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({
  description: 'Set as default address',
  example: false,
  required: false,
})
@IsOptional()
@IsBoolean()
is_default?: boolean;
}


/**
 * DTO for admin to update vendor business information
 */
export class AdminUpdateVendorDto {
  @ApiProperty({
    description: 'Business name',
    example: 'Delicious Foods Ltd',
    required: false,
  })
  @IsOptional()
  @IsString()
  business_name?: string;

  @ApiProperty({
    description: 'Business certificate number',
    example: 'RC123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  certificate_number?: string;

  @ApiProperty({
    description: 'Reason for admin vendor update',
    example: 'Correcting business registration details',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Response DTO for admin actions with audit trail
 */
export class AdminActionResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Phone number updated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Admin who performed the action',
    example: 'admin@rambini.com',
  })
  admin_email: string;

  @ApiProperty({
    description: 'Timestamp of the action',
    example: '2024-01-15T10:30:00Z',
  })
  performed_at: Date;

  @ApiProperty({
    description: 'Reason for the action',
    example: 'User support ticket #12345',
    required: false,
  })
  reason?: string;

  @ApiProperty({
    description: 'Updated entity data',
    required: false,
  })
  data?: any;
}