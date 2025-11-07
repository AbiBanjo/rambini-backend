import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AppleAuthDto {
  @IsString()
  @IsNotEmpty()
  identityToken: string;

  @IsString()
  @IsOptional()
  authorizationCode?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  email?: string;
}

