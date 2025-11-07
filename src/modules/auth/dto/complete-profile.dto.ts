import { IsString, IsNotEmpty, IsOptional, IsEmail, IsBoolean, IsNumber, Min, Max, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddressDto {
  @ApiProperty({
    description: 'Primary address line',
    example: '123 Main Street'
  })
  @IsString()
  @IsNotEmpty()
  address_line_1: string;

  @ApiProperty({
    description: 'Secondary address line (optional)',
    example: 'Apt 4B',
    required: false
  })
  @IsOptional()
  @IsString()
  address_line_2?: string;

  @ApiProperty({
    description: 'City name',
    example: 'New York'
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    description: 'State or province',
    example: 'NY'
  })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({
    description: 'Postal code',
    example: '10001'
  })
  @IsString()
  @IsNotEmpty()
  postal_code: string;

  @ApiProperty({
    description: 'Latitude coordinate (optional)',
    example: 40.7128,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude?: number;

  @ApiProperty({
    description: 'Longitude coordinate (optional)',
    example: -74.0060,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude?: number;

  @ApiProperty({
    description: 'Whether this is the default address',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
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

  @ApiProperty({
    description: 'Phone number in E.164 format',
    example: '+1234567890',
    pattern: '^\\+[1-9]\\d{1,14}$'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)'
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'User country code (ISO 3166-1 alpha-2)',
    example: 'NG',
    required: false
  })
  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'Country must be exactly 2 characters' })
  @Matches(/^[A-Z]{2}$/, { message: 'Country must be a 2-letter uppercase ISO code (e.g., NG, US, UK)' })
  country?: string;

  @ApiProperty({
    description: 'User address information (optional)',
    type: AddressDto,
    required: false
  })
  @IsOptional()
  @Type(() => AddressDto)
  address?: AddressDto;
} 