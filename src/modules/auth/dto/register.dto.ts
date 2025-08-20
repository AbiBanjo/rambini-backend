import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Phone number in E.164 format',
    example: '+1234567890',
    pattern: '^\\+[1-9]\\d{1,14}$'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)'
  })
  phoneNumber: string;
} 