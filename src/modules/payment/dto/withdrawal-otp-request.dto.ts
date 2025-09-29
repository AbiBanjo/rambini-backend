import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WithdrawalOtpRequestDto {
 @ApiProperty({
  description: "amount of money to withdraw",
  example: 100,
})
@IsNumber()
@IsNotEmpty()
amount: number;
}
