import { ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsEmail, 
  IsPhoneNumber, 
  IsEnum, 
  Length, 
  Matches,
  IsUUID, 
  IsBoolean
} from 'class-validator';
import { UserType, UserStatus } from '../../../entities';

export class UpdateUserDto {
  @ApiPropertyOptional({ 
    description: 'User phone number in E.164 format',
    example: '+2348123456789'
  })
  @IsOptional()
  @IsPhoneNumber('NG')
  phone_number?: string;

  @ApiPropertyOptional({ 
    description: 'User first name',
    example: 'John'
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  first_name?: string;

  @ApiPropertyOptional({ 
    description: 'User last name',
    example: 'Doe'
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  last_name?: string;

  @ApiPropertyOptional({ 
    description: 'User email address',
    example: 'john.doe@example.com'
  })
  @IsOptional()
  @IsEmail()
  @Length(1, 255)
  email?: string;

  @ApiPropertyOptional({ 
    description: 'User country code (ISO 3166-1 alpha-2)',
    example: 'NG'
  })
  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'Country must be exactly 2 characters' })
  @Matches(/^[A-Z]{2}$/, { message: 'Country must be a 2-letter uppercase ISO code (e.g., NG, US, UK)' })
  country?: string;

  @ApiPropertyOptional({ 
    description: 'User type',
    enum: UserType,
    example: UserType.CUSTOMER
  })
  @IsOptional()
  @IsEnum(UserType)
  user_type?: UserType;

  @ApiPropertyOptional({ 
    description: 'User status',
    enum: UserStatus,
    example: UserStatus.ACTIVE
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ 
    description: 'User profile image URL',
    example: 'https://example.com/profile.jpg'
  })
  @IsOptional()
  @IsString()
  image_url?: string;

  @ApiPropertyOptional({ 
    description: 'OTP code for phone number verification',
    example: '123456'
  })
  @IsOptional()
  @IsString()
  @Length(4, 10)
  otpCode?: string;

  @ApiPropertyOptional({ 
    description: 'OTP ID for phone number verification',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  otpId?: string;

  @ApiPropertyOptional({ 
    description: 'User profile completed',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  profile_completed?: boolean;
}
