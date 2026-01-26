// src/modules/admin/controllers/admin-revert-cancellation.controller.ts
import {
  Controller,
  Post,
  Body,
  Param,
  Get,
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
import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminAuthGuard } from '../../auth/guards/admin-auth-guard';
import {
  RevertCancellationService,
  RevertCancellationResult,
  FixVendorBalanceResult,
} from '../service/revert-cancellation.service';

class RevertCancellationDto {
  @ApiProperty({
    description: 'Confirmation code to authorize the revert operation',
    example: 'REVERT_CANCELLATION_2025',
  })
  @IsString()
  @IsNotEmpty()
  confirmation_code: string;
}

class FixVendorBalanceDto {
  @ApiProperty({
    description: 'Amount to adjust (positive to credit, negative to debit)',
    example: 15667.60,
  })
  @IsNumber()
  adjustment_amount: number;

  @ApiProperty({
    description: 'Reason for the adjustment',
    example: 'Fix incorrect refund calculation from order ORD-cc8108df',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    description: 'Confirmation code to authorize the fix',
    example: 'FIX_VENDOR_BALANCE_2025',
  })
  @IsString()
  @IsNotEmpty()
  confirmation_code: string;
}

@ApiTags('Admin - Revert Cancellations')
@Controller('admin/revert-cancellation')
@UseGuards(JwtAuthGuard, AdminAuthGuard)
@ApiBearerAuth()
export class AdminRevertCancellationController {
  constructor(
    private readonly revertService: RevertCancellationService,
  ) {}

  @Post('order/:orderId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[ADMIN ONLY] Revert a cancelled order',
    description: `
      ⚠️ WARNING: This reverses a cancellation and refund!
      
      Use this when an order was incorrectly cancelled or the cancellation needs to be undone.
      
      This will:
      1. Debit customer wallet (take back the refund)
      2. Credit vendor wallet (restore what was debited)
      3. Change order status back to DELIVERED
      4. Update payment status to PAID
      
      Requires confirmation code: REVERT_CANCELLATION_2025
      
      Example use case: Order was delivered but accidentally cancelled
    `,
  })
  @ApiParam({ name: 'orderId', description: 'Order ID to revert' })
  @ApiResponse({
    status: 200,
    description: 'Cancellation reverted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid confirmation code or order not eligible for revert',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  async revertCancellation(
    @Param('orderId') orderId: string,
    @Body() body: RevertCancellationDto,
  ): Promise<RevertCancellationResult> {
    return await this.revertService.revertCancellation(
      orderId,
      body.confirmation_code,
    );
  }

  @Post('vendor/:vendorUserId/fix-balance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[ADMIN ONLY] Manually adjust vendor balance',
    description: `
      ⚠️ WARNING: This directly adjusts vendor wallet balance!
      
      Use this to fix vendor balance when there was an incorrect debit/credit.
      
      Requires confirmation code: FIX_VENDOR_BALANCE_2025
      
      Example: Vendor was debited ₦15,167.60 but should have been ₦8,500
      Adjustment needed: +₦6,667.60 to correct the balance
    `,
  })
  @ApiParam({ name: 'vendorUserId', description: 'Vendor User ID' })
  @ApiResponse({
    status: 200,
    description: 'Vendor balance fixed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid confirmation code',
  })
  @ApiResponse({
    status: 404,
    description: 'Vendor wallet not found',
  })
  async fixVendorBalance(
    @Param('vendorUserId') vendorUserId: string,
    @Body() body: FixVendorBalanceDto,
  ): Promise<FixVendorBalanceResult> {
    return await this.revertService.fixVendorBalance(
      vendorUserId,
      body.adjustment_amount,
      body.reason,
      body.confirmation_code,
    );
  }

  @Get('order/:orderId/calculate-correct-debit')
  @ApiOperation({
    summary: '[ADMIN ONLY] Calculate what the correct vendor debit should be',
    description: `
      This is a helper endpoint to see what the correct vendor debit should have been
      for a specific order. Use this before fixing balances to verify amounts.
    `,
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Calculation completed',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  async calculateCorrectDebit(@Param('orderId') orderId: string) {
    return await this.revertService.calculateCorrectVendorDebit(orderId);
  }
}