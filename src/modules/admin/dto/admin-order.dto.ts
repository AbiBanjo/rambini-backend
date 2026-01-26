// src/modules/admin/dto/admin-order.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { OrderResponseDto } from '../../order/dto';

export class AdminCancelOrderDto {
  @ApiProperty({
    description: 'Reason for cancelling the order',
    example: 'Customer requested cancellation due to delayed preparation',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class RefundBreakdownDto {
  @ApiProperty({ description: 'Subtotal amount (food cost)', example: 10000 })
  subtotal: number;

  @ApiProperty({ description: 'Platform service fee (15% of subtotal)', example: 1500 })
  service_fee: number;

  @ApiProperty({ description: 'Delivery fee charged', example: 3667.60 })
  delivery_fee: number;

  @ApiProperty({ description: 'Total order amount', example: 15167.60 })
  total_amount: number;

  @ApiProperty({ 
    description: 'Amount vendor actually received (subtotal - service fee)', 
    example: 8500 
  })
  vendor_received_amount: number;
}

export class RefundDetailsDto {
  @ApiProperty({ description: 'Whether refund was processed', example: true })
  refund_processed: boolean;

  @ApiPropertyOptional({ 
    description: 'Amount refunded to customer (full order total)', 
    example: 15167.60 
  })
  customer_refund_amount?: number;

  @ApiPropertyOptional({ 
    description: 'Amount debited from vendor (only what they received)', 
    example: 8500 
  })
  vendor_debit_amount?: number;

  @ApiPropertyOptional({ 
    description: 'Amount absorbed by platform (service fee + delivery fee)', 
    example: 6667.60 
  })
  platform_absorbed_amount?: number;

  @ApiPropertyOptional({ description: 'Currency code', example: 'NGN' })
  currency?: string;

  @ApiPropertyOptional({ 
    description: 'Detailed breakdown of amounts',
    type: RefundBreakdownDto 
  })
  breakdown?: RefundBreakdownDto;

  @ApiPropertyOptional({ 
    description: 'Customer wallet balance before refund', 
    example: 9832.40 
  })
  customer_previous_balance?: number;

  @ApiPropertyOptional({ 
    description: 'Customer wallet balance after refund', 
    example: 25000.00 
  })
  customer_new_balance?: number;

  @ApiPropertyOptional({ 
    description: 'Vendor wallet balance before debit', 
    example: 8000.00 
  })
  vendor_previous_balance?: number;

  @ApiPropertyOptional({ 
    description: 'Vendor wallet balance after debit', 
    example: -500.00 
  })
  vendor_new_balance?: number;

  @ApiPropertyOptional({ 
    description: 'Reason for no refund', 
    example: 'Payment status was PENDING' 
  })
  reason?: string;
}

export class AdminInfoDto {
  @ApiProperty({ description: 'Admin user ID', example: 'admin-uuid' })
  admin_id: string;

  @ApiProperty({ 
    description: 'Admin email address', 
    example: 'admin@rambini.com' 
  })
  admin_email: string;

  @ApiProperty({ 
    description: 'Timestamp when order was cancelled',
    example: '2025-12-17T21:02:02.000Z'
  })
  cancelled_at: Date;

  @ApiProperty({ 
    description: 'Reason provided for cancellation',
    example: 'Customer requested cancellation'
  })
  cancellation_reason: string;
}

export class AdminCancelOrderResponseDto {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({ 
    description: 'Success or error message',
    example: 'Order cancelled successfully. Customer refunded ₦15,167.60. Vendor debited ₦8,500.00. Platform absorbed ₦6,667.60 (service fee + delivery fee).'
  })
  message: string;

  @ApiProperty({ 
    description: 'Updated order details',
    type: OrderResponseDto 
  })
  order: OrderResponseDto;

  @ApiProperty({ 
    description: 'Refund processing details',
    type: RefundDetailsDto 
  })
  refund_details: RefundDetailsDto;

  @ApiProperty({ 
    description: 'Information about the admin who cancelled the order',
    type: AdminInfoDto 
  })
  admin_info: AdminInfoDto;
}