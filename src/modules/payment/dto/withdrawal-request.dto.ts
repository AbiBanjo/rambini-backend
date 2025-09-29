import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, Min, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Currency, Country, RecipientType, AccountType } from '../../../entities';

export class WithdrawalRequestDto {
  @ApiProperty({
    description: 'OTP ID for verification',
    example: 'otp-123',
  })
  @IsString()
  @IsNotEmpty()
  otp_id: string;

  @ApiProperty({
    description: 'OTP code for verification',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  otp_code: string;

  @ApiProperty({
    description: 'Withdrawal amount',
    example: 100.00,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Currency for withdrawal',
    enum: Currency,
    example: Currency.NGN,
  })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({
    description: 'Country code',
    enum: Country,
    example: Country.NIGERIA,
  })
  @IsEnum(Country)
  country: Country;

  @ApiProperty({
    description: 'Bank name',
    example: 'First Bank of Nigeria',
  })
  @IsString()
  @IsNotEmpty()
  bank_name: string;

  @ApiProperty({
    description: 'Account number',
    example: '1234567890',
  })
  @IsString()
  @IsNotEmpty()
  account_number: string;

  // Nigeria specific fields
  @ApiProperty({
    description: 'Account name (required for Nigeria)',
    example: 'John Doe',
    required: false,
  })
  @ValidateIf((o) => o.country === Country.NIGERIA)
  @IsString()
  @IsNotEmpty()
  account_name?: string;

  // US specific fields
  @ApiProperty({
    description: 'Recipient type (required for US)',
    enum: RecipientType,
    example: RecipientType.INDIVIDUAL,
    required: false,
  })
  @ValidateIf((o) => o.country === Country.UNITED_STATES)
  @IsEnum(RecipientType)
  recipient_type?: RecipientType;

  @ApiProperty({
    description: 'Routing number (required for US)',
    example: '123456789',
    required: false,
  })
  @ValidateIf((o) => o.country === Country.UNITED_STATES)
  @IsString()
  @IsNotEmpty()
  routing_number?: string;

  @ApiProperty({
    description: 'Account type (required for US)',
    enum: AccountType,
    example: AccountType.CHECKING,
    required: false,
  })
  @ValidateIf((o) => o.country === Country.UNITED_STATES)
  @IsEnum(AccountType)
  account_type?: AccountType;

  @ApiProperty({
    description: 'Recipient address (required for US)',
    example: '123 Main St',
    required: false,
  })
  @ValidateIf((o) => o.country === Country.UNITED_STATES)
  @IsString()
  @IsNotEmpty()
  recipient_address?: string;

  @ApiProperty({
    description: 'Recipient city (required for US)',
    example: 'New York',
    required: false,
  })
  @ValidateIf((o) => o.country === Country.UNITED_STATES)
  @IsString()
  @IsNotEmpty()
  recipient_city?: string;

  @ApiProperty({
    description: 'Recipient state (required for US)',
    example: 'NY',
    required: false,
  })
  @ValidateIf((o) => o.country === Country.UNITED_STATES)
  @IsString()
  @IsNotEmpty()
  recipient_state?: string;

  @ApiProperty({
    description: 'Recipient ZIP code (required for US)',
    example: '10001',
    required: false,
  })
  @ValidateIf((o) => o.country === Country.UNITED_STATES)
  @IsString()
  @IsNotEmpty()
  recipient_zip_code?: string;

  // UK specific fields
  @ApiProperty({
    description: 'Recipient type (required for UK)',
    enum: RecipientType,
    example: RecipientType.INDIVIDUAL,
    required: false,
  })
  @ValidateIf((o) => o.country === Country.UNITED_KINGDOM)
  @IsEnum(RecipientType)
  recipient_type_uk?: RecipientType;

  @ApiProperty({
    description: 'Sort code (required for UK)',
    example: '12-34-56',
    required: false,
  })
  @ValidateIf((o) => o.country === Country.UNITED_KINGDOM)
  @IsString()
  @IsNotEmpty()
  sort_code?: string;
}
