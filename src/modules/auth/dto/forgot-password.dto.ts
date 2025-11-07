import { IsString, IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com'
  })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

