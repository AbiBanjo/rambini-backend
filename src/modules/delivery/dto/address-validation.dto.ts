import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddressValidationDto {
  @ApiProperty({ description: 'Street address' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'State/Province' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'Country' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ description: 'Postal/ZIP code', required: false })
  @IsString()
  @IsOptional()
  postalCode?: string;
}

export class AddressValidationResponseDto {
  @ApiProperty({ description: 'Whether the validation was successful' })
  success: boolean;

  @ApiProperty({ description: 'Whether the address is valid' })
  isValid: boolean;

  @ApiProperty({ description: 'Normalized address if valid', required: false })
  normalizedAddress?: string;

  @ApiProperty({ description: 'Address suggestions if invalid', required: false })
  suggestions?: string[];

  @ApiProperty({ description: 'Validation error message', required: false })
  error?: string;
}
