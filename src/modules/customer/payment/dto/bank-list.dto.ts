import { ApiProperty } from '@nestjs/swagger';

export class BankDto {
  @ApiProperty({ description: 'Bank ID' })
  id: number;

  @ApiProperty({ description: 'Bank name' })
  name: string;

  @ApiProperty({ description: 'Bank slug' })
  slug: string;

  @ApiProperty({ description: 'Bank code' })
  code: string;

  @ApiProperty({ description: 'Bank long code', required: false })
  longcode?: string;

  @ApiProperty({ description: 'Gateway', required: false })
  gateway?: string;

  @ApiProperty({ description: 'Pay with bank flag' })
  pay_with_bank: boolean;

  @ApiProperty({ description: 'Supports transfer flag' })
  supports_transfer: boolean;

  @ApiProperty({ description: 'Available for direct debit flag' })
  available_for_direct_debit: boolean;

  @ApiProperty({ description: 'Active status' })
  active: boolean;

  @ApiProperty({ description: 'Country' })
  country: string;

  @ApiProperty({ description: 'Currency' })
  currency: string;

  @ApiProperty({ description: 'Bank type' })
  type: string;

  @ApiProperty({ description: 'Is deleted flag' })
  is_deleted: boolean;

  @ApiProperty({ description: 'Creation date' })
  createdAt: string;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: string;
}

export class BankListResponseDto {
  @ApiProperty({ description: 'Response status' })
  status: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'List of banks', type: [BankDto] })
  data: BankDto[];
}
