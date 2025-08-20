import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderType, PaymentMethod } from 'src/entities';

export class OrderItemDto {
  @ApiProperty({ description: 'Menu item ID' })
  @IsString()
  menu_item_id: string;

  @ApiProperty({ description: 'Quantity ordered', minimum: 1, maximum: 99 })
  @IsNumber()
  @Min(1)
  @Max(99)
  quantity: number;

  @ApiPropertyOptional({ description: 'Special instructions for this item' })
  @IsOptional()
  @IsString()
  special_instructions?: string;

  @ApiPropertyOptional({ description: 'Customizations as JSON object' })
  @IsOptional()
  customizations?: Record<string, any>;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Delivery address ID' })
  @IsString()
  delivery_address_id: string;

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

  @ApiPropertyOptional({ description: 'Whether to use existing cart items', default: true })
  @IsOptional()
  @IsBoolean()
  use_cart_items?: boolean;

  @ApiPropertyOptional({ description: 'Custom order items (if not using cart)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  custom_items?: OrderItemDto[];

  @ApiPropertyOptional({ description: 'Estimated delivery time preference' })
  @IsOptional()
  @IsString()
  preferred_delivery_time?: string;
} 