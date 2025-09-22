import { IsString, IsArray, IsOptional, IsObject } from 'class-validator';

export class SendNotificationDto {
  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsArray()
  @IsString({ each: true })
  tokens: string[];

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
