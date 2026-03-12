import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class AdminCreateVendorShellDto {
  @ApiProperty({ description: 'Business name for the vendor' })
  @IsString()
  business_name: string;

  @ApiPropertyOptional({ description: 'Business registration number' })
  @IsOptional()
  @IsString()
  certificate_number?: string;

  @ApiPropertyOptional({ description: 'Country code (ISO 3166-1 alpha-2). Used to set vendor currency.' })
  @IsOptional()
  @IsString()
  country?: string;
}

export class AdminUpdateVendorContactDto {
  @ApiProperty({ description: 'Vendor email address' })
  @IsEmail()
  email: string;
}

export class AdminSendVendorInviteDto {
  @ApiPropertyOptional({ description: 'Override invite email (optional)' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
