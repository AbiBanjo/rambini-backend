import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminWithdrawalActionDto {
  @ApiProperty({
    description: 'Admin notes for the action',
    example: 'Processed successfully',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    description: 'Transaction reference from bank',
    example: 'TXN-123456',
    required: false,
  })
  @IsString()
  @IsOptional()
  transaction_reference?: string;
}
