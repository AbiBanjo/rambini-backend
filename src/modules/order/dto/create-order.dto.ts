import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsArray, ArrayNotEmpty, ArrayMinSize, IsNotEmpty } from 'class-validator';
import { OrderType, PaymentMethod, Currency } from 'src/entities';

export class CreateOrderDto {
  @ApiProperty({ description: 'vendor id', type: String })
  @IsString()
  @IsNotEmpty()
  vendor_id: string;

  @ApiPropertyOptional({ description: 'Delivery address ID (required for DELIVERY orders, not needed for PICKUP orders)' })
  @IsString()
  @IsOptional()
  delivery_address_id?: string;

  @ApiPropertyOptional({ description: 'Delivery quote ID (optional - if provided, will use this quote for delivery fee calculation)' })
  @IsString()
  @IsOptional()
  delivery_quote_id?: string;

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

  @ApiPropertyOptional({ description: 'Saved card ID (for CARD_SAVED payment method)' })
  @IsOptional()
  @IsString()
  saved_card_id?: string;

} 