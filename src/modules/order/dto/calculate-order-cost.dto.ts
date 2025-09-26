import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsArray, ArrayNotEmpty, ArrayMinSize } from 'class-validator';
import { OrderType } from 'src/entities';

export class CalculateOrderCostDto {
  @ApiProperty({ description: 'Array of cart item IDs to calculate cost for', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsString({ each: true })
  cart_item_ids: string[];

  @ApiProperty({ description: 'Order type', enum: OrderType })
  @IsEnum(OrderType)
  order_type: OrderType;

  @ApiPropertyOptional({ description: 'Delivery address ID (required for delivery orders)' })
  @IsOptional()
  @IsString()
  delivery_address_id?: string;
}

export class OrderCostResponseDto {
  @ApiProperty({ description: 'Subtotal amount' })
  subtotal: number;

  @ApiProperty({ description: 'Delivery fee' })
  delivery_fee: number;

  @ApiProperty({ description: 'Total amount' })
  total_amount: number;

  @ApiProperty({ description: 'Order type' })
  order_type: OrderType;

  @ApiProperty({ description: 'Delivery provider (if applicable)' })
  delivery_provider?: string;

  @ApiProperty({ description: 'Pickup address (for pickup orders)' })
  pickup_address?: {
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code?: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };

  @ApiProperty({ description: 'Delivery address (for delivery orders)' })
  delivery_address?: {
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code?: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };

  @ApiProperty({ description: 'Vendor information' })
  vendor: {
    id: string;
    business_name: string;
  };
}
