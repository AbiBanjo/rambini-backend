import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;
}

