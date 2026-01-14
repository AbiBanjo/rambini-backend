import { IsString, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AddressDto, PackageDto } from './delivery-rate.dto';

export class CreateShipmentDto {
  @ApiProperty({ description: 'Origin address', type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  @IsObject()
  origin: AddressDto;

  @ApiProperty({ description: 'Destination address', type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  @IsObject()
  destination: AddressDto;

  @ApiProperty({ description: 'Package details', type: PackageDto })
  @ValidateNested()
  @Type(() => PackageDto)
  @IsObject()
  package: PackageDto;

  @ApiProperty({ description: 'Courier code' })
  @IsString()
  courier: string;

  @ApiProperty({ description: 'Rate ID from delivery rates' })
  @IsString()
  rateId: string;

  @ApiProperty({ description: 'Reference number', required: false })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiProperty({ description: 'Package description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Delivery instructions', required: false })
  @IsString()
  @IsOptional()
  delivery_instructions?: string;
}

export class CreateShipmentResponseDto {
  @ApiProperty({ description: 'Whether shipment was created successfully' })
  success: boolean;

  @ApiProperty({ description: 'Tracking number', required: false })
  trackingNumber?: string;

  @ApiProperty({ description: 'Shipping label URL', required: false })
  labelUrl?: string;

  @ApiProperty({ description: 'Reference number', required: false })
  reference?: string;

  @ApiProperty({ description: 'Error message', required: false })
  error?: string;
}
