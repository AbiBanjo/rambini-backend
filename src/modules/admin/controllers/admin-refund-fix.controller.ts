// src/modules/admin/controllers/admin-refund-fix.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiProperty,
} from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminAuthGuard } from '../../auth/guards/admin-auth-guard';
import { FixCustomerRefundsService, RefundFixResult } from '../service/fix-customer-refunds.service';

class ConfirmationDto {
  @ApiProperty({
    description: 'Confirmation code to authorize the refund operation',
    example: 'FIX_CUSTOMER_REFUNDS_2025',
  })
  @IsString()
  @IsNotEmpty()
  confirmation_code: string;
}

@ApiTags('Admin - Fix Customer Refunds')
@Controller('admin/fix-refunds')
@UseGuards(JwtAuthGuard, AdminAuthGuard)
@ApiBearerAuth()
export class AdminRefundFixController {
  constructor(
    private readonly fixRefundsService: FixCustomerRefundsService,
  ) {}

  @Get('analyze')
  @ApiOperation({
    summary: '[ADMIN ONLY] Analyze cancelled orders that need refunds (DRY RUN)',
    description: `
      This endpoint performs a dry run analysis to identify:
      - Cancelled orders where customers paid (PAID status) but order status is CANCELLED
      - Orders where payment_status is still PAID (not REFUNDED)
      - How much money needs to be refunded to each customer
      
      This does NOT make any changes to the database.
      Use this first to see what will be fixed.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Analysis completed successfully',
  })
  async analyzeRefunds(): Promise<RefundFixResult> {
    return await this.fixRefundsService.analyzeCancelledOrders();
  }

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[ADMIN ONLY] Fix all cancelled orders refunds (MAKES CHANGES)',
    description: `
      ⚠️ WARNING: This makes permanent changes to the database!
      
      This will:
      1. Find all cancelled orders with PAID payment status
      2. Credit customer wallets with full refund amount
      3. Update order payment_status to REFUNDED
      4. Update payment records to show refund
      
      Requires confirmation code: FIX_CUSTOMER_REFUNDS_2025
      
      Always run /analyze first to see what will be changed!
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Refunds processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid confirmation code',
  })
  async fixAllRefunds(
    @Body() body: ConfirmationDto,
  ): Promise<RefundFixResult> {
    return await this.fixRefundsService.fixCancelledOrderRefunds(
      body.confirmation_code,
    );
  }

  @Post('customer/:customerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[ADMIN ONLY] Fix refunds for a specific customer',
    description: `
      Fix all cancelled order refunds for a single customer.
      
      Requires confirmation code: FIX_CUSTOMER_REFUNDS_2025
    `,
  })
  @ApiParam({ name: 'customerId', description: 'Customer User ID' })
  @ApiResponse({
    status: 200,
    description: 'Customer refunds processed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found or no orders need refunds',
  })
  async fixCustomerRefunds(
    @Param('customerId') customerId: string,
    @Body() body: ConfirmationDto,
  ): Promise<RefundFixResult> {
    return await this.fixRefundsService.fixCustomerRefunds(
      customerId,
      body.confirmation_code,
    );
  }

  @Post('order/:orderId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[ADMIN ONLY] Fix refund for a specific order',
    description: `
      Process refund for a single cancelled order.
      
      Requires confirmation code: FIX_ORDER_REFUND_2025
    `,
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order refund processed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Order not eligible for refund',
  })
  async fixOrderRefund(
    @Param('orderId') orderId: string,
    @Body() body: ConfirmationDto,
  ): Promise<{ success: boolean; message: string; details: any }> {
    return await this.fixRefundsService.fixSpecificOrderRefund(
      orderId,
      body.confirmation_code,
    );
  }
}