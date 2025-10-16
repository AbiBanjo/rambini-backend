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
  Delete,
  Patch,
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
import { StripePaymentService } from '../services/stripe-payment.service';
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
    private readonly stripePaymentService: StripePaymentService,
  ) {}

  @Get('saved-cards')
  @ApiOperation({ summary: 'Get user saved cards' })
  async getSavedCards(@GetUser() user: User): Promise<{ stripe: any[]; paystack: any[] }> {
    const stripeCards = await this.stripePaymentService.getUserSavedCards(user.id);
    const paystackCards = await this.paystackPaymentService.getUserSavedCards(user.id);
    return { stripe: stripeCards, paystack: paystackCards };
  }

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

  // ================= Tokenization (Stripe) ================

  @Post('stripe/setup-intent')
  @ApiOperation({ summary: 'Create Stripe Setup Intent for saving a card (no charge)' })
  async createStripeSetupIntent(
    @GetUser() user: User,
    @Body() body: { email?: string },
  ): Promise<{ success: boolean; client_secret?: string; customer_id?: string; error?: string }> {
    const res = await this.stripePaymentService.createSetupIntentLight(
     user?.email || '', 
      user.id
    );
    return res;
  }

  @Post('stripe/attach-payment-method')
  @ApiOperation({ summary: 'Attach a payment method to a Stripe customer and set default' })
  async attachStripePaymentMethod(
    @GetUser() user: User,
    @Body() body: { customer_id: string; payment_method_id: string },
  ): Promise<{ success: boolean; customer_id?: string; payment_method_id?: string; error?: string }> {
    return await this.stripePaymentService.attachPaymentMethodLight(body.customer_id, body.payment_method_id, user);
  }

  // ================= Tokenization (Paystack) ================

  @Post('paystack/init-with-save')
  @ApiOperation({ summary: 'Initialize Paystack transaction that will save card (authorization_code)' })
  async paystackInitWithSave(
    @GetUser() user: User,
    @Body() body: { amount: number; currency: string; reference: string; email?: string; metadata?: Record<string, any> },
  ): Promise<{ success: boolean; authorization_url?: string; access_code?: string; reference?: string; error?: string }> {
    return await this.paystackPaymentService.initializePaymentWithCardSaveLight(
      user,
      body.reference,
    );
  }

  @Post('paystack/save-authorization')
  @ApiOperation({ summary: 'Verify Paystack reference and return authorization_code to store client-side' })
  async paystackSaveAuthorization(
    @Body() body: { reference: string },
  ): Promise<{ success: boolean; authorization_code?: string; customer_code?: string; card?: any; error?: string }> {
    return await this.paystackPaymentService.extractAuthorizationFromReference(body.reference);
  }

  @Post('paystack/charge-authorization')
  @ApiOperation({ summary: 'Charge a saved Paystack card (provide authorization_code + email)' })
  async paystackChargeAuthorization(
    @Body() body: { authorization_code: string; email: string; amount: number; currency: string; reference: string; metadata?: Record<string, any> },
  ): Promise<{ success: boolean; reference?: string; amount?: number; currency?: string; status?: string; error?: string }> {
    return await this.paystackPaymentService.chargeAuthorizationLight(
      body.authorization_code,
      body.email,
      body.amount,
      body.currency,
      body.reference,
      body.metadata,
    );
  }

  @Delete('saved-cards/:cardId')
  @ApiOperation({ summary: 'Delete a saved card' })
  async deleteSavedCard(
    @GetUser() user: User,
    @Param('cardId') cardId: string,
    @Body() body: { gateway: 'stripe' | 'paystack' },
  ): Promise<{ success: boolean; error?: string }> {
    if (body.gateway === 'stripe') {
      return await this.stripePaymentService.deleteSavedCard(user.id, cardId);
    } else {
      return await this.paystackPaymentService.deleteSavedCard(user.id, cardId);
    }
  }

  @Patch('saved-cards/:cardId/set-default')
  @ApiOperation({ summary: 'Set a saved card as default' })
  async setDefaultCard(
    @GetUser() user: User,
    @Param('cardId') cardId: string,
    @Body() body: { gateway: 'stripe' | 'paystack' },
  ): Promise<{ success: boolean; error?: string }> {
    if (body.gateway === 'stripe') {
      return await this.stripePaymentService.setDefaultCard(user.id, cardId);
    } else {
      return await this.paystackPaymentService.setDefaultCard(user.id, cardId);
    }
  }

  @Post('saved-cards/charge')
  @ApiOperation({ summary: 'Charge a saved card for order payment' })
  async chargeSavedCard(
    @GetUser() user: User,
    @Body() body: { 
      gateway: 'stripe' | 'paystack'; 
      amount: number; 
      currency: string; 
      description: string;
      cardId?: string;
      email?: string;
      reference: string;
      metadata?: Record<string, any>;
    },
  ): Promise<{ success: boolean; payment_intent_id?: string; client_secret?: string; reference?: string; error?: string }> {
    if (body.gateway === 'stripe') {
      return await this.stripePaymentService.chargeSavedCard(
        user.id,
        body.amount,
        body.currency,
        body.description,
        body.cardId,
        body.metadata,
      );
    } else {
      const result = await this.paystackPaymentService.chargeSavedCard(
        user.id,
        body.amount,
        body.currency,
        body.email || user.email,
        body.reference,
        body.cardId,
        body.metadata,
      );
      return {
        success: result.success,
        reference: result.reference,
        error: result.error,
      };
    }
  }
}
