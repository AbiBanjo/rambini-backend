import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminAuthGuard } from '../../auth/guards/admin-auth-guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WithdrawalService } from '../../payment/services/withdrawal';
import { WithdrawalResponseDto } from '../../payment/dto/withdrawal-response.dto';
import { AdminWithdrawalActionDto } from '../dto/admin-withdrawal.dto';
import { WithdrawalStatus } from '../../../entities';

@ApiTags('Admin - Withdrawals')
@Controller('admin/withdrawals')
@UseGuards(JwtAuthGuard, AdminAuthGuard)
@ApiBearerAuth()
export class AdminWithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Get()
  @ApiOperation({ summary: 'Get all withdrawals with optional status filter' })
  @ApiQuery({ 
    name: 'status', 
    enum: WithdrawalStatus, 
    required: false,
    description: 'Filter by withdrawal status'
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawals retrieved successfully',
    type: [WithdrawalResponseDto],
  })
  async getAllWithdrawals(
    @Query('status') status?: WithdrawalStatus,
  ): Promise<WithdrawalResponseDto[]> {
    if (status) {
      return await this.withdrawalService.getWithdrawalsByStatus(status);
    }
    return await this.withdrawalService.getAllWithdrawals();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get withdrawal statistics' })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal stats retrieved successfully',
  })
  async getWithdrawalStats() {
    return await this.withdrawalService.getWithdrawalStats();
  }

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

  @Get('completed')
  @ApiOperation({ summary: 'Get all completed withdrawals' })
  @ApiResponse({
    status: 200,
    description: 'Completed withdrawals retrieved successfully',
    type: [WithdrawalResponseDto],
  })
  async getCompletedWithdrawals(): Promise<WithdrawalResponseDto[]> {
    return await this.withdrawalService.getWithdrawalsByStatus(
      WithdrawalStatus.COMPLETED
    );
  }

  @Get('rejected')
  @ApiOperation({ summary: 'Get all rejected withdrawals' })
  @ApiResponse({
    status: 200,
    description: 'Rejected withdrawals retrieved successfully',
    type: [WithdrawalResponseDto],
  })
  async getRejectedWithdrawals(): Promise<WithdrawalResponseDto[]> {
    return await this.withdrawalService.getWithdrawalsByStatus(
      WithdrawalStatus.REJECTED
    );
  }

  @Get('failed')
  @ApiOperation({ summary: 'Get all failed withdrawals' })
  @ApiResponse({
    status: 200,
    description: 'Failed withdrawals retrieved successfully',
    type: [WithdrawalResponseDto],
  })
  async getFailedWithdrawals(): Promise<WithdrawalResponseDto[]> {
    return await this.withdrawalService.getWithdrawalsByStatus(
      WithdrawalStatus.FAILED
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get withdrawal by ID' })
  @ApiParam({ name: 'id', description: 'Withdrawal ID' })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal retrieved successfully',
    type: WithdrawalResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async getWithdrawalById(@Param('id') id: string): Promise<WithdrawalResponseDto> {
    return await this.withdrawalService.getWithdrawalById(id);
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