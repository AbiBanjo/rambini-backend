import {
  Controller,
  Post,
  Get,
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
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminAuthGuard } from '../../auth/guards/admin-auth-guard';
import { 
  FixCompletedWithdrawalsService,
  FixResult 
} from '../services/withdrawal/fix-completed-withdrawals.service';

@ApiTags('Admin - Fix Withdrawals')
@Controller('admin/fix-withdrawals')
@UseGuards(JwtAuthGuard, AdminAuthGuard)
@ApiBearerAuth()
export class FixCompletedWithdrawalsController {
  constructor(
    private readonly fixWithdrawalsService: FixCompletedWithdrawalsService,
  ) {}

  @Get('analyze')
  @ApiOperation({
    summary: 'Analyze completed withdrawals (DRY RUN)',
    description:
      'Shows what withdrawals need fixing without making any changes. Use this first to review the impact.',
  })
  @ApiResponse({
    status: 200,
    description: 'Analysis completed successfully',
    schema: {
      type: 'object',
      properties: {
        total_completed_withdrawals: { type: 'number' },
        users_affected: { type: 'number' },
        total_amount_to_deduct: { type: 'number' },
        already_fixed_count: { type: 'number' },
        details: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              user_id: { type: 'string' },
              user_email: { type: 'string' },
              withdrawal_id: { type: 'string' },
              amount: { type: 'number' },
              current_balance: { type: 'number' },
              new_balance: { type: 'number' },
              withdrawal_date: { type: 'string' },
              status: { type: 'string', enum: ['success', 'error', 'already_fixed'] },
              error_message: { type: 'string' },
              wallet_debited_at: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async analyzeCompletedWithdrawals(): Promise<FixResult> {
    return await this.fixWithdrawalsService.analyzeCompletedWithdrawals();
  }

  @Post('fix-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fix all completed withdrawals (PERMANENT)',
    description:
      '⚠️ WARNING: This will permanently deduct money from vendor wallets for all completed withdrawals. Run analyze endpoint first!',
  })
  @ApiResponse({
    status: 200,
    description: 'Fix completed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid confirmation code or error during fix',
  })
  async fixAllCompletedWithdrawals(
    @Body() body: { confirmation_code: string },
  ): Promise<FixResult> {
    return await this.fixWithdrawalsService.fixCompletedWithdrawals(
      body.confirmation_code,
    );
  }

  @Post('fix-user/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fix completed withdrawals for a specific user',
    description:
      '⚠️ WARNING: This will permanently deduct money from the vendor wallet for this specific user.',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User withdrawals fixed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid confirmation code or error during fix',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async fixUserCompletedWithdrawals(
    @Param('userId') userId: string,
    @Body() body: { confirmation_code: string },
  ): Promise<FixResult> {
    return await this.fixWithdrawalsService.fixUserCompletedWithdrawals(
      userId,
      body.confirmation_code,
    );
  }

  @Post('mark-as-fixed/:withdrawalId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark a withdrawal as already fixed',
    description: 
      'Use this for legacy withdrawals that were already debited before wallet_debited_at tracking was added. ' +
      'This marks the withdrawal so it won\'t appear in future analysis or fix operations.',
  })
  @ApiParam({ 
    name: 'withdrawalId', 
    description: 'Withdrawal ID to mark as fixed',
    example: 'ad3b7f66-4aba-4964-9932-2842c66e30f3'
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal marked as already fixed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid confirmation code or withdrawal not in COMPLETED status',
  })
  @ApiResponse({
    status: 404,
    description: 'Withdrawal not found',
  })
  async markWithdrawalAsAlreadyFixed(
    @Param('withdrawalId') withdrawalId: string,
    @Body() body: { confirmation_code: string },
  ): Promise<{ success: boolean; message: string }> {
    return await this.fixWithdrawalsService.markWithdrawalAsAlreadyFixed(
      withdrawalId,
      body.confirmation_code,
    );
  }
}