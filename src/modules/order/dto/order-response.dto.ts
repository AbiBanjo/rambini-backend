import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, OrderType, PaymentMethod, PaymentStatus, Currency, PaymentTransactionStatus } from 'src/entities';

export class OrderItemResponseDto {
  @ApiProperty({ description: 'Order item ID' })
  id: string;

  @ApiProperty({ description: 'Menu item ID' })
  menu_item_id: string;

  @ApiProperty({ description: 'Menu item name' })
  menu_item_name: string;

  @ApiPropertyOptional({ description: 'Menu item image' })
  menu_item_image?: string;

  @ApiProperty({ description: 'Quantity ordered' })
  quantity: number;

  @ApiProperty({ description: 'Unit price' })
  unit_price: number;

  @ApiProperty({ description: 'Total price for this item' })
  total_price: number;

  @ApiPropertyOptional({ description: 'Special instructions' })
  special_instructions?: string;

  @ApiPropertyOptional({ description: 'Customizations' })
  customizations?: Record<string, any>;

  @ApiProperty({ description: 'When created' })
  created_at: Date;
}

export class OrderResponseDto {
  @ApiProperty({ description: 'Order ID' })
  id: string;

  @ApiProperty({ description: 'Unique order number' })
  order_number: string;

  @ApiProperty({ description: 'Customer ID' })
  customer_id: string;

  @ApiProperty({ description: 'Customer name' })
  customer_name: string;

  @ApiProperty({ description: 'Customer phone number' })
  customer_phone: string;

  @ApiProperty({ description: 'Vendor ID' })
  vendor_id: string;

  @ApiProperty({ description: 'Vendor business name' })
  vendor_name: string;

  @ApiProperty({ description: 'Delivery address ID' })
  delivery_address_id: string;

  @ApiPropertyOptional({ description: 'Delivery quote ID' })
  delivery_quote_id?: string;

  @ApiProperty({ description: 'Order status', enum: OrderStatus })
  order_status: OrderStatus;

  @ApiProperty({ description: 'Order type', enum: OrderType })
  order_type: OrderType;

  @ApiProperty({ description: 'Payment method', enum: PaymentMethod })
  payment_method: PaymentMethod;

  @ApiProperty({ description: 'Payment status', enum: PaymentStatus })
  payment_status: PaymentStatus;

  @ApiPropertyOptional({ description: 'Payment reference' })
  payment_reference?: string;

  @ApiProperty({ description: 'Subtotal amount' })
  subtotal: number;

  @ApiProperty({ description: 'Delivery fee' })
  delivery_fee: number;

  @ApiProperty({ description: 'Total amount' })
  total_amount: number;

  @ApiProperty({ description: 'Order currency', enum: Currency })
  currency: Currency;

  @ApiPropertyOptional({ description: 'Estimated preparation time in minutes' })
  estimated_prep_time_minutes?: number;

  @ApiPropertyOptional({ description: 'Estimated delivery time' })
  estimated_delivery_time?: Date;

  @ApiPropertyOptional({ description: 'When order was ready' })
  order_ready_at?: Date;

  @ApiPropertyOptional({ description: 'When order was delivered' })
  delivered_at?: Date;

  @ApiPropertyOptional({ description: 'When order was cancelled' })
  cancelled_at?: Date;

  @ApiPropertyOptional({ description: 'Cancellation reason' })
  cancellation_reason?: string;

  @ApiPropertyOptional({ description: 'Who cancelled the order' })
  cancelled_by?: string;

  @ApiPropertyOptional({ description: 'Special delivery instructions' })
  delivery_instructions?: string;

  @ApiPropertyOptional({ description: 'Delivery notes' })
  delivery_notes?: string;

  @ApiPropertyOptional({ description: 'Customer rating (1-5)' })
  customer_rating?: number;

  @ApiPropertyOptional({ description: 'Customer review' })
  customer_review?: string;

  @ApiPropertyOptional({ description: 'Vendor notes' })
  vendor_notes?: string;

  @ApiProperty({ description: 'When order was created' })
  created_at: Date;

  @ApiProperty({ description: 'When order was last updated' })
  updated_at: Date;

  @ApiProperty({ description: 'Order items' })
  order_items: OrderItemResponseDto[];

  @ApiProperty({ description: 'Delivery address details' })
  delivery_address: {
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code?: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };

  @ApiPropertyOptional({ description: 'Pickup address details (vendor address)' })
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
} 


export class OrderPaymentResponseDto {
  @ApiProperty({ description: 'Payment URL' })
  payment_url: string;

  @ApiProperty({ description: 'External payment reference' })
  external_payment_reference: string;

  @ApiProperty({ description: 'Payment processing status' })
  payment_processing_status: PaymentTransactionStatus;

}