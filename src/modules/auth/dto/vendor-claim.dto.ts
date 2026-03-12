import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class VerifyVendorClaimDto {
  @ApiProperty({ description: 'Vendor claim token from magic link' })
  @IsString()
  token: string;
}

export class CompleteVendorClaimDto {
  @ApiProperty({ description: 'Vendor claim token from magic link' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'New password for the vendor account (required if account has no password yet)' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
