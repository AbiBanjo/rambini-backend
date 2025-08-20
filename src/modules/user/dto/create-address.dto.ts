import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsEnum, Length, Matches, Min, Max } from 'class-validator';
import { AddressType } from '../../../entities';

export class CreateAddressDto {
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

  @ApiProperty({ description: 'Postal code' })
  @IsString()
  @IsNotEmpty()
  postal_code: string;

  @ApiPropertyOptional({ description: 'Country (2-letter ISO code, default: NG)' })
  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'Country must be exactly 2 characters' })
  @Matches(/^[A-Z]{2}$/, { message: 'Country must be a 2-letter uppercase ISO code (e.g., NG, US, UK)' })
  country?: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ description: 'Address type', enum: AddressType, default: AddressType.HOME })
  @IsOptional()
  @IsEnum(AddressType)
  address_type?: AddressType;

  @ApiPropertyOptional({ description: 'Whether this is the default address', default: false })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
} 