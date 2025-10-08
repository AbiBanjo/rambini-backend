import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  UseGuards, 
  Request, 
  Param, 
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WithdrawalService } from '../services/withdrawal.service';
import { 
  WithdrawalOtpRequestDto, 
  WithdrawalRequestDto, 
  WithdrawalResponseDto,
  AdminWithdrawalActionDto,
  BankCreateDto,
  BankUpdateDto,
  BankResponseDto
} from '../dto';
import { User } from '@/entities';
import { GetUser } from '@/common/decorators/get-user.decorator';

@ApiTags('Withdrawal')
@Controller('withdrawal')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Get('banks')
  @ApiOperation({ summary: 'Get user bank accounts' })
  @ApiResponse({ 
    status: 200, 
    description: 'Bank accounts retrieved successfully',
    type: [BankResponseDto]
  })
  async getUserBanks(@GetUser() user: User): Promise<BankResponseDto[]> {
    return await this.withdrawalService.getUserBanks(user.id);
  }


  @Post('otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate withdrawal OTP' })
  @ApiResponse({ 
    status: 200, 
    description: 'OTP generated and sent successfully',
    schema: {
      type: 'object',
      properties: {
        otpId: { type: 'string', example: 'otp_123456' },
        message: { type: 'string', example: 'Withdrawal OTP sent to your email successfully' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - insufficient balance or active withdrawal exists' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async generateWithdrawalOTP(
   @GetUser() user: User,
   @Body() withdrawalOtpRequest: WithdrawalOtpRequestDto
  ) {
    return await this.withdrawalService.generateWithdrawalOTP(user.id, withdrawalOtpRequest.amount);
  }

  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request withdrawal' })
  @ApiResponse({ 
    status: 201, 
    description: 'Withdrawal request created successfully',
    type: WithdrawalResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data or insufficient balance' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid OTP' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async requestWithdrawal(
    @Request() req: any,
    @Body() withdrawalRequest: WithdrawalRequestDto
  ): Promise<WithdrawalResponseDto> {
    return await this.withdrawalService.requestWithdrawal(req.user.id, withdrawalRequest);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user withdrawal history' })
  @ApiResponse({ 
    status: 200, 
    description: 'Withdrawal history retrieved successfully',
    type: [WithdrawalResponseDto]
  })
  async getWithdrawalHistory(@Request() req: any): Promise<WithdrawalResponseDto[]> {
    return await this.withdrawalService.getWithdrawalsByUser(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get withdrawal by ID' })
  @ApiParam({ name: 'id', description: 'Withdrawal ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Withdrawal retrieved successfully',
    type: WithdrawalResponseDto
  })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async getWithdrawalById(
    @Request() req: any,
    @Param('id') id: string
  ): Promise<WithdrawalResponseDto> {
    return await this.withdrawalService.getWithdrawalById(id);
  }

  // Bank management endpoints
  @Post('banks')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new bank account' })
  @ApiResponse({ 
    status: 201, 
    description: 'Bank account created successfully',
    type: BankResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad request - duplicate bank account or invalid data' })
  async createBank(
    @GetUser() user: User,
    @Body() bankData: BankCreateDto
  ): Promise<BankResponseDto> {
    return await this.withdrawalService.createBank(user.id, bankData);
  }


  @Get('banks/:id')
  @ApiOperation({ summary: 'Get bank account by ID' })
  @ApiParam({ name: 'id', description: 'Bank account ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Bank account retrieved successfully',
    type: BankResponseDto
  })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  async getBankById(
    @GetUser() user: User,
    @Param('id') id: string
  ): Promise<BankResponseDto> {
    return await this.withdrawalService.getBankById(user.id, id);
  }

  @Post('banks/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update bank account' })
  @ApiParam({ name: 'id', description: 'Bank account ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Bank account updated successfully',
    type: BankResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad request - duplicate bank account or invalid data' })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  async updateBank(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() bankData: BankUpdateDto
  ): Promise<BankResponseDto> {
    return await this.withdrawalService.updateBank(user.id, id, bankData);
  }

  @Post('banks/:id/delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete bank account' })
  @ApiParam({ name: 'id', description: 'Bank account ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Bank account deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Bank deleted successfully' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  async deleteBank(
    @GetUser() user: User,
    @Param('id') id: string
  ): Promise<{ message: string }> {
    return await this.withdrawalService.deleteBank(user.id, id);
  }
}

@ApiTags('Admin - Withdrawal')
@Controller('admin/withdrawal')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminWithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Get('pending')
  @ApiOperation({ summary: 'Get all pending withdrawals' })
  @ApiResponse({ 
    status: 200, 
    description: 'Pending withdrawals retrieved successfully',
    type: [WithdrawalResponseDto]
  })
  async getPendingWithdrawals(): Promise<WithdrawalResponseDto[]> {
    return await this.withdrawalService.getAllPendingWithdrawals();
  }

  @Get('processing')
  @ApiOperation({ summary: 'Get all processing withdrawals' })
  @ApiResponse({ 
    status: 200, 
    description: 'Processing withdrawals retrieved successfully',
    type: [WithdrawalResponseDto]
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
    type: WithdrawalResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad request - withdrawal already in final status' })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async markWithdrawalAsDone(
    @Request() req: any,
    @Param('id') id: string,
    @Body() actionData: AdminWithdrawalActionDto
  ): Promise<WithdrawalResponseDto> {
    return await this.withdrawalService.markWithdrawalAsDone(id, req.user.id, actionData);
  }

  @Post(':id/failed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark withdrawal as failed' })
  @ApiParam({ name: 'id', description: 'Withdrawal ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Withdrawal marked as failed successfully',
    type: WithdrawalResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad request - withdrawal already in final status' })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async markWithdrawalAsFailed(
    @Request() req: any,
    @Param('id') id: string,
    @Body() actionData: AdminWithdrawalActionDto
  ): Promise<WithdrawalResponseDto> {
    return await this.withdrawalService.markWithdrawalAsFailed(id, req.user.id, actionData);
  }

  @Post(':id/rejected')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark withdrawal as rejected' })
  @ApiParam({ name: 'id', description: 'Withdrawal ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Withdrawal marked as rejected successfully',
    type: WithdrawalResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad request - withdrawal already in final status' })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async markWithdrawalAsRejected(
    @Request() req: any,
    @Param('id') id: string,
    @Body() actionData: AdminWithdrawalActionDto
  ): Promise<WithdrawalResponseDto> {
    return await this.withdrawalService.markWithdrawalAsRejected(id, req.user.id, actionData);
  }
}
