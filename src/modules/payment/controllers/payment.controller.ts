import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  UseGuards,
  Query,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PaymentService } from '../services/payment.service';
import { PaystackPaymentService } from '../services/paystack-payment.service';
import { WalletPaymentService } from '../services/wallet-payment.service';
import {
  ProcessPaymentDto,
  PaymentResponseDto,
  PaymentWebhookDto,
  FundWalletDto,
  WalletFundingResponseDto,
  WalletFundingStatusDto,
  WalletBalanceDto,
  VerifyWalletFundingDto,
} from '../dto';
import { BankListResponseDto } from '../dto/bank-list.dto';
import { TransactionHistoryResponseDto, TransactionQueryDto, TransactionDto } from '../dto/transaction-history.dto';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { User } from '@/entities';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly paystackPaymentService: PaystackPaymentService,
    private readonly walletPaymentService: WalletPaymentService,
  ) {}


  @Get('banks')
  @ApiOperation({ summary: 'Get list of banks from Paystack' })
  @ApiResponse({ 
    status: 200, 
    description: 'Banks retrieved successfully', 
    type: BankListResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Bad request - Paystack configuration missing' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error - Failed to fetch banks' })
  async getBanks(@GetUser() user: User): Promise<BankListResponseDto> {
    this.logger.log('Fetching banks from Paystack');
    return await this.paystackPaymentService.getBanks();
  }

   // Transaction History Endpoints

   @Get('transactions')
   @ApiOperation({ summary: 'Get user transaction history with pagination and filters' })
   @ApiResponse({ 
     status: 200, 
     description: 'Transaction history retrieved successfully', 
     type: TransactionHistoryResponseDto 
   })
   @ApiResponse({ status: 401, description: 'Unauthorized' })
   @ApiResponse({ status: 404, description: 'User wallet not found' })
   async getTransactionHistory(
     @GetUser() user: User,
   ) {
     this.logger.log(`Getting transaction history for user ${user.id}`);
     return await this.walletPaymentService.getTransactionHistory(user.id);
   }

  @Post('process')
  @ApiOperation({ summary: 'Process payment for an order' })
  @ApiResponse({ status: 201, description: 'Payment processed successfully', type: PaymentResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid payment data or insufficient balance' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async processPayment(
    @GetUser() user: User,
    @Body() processPaymentDto: ProcessPaymentDto,
  ): Promise<PaymentResponseDto> {
    return await this.paymentService.processPayment(processPaymentDto);
  }

  @Get('verify/:reference')
  @ApiOperation({ summary: 'Verify payment status by reference' })
  @ApiParam({ name: 'reference', description: 'Payment reference' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved successfully', type: PaymentResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async verifyPayment(
    @Param('reference') reference: string,
  ): Promise<PaymentResponseDto> {
    return await this.paymentService.verifyPayment(reference);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully', type: PaymentResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentById(
    @Param('id') id: string,
  ): Promise<PaymentResponseDto> {
    return await this.paymentService.getPaymentById(id);
  }

  @Post('refund/:id')
  @ApiOperation({ summary: 'Refund a payment' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment refunded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid refund data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async refundPayment(
    @Param('id') id: string,
    @Body() body: { amount?: number; reason?: string },
  ): Promise<{ message: string }> {
    await this.paymentService.refundPayment(id, body.amount, body.reason);
    return { message: 'Payment refunded successfully' };
  }

  // Wallet Funding Endpoints

  @Post('wallet/fund')
  @ApiOperation({ summary: 'Fund user wallet with external payment method' })
  @ApiResponse({ 
    status: 201, 
    description: 'Wallet funding initiated successfully', 
    type: WalletFundingResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid funding data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async fundWallet(
    @GetUser() user: User,
    @Body() fundWalletDto: FundWalletDto,
  ): Promise<WalletFundingResponseDto> {
    this.logger.log(`Funding wallet for user ${user.id}`);
    return await this.paymentService.fundWallet(user, fundWalletDto);
  }

  @Get('wallet/balance')
  @ApiOperation({ summary: 'Get user wallet balance and details' })
  @ApiResponse({ 
    status: 200, 
    description: 'Wallet balance retrieved successfully', 
    type: WalletBalanceDto 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getWalletBalance(
    @GetUser() user: User,
  ): Promise<WalletBalanceDto> {
    return await this.paymentService.getWalletBalance(user.id);
  }

  @Get('wallet/funding/:reference')
  @ApiOperation({ summary: 'Get wallet funding transaction status' })
  @ApiParam({ name: 'reference', description: 'Wallet funding reference' })
  @ApiResponse({ 
    status: 200, 
    description: 'Funding status retrieved successfully', 
    type: WalletFundingStatusDto 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Funding transaction not found' })
  async getFundingStatus(
    @Param('reference') reference: string,
  ): Promise<WalletFundingStatusDto> {
    return await this.paymentService.getFundingStatus(reference);
  }

  @Post('wallet/funding/verify')
  @ApiOperation({ summary: 'Verify wallet funding payment with payment provider' })
  @ApiResponse({ 
    status: 200, 
    description: 'Funding verification completed', 
    type: WalletFundingStatusDto 
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid verification data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Funding transaction not found' })
  async verifyFunding(
    @Body() verifyDto: VerifyWalletFundingDto,
  ): Promise<WalletFundingStatusDto> {
    return await this.paymentService.verifyFunding(verifyDto.reference);
  }

  @Post('wallet/funding/complete/:reference')
  @ApiOperation({ 
    summary: 'Complete wallet funding after successful external payment (for webhooks)' 
  })
  @ApiParam({ name: 'reference', description: 'Wallet funding reference' })
  @ApiResponse({ 
    status: 200, 
    description: 'Wallet funding completed successfully', 
    type: WalletFundingStatusDto 
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid completion data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Funding transaction not found' })
  async completeFunding(
    @Param('reference') reference: string,
    @Body() body: { 
      external_reference?: string; 
      gateway_response?: any; 
    },
  ): Promise<WalletFundingStatusDto> {
    return await this.paymentService.completeFunding(
      reference,
      body.external_reference,
      body.gateway_response,
    );
  }


  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Transaction retrieved successfully', 
    type: TransactionDto 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransactionById(
    @GetUser() user: User,
    @Param('id') transactionId: string,
  ): Promise<TransactionDto> {
    this.logger.log(`Getting transaction ${transactionId} for user ${user.id}`);
    return await this.walletPaymentService.getTransactionById(user.id, transactionId);
  }
}
