import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber, Min, IsObject } from 'class-validator';
import { Currency, PaymentMethod } from 'src/entities';

export class ProcessPaymentDto {
  @ApiProperty({ description: 'Order ID to process payment for' })
  @IsString()
  order_id: string;

  @ApiProperty({ description: 'Payment method', enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @ApiProperty({ description: 'Currency', enum: Currency })
  @IsString()
  currency : Currency

  @ApiPropertyOptional({ description: 'Additional payment metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Saved card ID (for CARD_SAVED payment method)' })
  @IsOptional()
  @IsString()
  saved_card_id?: string;
}

export class WalletPaymentDto {
  @ApiProperty({ description: 'Order ID to process payment for' })
  @IsString()
  order_id: string;

  @ApiPropertyOptional({ description: 'Wallet PIN for verification' })
  @IsOptional()
  @IsString()
  wallet_pin?: string;
}

export class ExternalPaymentDto {
  @ApiProperty({ description: 'Order ID to process payment for' })
  @IsString()
  order_id: string;

  @ApiProperty({ description: 'Payment method', enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @ApiPropertyOptional({ description: 'Return URL for payment completion' })
  @IsOptional()
  @IsString()
  return_url?: string;

  @ApiPropertyOptional({ description: 'Additional payment metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class PaymentResponseDto {
  @ApiProperty({ description: 'Payment ID' })
  id: string;

  @ApiProperty({ description: 'Payment reference' })
  payment_reference: string;

  @ApiProperty({ description: 'Order ID' })
  order_id: string;

  @ApiProperty({ description: 'Payment method', enum: PaymentMethod })
  payment_method: PaymentMethod;

  @ApiProperty({ description: 'Payment status' })
  status: string;

  @ApiProperty({ description: 'Payment amount' })
  amount: number;

  @ApiPropertyOptional({ description: 'External payment URL for redirect' })
  payment_url?: string;

  @ApiPropertyOptional({ description: 'External transaction ID' })
  external_reference?: string;

  @ApiProperty({ description: 'When payment was created' })
  created_at: Date;

  @ApiPropertyOptional({ description: 'When payment was processed' })
  processed_at?: Date;
}
