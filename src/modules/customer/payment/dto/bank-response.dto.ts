import { ApiProperty } from '@nestjs/swagger';

export class BankResponseDto {
  @ApiProperty({
    description: 'Bank ID',
    example: 'bank-123',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: 'user-123',
  })
  user_id: string;

  @ApiProperty({
    description: 'Bank account name/nickname',
    example: 'My Main Account',
  })
  name: string;

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
    description: 'Display name combining name and bank',
    example: 'My Main Account (First Bank of Nigeria)',
  })
  display_name: string;

  @ApiProperty({
    description: 'Created at timestamp',
    example: '2023-12-01T10:00:00Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Updated at timestamp',
    example: '2023-12-01T11:00:00Z',
  })
  updated_at: Date;
}

