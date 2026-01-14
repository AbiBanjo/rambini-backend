import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddressResponseDto {
  @ApiProperty({ description: 'Address ID' })
  id: string;

  @ApiProperty({ description: 'Address line 1' })
  address_line_1: string;

  @ApiPropertyOptional({ description: 'Address line 2' })
  address_line_2?: string;

  @ApiProperty({ description: 'City' })
  city: string;

  @ApiProperty({ description: 'State' })
  state: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  postal_code?: string;

  @ApiProperty({ description: 'Country' })
  country: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  longitude?: number;

  @ApiPropertyOptional({ description: 'Landmark' })
  landmark?: string;
} 