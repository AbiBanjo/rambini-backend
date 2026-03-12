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
