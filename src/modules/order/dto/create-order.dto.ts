import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsArray, ArrayNotEmpty, ArrayMinSize } from 'class-validator';
import { OrderType, PaymentMethod } from 'src/entities';

export class CreateOrderDto {
  @ApiProperty({ description: 'Array of cart item IDs to checkout', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsString({ each: true })
  cart_item_ids: string[];

  @ApiProperty({ description: 'Delivery address ID' })
  @IsString()
  delivery_address_id?: string;

  @ApiProperty({ description: 'Order type', enum: OrderType })
  @IsEnum(OrderType)
  order_type: OrderType;

  @ApiProperty({ description: 'Payment method', enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @ApiPropertyOptional({ description: 'Special delivery instructions' })
  @IsOptional()
  @IsString()
  delivery_instructions?: string;

  @ApiPropertyOptional({ description: 'Vendor notes' })
  @IsOptional()
  @IsString()
  vendor_notes?: string;

  @ApiPropertyOptional({ description: 'Estimated delivery time preference' })
  @IsOptional()
  @IsString()
  preferred_delivery_time?: string;
} 