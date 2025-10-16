import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Length, Matches } from 'class-validator';

export class CreateVendorDto {
  @ApiProperty({ description: 'Business name for the vendor' })
  @IsString()
  @IsNotEmpty()
  business_name: string;

  @ApiProperty({ description: 'Business registration number' })
  @IsString()
  @IsOptional()
  certificate_number: string;

  @ApiProperty({ description: 'Address line 1' })
  @IsString()
  @IsNotEmpty()
  address_line_1: string;

  @ApiPropertyOptional({ description: 'Address line 2' })
  @IsOptional()
  @IsString()
  address_line_2?: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'State' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  postal_code?: string;

  @ApiPropertyOptional({ description: 'Country (2-letter ISO code, default: NG)' })
  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'Country must be exactly 2 characters' })
  @Matches(/^[A-Z]{2}$/, { message: 'Country must be a 2-letter uppercase ISO code (e.g., NG, US, UK)' })
  country?: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Landmark' })
  @IsOptional()
  @IsString()
  landmark?: string;
} 