import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PaymentMethod, PaymentProvider } from 'src/entities';
import { PaymentProviderInterface, PaymentInitiationResult, PaymentVerificationResult, PaymentWebhookResult, RefundResult } from '../interfaces/payment-provider.interface';
import Stripe from 'stripe';
import * as crypto from 'crypto';

@Injectable()
export class StripePaymentService implements PaymentProviderInterface {
  private readonly logger = new Logger(StripePaymentService.name);
  private readonly stripeSecretKey: string;
  private readonly stripeWebhookSecret: string;
  private readonly stripe: Stripe;

  constructor() {
    // Initialize Stripe with secret key from environment
    this.stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
    this.stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    
    if (!this.stripeSecretKey) {
      this.logger.warn('Stripe secret key not configured');
    }

    // Initialize Stripe client
    this.stripe = new Stripe(this.stripeSecretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    });
  }

  async initializePayment(
    amount: number,
    currency: string,
    reference: string,
    metadata?: Record<string, any>
  ): Promise<PaymentInitiationResult> {
    try {
      this.logger.log(`Initializing Stripe payment for reference: ${reference}`);

      if (!this.stripeSecretKey) {
        throw new BadRequestException('Stripe configuration missing');
      }

      const paymentIntent = await this.createStripePaymentIntent(amount, currency, reference, metadata);

      return {
        success: true,
        external_reference: paymentIntent.id,
        payment_url: paymentIntent.client_secret ? `https://checkout.stripe.com/pay/${paymentIntent.id}` : undefined,
        gateway_response: paymentIntent,
      };
    } catch (error) {
      const errorMessage = this.handleStripeError(error);
      this.logger.error(`Stripe payment initialization failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    try {
      this.logger.log(`Verifying Stripe payment: ${reference}`);

      if (!this.stripeSecretKey) {
        throw new BadRequestException('Stripe configuration missing');
      }

      const paymentIntent = await this.retrieveStripePaymentIntent(reference);

      let status: 'pending' | 'completed' | 'failed' | 'cancelled';
      switch (paymentIntent.status) {
        case 'requires_payment_method':
        case 'requires_confirmation':
        case 'requires_action':
          status = 'pending';
          break;
        case 'succeeded':
          status = 'completed';
          break;
        case 'requires_capture':
        case 'canceled':
          status = 'cancelled';
          break;
        default:
          status = 'failed';
      }

      return {
        success: true,
        status,
        external_reference: paymentIntent.id,
        gateway_response: paymentIntent,
      };
    } catch (error) {
      const errorMessage = this.handleStripeError(error);
      this.logger.error(`Stripe payment verification failed: ${errorMessage}`);
      return {
        success: false,
        status: 'failed',
        error: errorMessage,
      };
    }
  }

  async processWebhook(payload: any, signature: string): Promise<PaymentWebhookResult> {
    try {
      this.logger.log('Processing Stripe webhook');

      if (!this.stripeWebhookSecret) {
        throw new BadRequestException('Stripe webhook secret not configured');
      }

      // Verify webhook signature
      const event = await this.verifyStripeWebhook(payload, signature);

      let status: 'pending' | 'completed' | 'failed' | 'cancelled';
      let reference: string;
      let amount: number | undefined;

      switch (event.type) {
        case 'payment_intent.succeeded':
          status = 'completed';
          reference = event.data.object.id;
          amount = event.data.object.amount / 100; // Convert from cents
          break;
        case 'payment_intent.payment_failed':
          status = 'failed';
          reference = event.data.object.id;
          amount = event.data.object.amount / 100;
          break;
        case 'payment_intent.canceled':
          status = 'cancelled';
          reference = event.data.object.id;
          amount = event.data.object.amount / 100;
          break;
        case 'charge.dispute.created':
          status = 'failed';
          reference = typeof event.data.object.payment_intent === 'string' 
            ? event.data.object.payment_intent 
            : event.data.object.payment_intent.id;
          amount = event.data.object.amount / 100;
          break;
        default:
          this.logger.warn(`Unhandled Stripe webhook event: ${event.type}`);
          return {
            success: false,
            reference: '',
            status: 'pending',
            error: `Unhandled event type: ${event.type}`,
          };
      }

      return {
        success: true,
        reference: event.data.object.metadata?.payment_reference || reference,
        status,
        external_reference: reference,
        amount,
        gateway_response: event,
      };
    } catch (error) {
      const errorMessage = this.handleStripeError(error);
      this.logger.error(`Stripe webhook processing failed: ${errorMessage}`);
      return {
        success: false,
        reference: '',
        status: 'failed',
        error: errorMessage,
      };
    }
  }

  async refundPayment(
    reference: string,
    amount?: number,
    reason?: string
  ): Promise<RefundResult> {
    try {
      this.logger.log(`Processing Stripe refund for: ${reference}`);

      if (!this.stripeSecretKey) {
        throw new BadRequestException('Stripe configuration missing');
      }

      const refund = await this.createStripeRefund(reference, amount, reason);

      return {
        success: true,
        refund_reference: refund.id,
        gateway_response: refund,
      };
    } catch (error) {
      const errorMessage = this.handleStripeError(error);
      this.logger.error(`Stripe refund failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  getSupportedPaymentMethods(): PaymentMethod[] {
    return [PaymentMethod.STRIPE];
  }

  // Private helper methods for Stripe API integration
  private async createStripePaymentIntent(
    amount: number,
    currency: string,
    reference: string,
    metadata?: Record<string, any>
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: {
          payment_reference: reference,
          ...metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
        description: `Payment for order ${reference}`,
        statement_descriptor: 'RAMBINI FOOD',
        capture_method: 'automatic',
      });

      this.logger.debug(`Created Stripe PaymentIntent: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error(`Failed to create Stripe PaymentIntent: ${error.message}`);
      throw error;
    }
  }

  private async retrieveStripePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      this.logger.debug(`Retrieved Stripe PaymentIntent: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error(`Failed to retrieve Stripe PaymentIntent: ${error.message}`);
      throw error;
    }
  }

  private async verifyStripeWebhook(payload: any, signature: string): Promise<Stripe.Event> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.stripeWebhookSecret
      );
      
      this.logger.debug(`Verified Stripe webhook: ${event.type}`);
      return event;
    } catch (error) {
      this.logger.error(`Stripe webhook verification failed: ${error.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  private async createStripeRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<Stripe.Refund> {
    try {
      // First, get the charge ID from the payment intent
      const paymentIntent = await this.retrieveStripePaymentIntent(paymentIntentId);
      
      if (!paymentIntent.latest_charge) {
        throw new Error('No charge found for this payment intent');
      }

      const refundParams: Stripe.RefundCreateParams = {
        charge: paymentIntent.latest_charge as string,
        reason: this.mapRefundReason(reason),
      };

      if (amount) {
        refundParams.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await this.stripe.refunds.create(refundParams);
      
      this.logger.debug(`Created Stripe refund: ${refund.id}`);
      return refund;
    } catch (error) {
      this.logger.error(`Failed to create Stripe refund: ${error.message}`);
      throw error;
    }
  }

  private mapRefundReason(reason?: string): Stripe.RefundCreateParams.Reason {
    switch (reason?.toLowerCase()) {
      case 'duplicate':
        return 'duplicate';
      case 'fraudulent':
        return 'fraudulent';
      case 'requested_by_customer':
        return 'requested_by_customer';
      default:
        return 'requested_by_customer';
    }
  }

  private handleStripeError(error: any): string {
    if (error.type === 'StripeCardError') {
      return `Card error: ${error.message}`;
    } else if (error.type === 'StripeRateLimitError') {
      return 'Rate limit exceeded. Please try again later.';
    } else if (error.type === 'StripeInvalidRequestError') {
      return `Invalid request: ${error.message}`;
    } else if (error.type === 'StripeAPIError') {
      return 'Stripe API error. Please try again later.';
    } else if (error.type === 'StripeConnectionError') {
      return 'Network error. Please check your connection.';
    } else if (error.type === 'StripeAuthenticationError') {
      return 'Authentication error. Please check your API keys.';
    } else {
      return error.message || 'An unexpected error occurred';
    }
  }
}
