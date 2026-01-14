import { ApiProperty, PartialType } from '@nestjs/swagger';
import { BankCreateDto } from './bank-create.dto';

export class BankUpdateDto extends PartialType(BankCreateDto) {
  @ApiProperty({
    description: 'Bank account name/nickname',
    example: 'My Updated Account',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'Bank name',
    example: 'Access Bank',
    required: false,
  })
  bank_name?: string;

  @ApiProperty({
    description: 'Bank account number',
    example: '9876543210',
    required: false,
  })
  account_number?: string;
}

