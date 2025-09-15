import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsObject, IsEnum } from 'class-validator';
import { PaymentTransactionStatus } from 'src/entities';

export class PaymentWebhookDto {
  @ApiProperty({ description: 'Webhook event type' })
  @IsString()
  event: string;

  @ApiProperty({ description: 'Payment reference' })
  @IsString()
  payment_reference: string;

  @ApiPropertyOptional({ description: 'External transaction ID' })
  @IsOptional()
  @IsString()
  external_reference?: string;

  @ApiProperty({ description: 'Payment status', enum: PaymentTransactionStatus })
  @IsEnum(PaymentTransactionStatus)
  status: PaymentTransactionStatus;

  @ApiPropertyOptional({ description: 'Payment amount' })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ description: 'Failure reason if payment failed' })
  @IsOptional()
  @IsString()
  failure_reason?: string;

  @ApiPropertyOptional({ description: 'Gateway response data' })
  @IsOptional()
  @IsObject()
  gateway_response?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class StripeWebhookDto {
  @ApiProperty({ description: 'Stripe event type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Stripe event data' })
  @IsObject()
  data: {
    object: {
      id: string;
      status: string;
      amount: number;
      currency: string;
      metadata?: Record<string, any>;
    };
  };
}

export class PaystackWebhookDto {
  @ApiProperty({ description: 'Paystack event type' })
  @IsString()
  event: string;

  @ApiProperty({ description: 'Paystack event data' })
  @IsObject()
  data: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    reference: string;
    metadata?: Record<string, any>;
  };
}

export class MercuryWebhookDto {
  @ApiProperty({ description: 'Mercury event type' })
  @IsString()
  event: string;

  @ApiProperty({ description: 'Mercury event data' })
  @IsObject()
  data: {
    transaction_id: string;
    status: string;
    amount: number;
    currency: string;
    reference: string;
    metadata?: Record<string, any>;
  };
}
