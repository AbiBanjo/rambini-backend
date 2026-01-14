import { ApiProperty } from '@nestjs/swagger';
import { WithdrawalStatus, Currency, Country } from '../../../entities';

export class WithdrawalResponseDto {
  @ApiProperty({
    description: 'Withdrawal ID',
    example: 'withdrawal-123',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: 'user-123',
  })
  user_id: string;

  @ApiProperty({
    description: 'Withdrawal amount',
    example: 100.00,
  })
  amount: number;

  @ApiProperty({
    description: 'Currency',
    enum: Currency,
    example: Currency.NGN,
  })
  currency: Currency;

  @ApiProperty({
    description: 'Country',
    enum: Country,
    example: Country.NIGERIA,
  })
  country: Country;

  @ApiProperty({
    description: 'Withdrawal status',
    enum: WithdrawalStatus,
    example: WithdrawalStatus.PENDING,
  })
  status: WithdrawalStatus;

  @ApiProperty({
    description: 'Withdrawal fee',
    example: 5.00,
  })
  fee: number;

  @ApiProperty({
    description: 'Net amount after fee',
    example: 95.00,
  })
  net_amount: number;

  @ApiProperty({
    description: 'Bank name',
    example: 'First Bank of Nigeria',
  })
  bank_name: string;

  @ApiProperty({
    description: 'Account number (masked)',
    example: '****7890',
  })
  account_number: string;

  @ApiProperty({
    description: 'Whether OTP is verified',
    example: true,
  })
  is_otp_verified: boolean;

  @ApiProperty({
    description: 'Created at timestamp',
    example: '2023-12-01T10:00:00Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Processed at timestamp',
    example: '2023-12-01T11:00:00Z',
    required: false,
  })
  processed_at?: Date;

  @ApiProperty({
    description: 'Admin notes',
    example: 'Processed successfully',
    required: false,
  })
  admin_notes?: string;

  @ApiProperty({
    description: 'Transaction reference',
    example: 'TXN-123456',
    required: false,
  })
  transaction_reference?: string;
}
