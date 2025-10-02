import {
  Controller,
  Post,
  Body,
  Headers,
  Param,
  Logger,
  BadRequestException,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { PaymentService } from '../services/payment.service';
import { PaymentProvider } from 'src/entities';

@ApiTags('payment-webhooks')
@Controller('webhooks/payments')
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post('stripe')
  @ApiOperation({ summary: 'Handle Stripe payment webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid webhook data' })
  @ApiHeader({ name: 'stripe-signature', description: 'Stripe webhook signature' })
  async handleStripeWebhook(
    @Req() request : any,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    this.logger.log('Received Stripe webhook');
    
    try {
      if (!request.rawBody) {
        console.error('No raw body found in request');
        throw new BadRequestException('No raw body found in request');
      }
      await this.paymentService.processWebhook(
        PaymentProvider.STRIPE,
        request.rawBody,
        signature,
      );
      
      return { received: true };
    } catch (error) {
      this.logger.error(`Stripe webhook processing failed: ${error.message}`);
      throw new BadRequestException('Webhook processing failed');
    }
  }

  @Post('paystack')
  @ApiOperation({ summary: 'Handle Paystack payment webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid webhook data' })
  @ApiHeader({ name: 'x-paystack-signature', description: 'Paystack webhook signature' })
  async handlePaystackWebhook(
    @Body() payload: any,
    @Headers('x-paystack-signature') signature: string,
  ): Promise<{ received: boolean }> {
    this.logger.log('Received Paystack webhook');
    
    try {
      await this.paymentService.processWebhook(
        PaymentProvider.PAYSTACK,
        payload,
        signature,
      );
      
      return { received: true };
    } catch (error) {
      this.logger.error(`Paystack webhook processing failed: ${error.message}`);
      throw new BadRequestException('Webhook processing failed');
    }
  }

  @Post('mercury')
  @ApiOperation({ summary: 'Handle Mercury payment webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid webhook data' })
  @ApiHeader({ name: 'x-mercury-signature', description: 'Mercury webhook signature' })
  async handleMercuryWebhook(
    @Body() payload: any,
    @Headers('x-mercury-signature') signature: string,
  ): Promise<{ received: boolean }> {
    this.logger.log('Received Mercury webhook');
    
    try {
      await this.paymentService.processWebhook(
        PaymentProvider.MERCURY,
        payload,
        signature,
      );
      
      return { received: true };
    } catch (error) {
      this.logger.error(`Mercury webhook processing failed: ${error.message}`);
      throw new BadRequestException('Webhook processing failed');
    }
  }

  @Post('generic/:provider')
  @ApiOperation({ summary: 'Handle generic payment webhook' })
  @ApiParam({ name: 'provider', description: 'Payment provider', enum: PaymentProvider })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid webhook data' })
  async handleGenericWebhook(
    @Param('provider') provider: PaymentProvider,
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ): Promise<{ received: boolean }> {
    this.logger.log(`Received generic webhook for provider: ${provider}`);
    
    try {
      // Extract signature from headers (different providers use different header names)
      const signature = headers['stripe-signature'] || 
                      headers['x-paystack-signature'] || 
                      headers['x-mercury-signature'] || 
                      headers['signature'] || 
                      '';
      
      await this.paymentService.processWebhook(
        provider,
        payload,
        signature,
      );
      
      return { received: true };
    } catch (error) {
      this.logger.error(`Generic webhook processing failed for ${provider}: ${error.message}`);
      throw new BadRequestException('Webhook processing failed');
    }
  }
}
