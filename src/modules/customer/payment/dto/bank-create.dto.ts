import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class BankCreateDto {
  @ApiProperty({
    description: 'Bank account name/nickname',
    example: 'My Main Account',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 255)
  name: string;

  @ApiProperty({
    description: 'Bank name',
    example: 'First Bank of Nigeria',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 255)
  bank_name: string;

  @ApiProperty({
    description: 'Bank account number',
    example: '1234567890',
    minLength: 8,
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @Length(8, 20)
  account_number: string;
}

