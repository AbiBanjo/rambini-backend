import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PaymentMethod, PaymentProvider } from 'src/entities';
import { PaymentProviderInterface, PaymentInitiationResult, PaymentVerificationResult, PaymentWebhookResult, RefundResult } from '../interfaces/payment-provider.interface';
import { createHmac } from 'crypto';

@Injectable()
export class PaystackPaymentService implements PaymentProviderInterface {
  private readonly logger = new Logger(PaystackPaymentService.name);
  private readonly paystackSecretKey: string;
  private readonly paystackPublicKey: string;
  private readonly pay: string;
  private readonly paystackBaseUrl: string = 'https://api.paystack.co';
  private readonly paystackCallbackUrl: string;

  constructor() {
    this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';
    this.paystackPublicKey = process.env.PAYSTACK_PUBLIC_KEY || '';
    this.pay = process.env.PAYSTACK_WEBHOOK_SECRET || '';
    this.paystackCallbackUrl = process.env.PAYSTACK_CALLBACK_URL || `${process.env.APP_URL}/payment/callback`
    
    if (!this.paystackSecretKey) {
      this.logger.warn('Paystack secret key not configured');
    }
  }

  async initializePayment(
    amount: number,
    currency: string,
    reference: string,
    email?: string,
    metadata?: Record<string, any>
  ): Promise<PaymentInitiationResult> {
    try {
      this.logger.log(`Initializing Paystack payment for reference: ${reference}`);

      if (!this.paystackSecretKey) {
        throw new BadRequestException('Paystack configuration missing');
      }

      const transaction = await this.createPaystackTransaction(amount, currency, reference,email);

      if (!transaction.status) {
        throw new Error('Failed to initialize payment with Paystack');
      }

      return {
        success: true,
        external_reference: transaction.data.reference,
        payment_url: transaction.data.authorization_url,
        gateway_response: transaction,
      };
    } catch (error) {
      this.logger.error(`Paystack payment initialization failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    try {
      this.logger.log(`Verifying Paystack payment: ${reference}`);

      if (!this.paystackSecretKey) {
        throw new BadRequestException('Paystack configuration missing');
      }

      const transaction = await this.verifyPaystackTransaction(reference);

      if (!transaction.status) {
        throw new Error('Failed to verify payment with Paystack');
      }

      let status: 'pending' | 'completed' | 'failed' | 'cancelled';
      switch (transaction.data.status) {
        case 'pending':
          status = 'pending';
          break;
        case 'success':
          status = 'completed';
          break;
        case 'failed':
          status = 'failed';
          break;
        case 'cancelled':
          status = 'cancelled';
          break;
        default:
          status = 'failed';
      }

      return {
        success: true,
        status,
        external_reference: transaction.data.reference,
        gateway_response: transaction,
      };
    } catch (error) {
      this.logger.error(`Paystack payment verification failed: ${error.message}`);
      return {
        success: false,
        status: 'failed',
        error: error.message,
      };
    }
  }

  async processWebhook(payload: any, signature: string): Promise<PaymentWebhookResult> {
    try {
      this.logger.log('Processing Paystack webhook');

      if (!this.paystackSecretKey) {
        throw new BadRequestException('Paystack webhook secret not configured');
      }

      // Verify webhook signature
      const isValid = this.verifyWebhookSignature(payload, signature);
      if (!isValid) {
        throw new BadRequestException('Invalid webhook signature');
      }

      const event = payload;
      this.logger.log(`Paystack webhook event: ${JSON.stringify(event)}`);

      let status: 'pending' | 'completed' | 'failed' | 'cancelled';
      let reference: string;
      let amount: number | undefined;

      switch (event.event) {
        case 'charge.success':
          status = 'completed';
          reference = event.data.reference;
          amount = event.data.amount / 100; // Convert from kobo
          break;
        case 'charge.failed':
          status = 'failed';
          reference = event.data.reference;
          amount = event.data.amount / 100;
          break;
        case 'transfer.success':
          status = 'completed';
          reference = event.data.reference;
          amount = event.data.amount / 100;
          break;
        case 'transfer.failed':
          status = 'failed';
          reference = event.data.reference;
          amount = event.data.amount / 100;
          break;
        default:
          this.logger.warn(`Unhandled Paystack webhook event: ${event.event}`);
          return {
            success: false,
            reference: '',
            status: 'pending',
            error: `Unhandled event type: ${event.event}`,
          };
      }

      this.logger.log(`Paystack webhook reference: ${reference}`);
      this.logger.log(`Paystack webhook status: ${status}`);
      this.logger.log(`Paystack webhook amount: ${amount}`);
      this.logger.log(`Paystack webhook event: ${JSON.stringify(event)}`);

      return {
        success: true,
        reference: event.data.metadata?.payment_reference || reference,
        status,
        external_reference: reference,
        amount,
        gateway_response: event,
      };
    } catch (error) {
      this.logger.error(`Paystack webhook processing failed: ${error.message}`);
      return {
        success: false,
        reference: '',
        status: 'failed',
        error: error.message,
      };
    }
  }

  async refundPayment(
    reference: string,
    amount?: number,
    reason?: string
  ): Promise<RefundResult> {
    try {
      this.logger.log(`Processing Paystack refund for: ${reference}`);

      if (!this.paystackSecretKey) {
        throw new BadRequestException('Paystack configuration missing');
      }

      const refund = await this.createPaystackRefund(reference, amount, reason);

      if (!refund.status) {
        throw new Error('Failed to create refund with Paystack');
      }

      return {
        success: true,
        refund_reference: refund.data.reference,
        gateway_response: refund,
      };
    } catch (error) {
      this.logger.error(`Paystack refund failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  getSupportedPaymentMethods(): PaymentMethod[] {
    return [PaymentMethod.PAYSTACK];
  }

  async getBanks(): Promise<any> {
    try {
      this.logger.log('Fetching banks from Paystack');

      if (!this.paystackSecretKey) {
        throw new BadRequestException('Paystack configuration missing');
      }

      const url = `${this.paystackBaseUrl}/bank`;
      const response = await this.makePaystackRequest('GET', url);

      if (!response.status) {
        throw new Error('Failed to fetch banks from Paystack');
      }

      return response;
    } catch (error) {
      this.logger.error(`Failed to fetch banks: ${error.message}`);
      throw error;
    }
  }

  // Private helper methods for Paystack API integration
  private async createPaystackTransaction(
    amount: number,
    currency: string,
    reference: string,
    email?: string,
    metadata?: Record<string, any>
  ): Promise<any> {
    const url = `${this.paystackBaseUrl}/transaction/initialize`;
    
    const requestBody = {
      amount: Math.round(amount * 100), // Convert to kobo
      currency: currency.toUpperCase(),
      email: email,
      reference: reference,
      metadata: {
        payment_reference: reference,
        ...metadata,
      },
      callback_url: this.paystackCallbackUrl,
    };

    const response = await this.makePaystackRequest('POST', url, requestBody);
    return response;
  }

  private async verifyPaystackTransaction(reference: string): Promise<any> {
    const url = `${this.paystackBaseUrl}/transaction/verify/${reference}`;
    
    const response = await this.makePaystackRequest('GET', url);
    return response;
  }

  private verifyWebhookSignature(payload: any, signature: string): boolean {
    try {
      const hash = createHmac('sha512', this.paystackSecretKey)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      return hash === signature;
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      return false;
    }
  }

  private async createPaystackRefund(
    reference: string,
    amount?: number,
    reason?: string
  ): Promise<any> {
    const url = `${this.paystackBaseUrl}/refund`;
    
    const requestBody: any = {
      transaction: reference,
      reason: reason || 'requested_by_customer',
    };

    if (amount) {
      requestBody.amount = Math.round(amount * 100); // Convert to kobo
    }

    const response = await this.makePaystackRequest('POST', url, requestBody);
    return response;
  }

  private async makePaystackRequest(method: string, url: string, body?: any): Promise<any> {
    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.paystackSecretKey}`,
        'Content-Type': 'application/json',
      };

      const requestOptions: RequestInit = {
        method,
        headers,
      };

      if (body && method !== 'GET') {
        requestOptions.body = JSON.stringify(body);
      }

      this.logger.debug(`Making ${method} request to ${url}`);
      
      const response = await fetch(url, requestOptions);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Paystack API error: ${data.message || 'Unknown error'}`);
      }

      if (!data.status) {
        throw new Error(`Paystack API returned error: ${data.message || 'Unknown error'}`);
      }

      return data;
    } catch (error) {
      this.logger.error(`Paystack API request failed: ${error.message}`);
      throw error;
    }
  }
}
