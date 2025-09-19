import { IsString, IsNumber, IsOptional, IsArray, IsNotEmpty, Min, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AddressDto {
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

export class PackageDto {
  @ApiProperty({ description: 'Package weight in kg' })
  @IsNumber()
  @Min(0.1)
  weight: number;

  @ApiProperty({ description: 'Package length in cm' })
  @IsNumber()
  @Min(1)
  length: number;

  @ApiProperty({ description: 'Package width in cm' })
  @IsNumber()
  @Min(1)
  width: number;

  @ApiProperty({ description: 'Package height in cm' })
  @IsNumber()
  @Min(1)
  height: number;

  @ApiProperty({ description: 'Package value for insurance', required: false })
  @IsNumber()
  @IsOptional()
  value?: number;
}

export class DeliveryRateRequestDto {
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

  @ApiProperty({ description: 'Specific courier codes', required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  couriers?: string[];
}

export class DeliveryRateResponseDto {
  @ApiProperty({ description: 'Courier code' })
  courier: string;

  @ApiProperty({ description: 'Courier name' })
  courierName: string;

  @ApiProperty({ description: 'Service code' })
  service: string;

  @ApiProperty({ description: 'Service name' })
  serviceName: string;

  @ApiProperty({ description: 'Rate ID for creating shipment' })
  rateId: string;

  @ApiProperty({ description: 'Delivery cost' })
  amount: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Estimated delivery days' })
  estimatedDays: number;

  @ApiProperty({ description: 'Service features', required: false, type: [String] })
  features?: string[];
}
