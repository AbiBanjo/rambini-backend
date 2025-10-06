import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class SelectDeliveryQuoteDto {
  @ApiProperty({ description: 'Delivery quote ID to select' })
  @IsString()
  @IsNotEmpty()
  delivery_quote_id: string;
}
