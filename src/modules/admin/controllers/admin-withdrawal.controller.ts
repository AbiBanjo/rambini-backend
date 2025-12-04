import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminAuthGuard } from '../../auth/guards/admin-auth-guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WithdrawalService } from '../../payment/services/withdrawal.service';
import { WithdrawalResponseDto } from '../../payment/dto/withdrawal-response.dto';
import { AdminWithdrawalActionDto } from '../dto/admin-withdrawal.dto';

@ApiTags('Admin - Withdrawals')
@Controller('admin/withdrawals')
@UseGuards(JwtAuthGuard, AdminAuthGuard)
@ApiBearerAuth()
export class AdminWithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Get('pending')
  @ApiOperation({ summary: 'Get all pending withdrawals' })
  @ApiResponse({
    status: 200,
    description: 'Pending withdrawals retrieved successfully',
    type: [WithdrawalResponseDto],
  })
  async getPendingWithdrawals(): Promise<WithdrawalResponseDto[]> {
    return await this.withdrawalService.getAllPendingWithdrawals();
  }

  @Get('processing')
  @ApiOperation({ summary: 'Get all processing withdrawals' })
  @ApiResponse({
    status: 200,
    description: 'Processing withdrawals retrieved successfully',
    type: [WithdrawalResponseDto],
  })
  async getProcessingWithdrawals(): Promise<WithdrawalResponseDto[]> {
    return await this.withdrawalService.getAllProcessingWithdrawals();
  }

  @Post(':id/done')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark withdrawal as completed' })
  @ApiParam({ name: 'id', description: 'Withdrawal ID' })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal marked as completed successfully',
    type: WithdrawalResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - withdrawal already in final status',
  })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async markWithdrawalAsDone(
    @Request() req: any,
    @Param('id') id: string,
    @Body() actionData: AdminWithdrawalActionDto,
  ): Promise<WithdrawalResponseDto> {
    return await this.withdrawalService.markWithdrawalAsDone(
      id,
      req.user.id,
      actionData,
    );
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark withdrawal as rejected' })
  @ApiParam({ name: 'id', description: 'Withdrawal ID' })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal marked as rejected successfully',
    type: WithdrawalResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - withdrawal already in final status',
  })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async markWithdrawalAsRejected(
    @Request() req: any,
    @Param('id') id: string,
    @Body() actionData: AdminWithdrawalActionDto,
  ): Promise<WithdrawalResponseDto> {
    return await this.withdrawalService.markWithdrawalAsRejected(
      id,
      req.user.id,
      actionData,
    );
  }

  @Post(':id/failed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark withdrawal as failed' })
  @ApiParam({ name: 'id', description: 'Withdrawal ID' })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal marked as failed successfully',
    type: WithdrawalResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - withdrawal already in final status',
  })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async markWithdrawalAsFailed(
    @Request() req: any,
    @Param('id') id: string,
    @Body() actionData: AdminWithdrawalActionDto,
  ): Promise<WithdrawalResponseDto> {
    return await this.withdrawalService.markWithdrawalAsFailed(
      id,
      req.user.id,
      actionData,
    );
  }
}