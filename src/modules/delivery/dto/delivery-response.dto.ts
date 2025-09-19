import { ApiProperty } from '@nestjs/swagger';

export class DeliveryResponseDto {
  @ApiProperty({ description: 'Delivery ID' })
  id: string;

  @ApiProperty({ description: 'Order ID' })
  orderId: string;

  @ApiProperty({ description: 'Delivery provider' })
  provider: string;

  @ApiProperty({ description: 'Tracking number' })
  trackingNumber: string;

  @ApiProperty({ description: 'Delivery status' })
  status: string;

  @ApiProperty({ description: 'Delivery cost' })
  cost: number;

  @ApiProperty({ description: 'Currency' })
  currency: string;

  @ApiProperty({ description: 'Courier name' })
  courier: string;

  @ApiProperty({ description: 'Service type' })
  service: string;

  @ApiProperty({ description: 'Estimated delivery date' })
  estimatedDelivery: Date;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}
