import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, Length, Matches, Min, Max } from 'class-validator';
import { AddressType } from '../../../entities';

export class UpdateAddressDto {
  @ApiPropertyOptional({ description: 'Address line 1' })
  @IsOptional()
  @IsString()
  address_line_1?: string;

  @ApiPropertyOptional({ description: 'Address line 2' })
  @IsOptional()
  @IsString()
  address_line_2?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'State' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  postal_code?: string;

  @ApiPropertyOptional({ description: 'Country (2-letter ISO code)' })
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

  @ApiPropertyOptional({ description: 'Address type', enum: AddressType })
  @IsOptional()
  @IsEnum(AddressType)
  address_type?: AddressType;

  @ApiPropertyOptional({ description: 'Whether this is the default address' })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
} 