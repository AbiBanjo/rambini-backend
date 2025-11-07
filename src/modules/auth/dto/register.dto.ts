import { IsString, IsNotEmpty, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com'
  })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password (minimum 8 characters)',
    example: 'SecurePassword123!',
    minLength: 8
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, {
    message: 'Password must be at least 8 characters long'
  })
  password: string;
} 