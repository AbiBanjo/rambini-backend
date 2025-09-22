import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteAccountDto {
  @ApiProperty({
    description: 'Reason for account deletion',
    example: 'No longer using the service',
    minLength: 10,
    maxLength: 500
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Reason must be at least 10 characters long' })
  @MaxLength(500, { message: 'Reason must not exceed 500 characters' })
  reason: string;
}
