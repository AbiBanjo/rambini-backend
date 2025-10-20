import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber, Min, IsObject, IsUrl, IsEmail } from 'class-validator';
import { Currency, PaymentMethod } from 'src/entities';
import { Transform } from 'class-transformer';

export class FundWalletDto {
  @ApiProperty({ 
    description: 'Amount to fund wallet with', 
    minimum: 1,
    example: 5000 
  })
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiProperty({ 
    description: 'Payment method to use for funding', 
    enum: PaymentMethod,
    example: PaymentMethod.PAYSTACK 
  })
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @ApiProperty({ 
    description: 'Currency for the funding', 
    enum: Currency,
    example: Currency.NGN 
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ 
    description: 'Return URL after payment completion (for external payment methods)',
    example: 'https://myapp.com/wallet/funding/success'
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  return_url?: string;

  @ApiPropertyOptional({ 
    description: 'Cancel URL if payment is cancelled (for external payment methods)',
    example: 'https://myapp.com/wallet/funding/cancel'
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  cancel_url?: string;

  @ApiPropertyOptional({ description: 'Additional metadata for the funding transaction' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'User email' })
  @IsOptional()
  @IsString()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Saved card ID (for CARD_SAVED payment method)' })
  @IsOptional()
  @IsString()
  saved_card_id?: string;
}

export class WalletFundingResponseDto {
  @ApiProperty({ description: 'Funding transaction ID' })
  id: string;

  @ApiProperty({ description: 'Funding reference number' })
  reference: string;

  @ApiProperty({ description: 'User ID' })
  user_id: string;

  @ApiProperty({ description: 'Amount to be funded' })
  amount: number;

  @ApiProperty({ description: 'Currency', enum: Currency })
  currency: Currency;

  @ApiProperty({ description: 'Payment method used', enum: PaymentMethod })
  payment_method: PaymentMethod;

  @ApiProperty({ description: 'Transaction status' })
  status: string;

  @ApiPropertyOptional({ description: 'Payment URL for external payment methods' })
  payment_url?: string;

  @ApiPropertyOptional({ description: 'Authorization URL for external payment methods' })
  authorization_url?: string;

  @ApiPropertyOptional({ description: 'Access code for external payment methods' })
  access_code?: string;

  @ApiPropertyOptional({ description: 'External reference from payment provider' })
  external_reference?: string;

  @ApiProperty({ description: 'When the funding request was created' })
  created_at: Date;

  @ApiPropertyOptional({ description: 'When the funding was processed' })
  processed_at?: Date;

  @ApiProperty({ description: 'Instructions for completing the payment' })
  message: string;
}

export class VerifyWalletFundingDto {
  @ApiProperty({ 
    description: 'Funding reference to verify',
    example: 'WF_1234567890'
  })
  @IsString()
  reference: string;
}

export class WalletFundingStatusDto {
  @ApiProperty({ description: 'Funding transaction ID' })
  id: string;

  @ApiProperty({ description: 'Funding reference number' })
  reference: string;

  @ApiProperty({ description: 'Amount funded' })
  amount: number;

  @ApiProperty({ description: 'Currency', enum: Currency })
  currency: Currency;

  @ApiProperty({ description: 'Payment method used', enum: PaymentMethod })
  payment_method: PaymentMethod;

  @ApiProperty({ description: 'Transaction status' })
  status: string;

  @ApiPropertyOptional({ description: 'Failure reason if transaction failed' })
  failure_reason?: string;

  @ApiProperty({ description: 'When the funding request was created' })
  created_at: Date;

  @ApiPropertyOptional({ description: 'When the funding was processed' })
  processed_at?: Date;

  @ApiPropertyOptional({ description: 'When the funding failed' })
  failed_at?: Date;

  @ApiProperty({ description: 'Current wallet balance after funding (if successful)' })
  wallet_balance?: number;
}

export class WalletBalanceDto {
  @ApiProperty({ description: 'Wallet ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  user_id: string;

  @ApiProperty({ description: 'Current wallet balance' })
  balance: number;

  @ApiProperty({ description: 'Wallet currency', enum: Currency })
  currency: Currency;

  @ApiProperty({ description: 'Whether wallet is active' })
  is_active: boolean;

  @ApiProperty({ description: 'Formatted balance string' })
  formatted_balance: string;

  @ApiPropertyOptional({ description: 'Last transaction timestamp' })
  last_transaction_at?: Date;

  @ApiProperty({ description: 'When wallet was created' })
  created_at: Date;

  @ApiProperty({ description: 'When wallet was last updated' })
  updated_at: Date;

  @ApiPropertyOptional({ description: 'Vendor balance' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vendor_balance?: number;

  @ApiPropertyOptional({ description: 'Vendor currency', enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  vendor_currency?: Currency;
}
