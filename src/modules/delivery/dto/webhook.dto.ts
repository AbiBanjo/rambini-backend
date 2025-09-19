import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeliveryWebhookDto {
  @ApiProperty({ description: 'Whether webhook processing was successful' })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: 'Webhook event type' })
  @IsString()
  eventType: string;

  @ApiProperty({ description: 'Tracking number', required: false })
  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @ApiProperty({ description: 'Reference number', required: false })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiProperty({ description: 'Delivery status', required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ description: 'Status description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Event timestamp', required: false })
  @IsString()
  @IsOptional()
  timestamp?: Date;

  @ApiProperty({ description: 'Provider name', required: false })
  @IsString()
  @IsOptional()
  provider?: string;

  @ApiProperty({ description: 'Webhook data', required: false })
  @IsObject()
  @IsOptional()
  data?: any;

  @ApiProperty({ description: 'Error message', required: false })
  @IsString()
  @IsOptional()
  error?: string;
}
