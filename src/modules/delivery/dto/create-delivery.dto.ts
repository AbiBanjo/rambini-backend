import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateDeliveryDto {
  @ApiProperty({
    description: 'The ID of the delivery quote to use for creating the delivery',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  deliveryQuoteId: string;

  @ApiProperty({
    description: 'The ID of the order for which to create the delivery',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsNotEmpty()
  @IsUUID()
  orderId: string;
}
