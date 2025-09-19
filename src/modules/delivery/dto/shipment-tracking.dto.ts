import { IsString, IsDate, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TrackingEventDto {
  @ApiProperty({ description: 'Event timestamp' })
  @IsDate()
  @Type(() => Date)
  timestamp: Date;

  @ApiProperty({ description: 'Event status' })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Event description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Event location', required: false })
  @IsString()
  @IsOptional()
  location?: string;
}

export class ShipmentTrackingResponseDto {
  @ApiProperty({ description: 'Whether the tracking request was successful' })
  success: boolean;

  @ApiProperty({ description: 'Tracking number' })
  trackingNumber: string;

  @ApiProperty({ description: 'Current status' })
  status: string;

  @ApiProperty({ description: 'Status description', required: false })
  statusDescription?: string;

  @ApiProperty({ description: 'Current location', required: false })
  currentLocation?: string;

  @ApiProperty({ description: 'Tracking events', type: [TrackingEventDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrackingEventDto)
  events: TrackingEventDto[];

  @ApiProperty({ description: 'Estimated delivery date', required: false })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  estimatedDelivery?: Date;

  @ApiProperty({ description: 'Courier code', required: false })
  @IsString()
  @IsOptional()
  courier?: string;

  @ApiProperty({ description: 'Service type', required: false })
  @IsString()
  @IsOptional()
  service?: string;

  @ApiProperty({ description: 'Error message', required: false })
  @IsString()
  @IsOptional()
  error?: string;
}
