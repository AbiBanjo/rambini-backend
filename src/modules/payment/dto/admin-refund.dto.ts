import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RequestRefundDto {
  @ApiPropertyOptional({
    description: 'Amount to refund. If omitted, full refund is processed.',
    example: 5000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional({
    description: 'Reason for the refund',
    example: 'Customer cancelled the order',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
