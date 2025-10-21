import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { PaymentMethod, PaymentProvider, User } from 'src/entities';
import { PaymentProviderInterface, PaymentInitiationResult, PaymentVerificationResult, PaymentWebhookResult, RefundResult } from '../interfaces/payment-provider.interface';
import { SavedCard, PaymentGateway } from 'src/entities';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createHmac } from 'crypto';
import { UserBindingContextSolution } from 'twilio/lib/rest/ipMessaging/v2/service/user/userBinding';

@Injectable()
export class PaystackPaymentService implements PaymentProviderInterface {
  private readonly logger = new Logger(PaystackPaymentService.name);
  private readonly paystackSecretKey: string;
  private readonly paystackPublicKey: string;
  private readonly pay: string;
  private readonly paystackBaseUrl: string = 'https://api.paystack.co';
  private readonly paystackCallbackUrl: string;

  constructor(
    @Inject(getRepositoryToken(SavedCard))
    private savedCardRepository: Repository<SavedCard>,
  ) {
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

  // =============== Minimal tokenization helpers (no DB writes) ===============
  async initializePaymentWithCardSaveLight(
    user:User,
    reference : string
  ): Promise<{ success: boolean; authorization_url?: string; access_code?: string; reference?: string; error?: string }> {
    try {
      if (!this.paystackSecretKey) throw new BadRequestException('Paystack configuration missing');
      const url = `${this.paystackBaseUrl}/transaction/initialize`;
      const requestBody = {
        amount: "10000",
        currency: "ngn",
        email:user.email,
        reference: reference,
        channels: ['card'],
        metadata: { 
          save_card: true, 
          user_id: user.id,
        },
        callback_url: this.paystackCallbackUrl,
      };
      const response = await this.makePaystackRequest('POST', url, requestBody);
      return {
        success: true,
        authorization_url: response.data.authorization_url,
        access_code: response.data.access_code,
        reference: response.data.reference,
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async extractAuthorizationFromReference(
    reference: string,
  ): Promise<{ success: boolean; authorization_code?: string; customer_code?: string; card?: any; error?: string }> {
    try {
      const verification = await this.verifyPaystackTransaction(reference);
      if (!verification.status || verification.data.status !== 'success') {
        throw new BadRequestException('Transaction not successful');
      }
      const authorization = verification.data.authorization;
      const customer = verification.data.customer;
      return {
        success: true,
        authorization_code: authorization.authorization_code,
        customer_code: customer.customer_code,
        card: {
          last4: authorization.last4,
          brand: authorization.card_type || authorization.brand,
          exp_month: parseInt(authorization.exp_month),
          exp_year: parseInt(authorization.exp_year),
          country: authorization.country_code,
        },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async chargeAuthorizationLight(
    authorizationCode: string,
    email: string,
    amount: number,
    currency: string,
    reference: string,
    metadata?: Record<string, any>,
  ): Promise<{ success: boolean; reference?: string; amount?: number; currency?: string; status?: string; error?: string }> {
    try {
      if (!this.paystackSecretKey) throw new BadRequestException('Paystack configuration missing');
      const url = `${this.paystackBaseUrl}/transaction/charge_authorization`;
      const requestBody = {
        authorization_code: authorizationCode,
        email,
        amount: Math.round(amount * 100),
        currency: currency.toUpperCase(),
        reference,
        metadata,
      };
      const response = await this.makePaystackRequest('POST', url, requestBody);
      return {
        success: true,
        reference: response.data.reference,
        amount: response.data.amount / 100,
        currency: response.data.currency,
        status: response.data.status,
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
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
          // Handle card tokenization - save authorization_code to database
          await this.handleChargeSuccess(event.data);
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

    this.logger.log(`currency: ${currency}`);
    
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

  // =============== Webhook handlers for card tokenization ===============
  
  private async handleChargeSuccess(chargeData: any): Promise<void> {
    try {
      this.logger.log(`Processing charge.success for ${chargeData.reference}`);
      
      const authorization = chargeData.authorization;
      const customer = chargeData.customer;
      
      if (!authorization || !authorization.authorization_code) {
        this.logger.warn('Charge success missing authorization data');
        return;
      }

      // Extract user_id from metadata
      const userId = chargeData.metadata?.user_id || customer?.metadata?.user_id;
      if (!userId) {
        this.logger.warn('No user_id found in charge metadata');
        return;
      }

      // Check if card already exists
      const existingCard = await this.savedCardRepository.findOne({
        where: { paystack_authorization_code: authorization.authorization_code }
      });

      if (existingCard) {
        this.logger.log(`Card ${authorization.authorization_code} already exists in database`);
        return;
      }

      // Save card to database
      const savedCard = this.savedCardRepository.create({
        user_id: userId,
        gateway: PaymentGateway.PAYSTACK,
        paystack_customer_code: customer?.customer_code,
        paystack_authorization_code: authorization.authorization_code,
        card_last4: authorization.last4,
        card_brand: authorization.card_type || authorization.brand,
        exp_month: parseInt(authorization.exp_month),
        exp_year: parseInt(authorization.exp_year),
        country: authorization.country_code,
        is_default: false, // Will be set by client if needed
        is_active: true,
      });

      await this.savedCardRepository.save(savedCard);
      this.logger.log(`Saved card ${authorization.authorization_code} to database for user ${userId}`);
      
    } catch (error) {
      this.logger.error(`Failed to handle charge.success: ${error.message}`);
    }
  }

  async getUserSavedCards(userId: string): Promise<SavedCard[]> {
    return await this.savedCardRepository.find({
      where: { 
        user_id: userId, 
        gateway: PaymentGateway.PAYSTACK,
        is_active: true 
      },
      order: { is_default: 'DESC', created_at: 'DESC' }
    });
  }


  async deleteSavedCard(userId: string, cardId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const card = await this.savedCardRepository.findOne({
        where: { id: cardId, user_id: userId, gateway: PaymentGateway.PAYSTACK }
      });

      if (!card) {
        return { success: false, error: 'Card not found' };
      }

      // Mark as inactive in database (Paystack doesn't have a detach API)
      await this.savedCardRepository.update(cardId, { is_active: false });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Set a card as default
   */
  async setDefaultCard(userId: string, cardId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const card = await this.savedCardRepository.findOne({
        where: { id: cardId, user_id: userId, gateway: PaymentGateway.PAYSTACK }
      });

      if (!card) {
        return { success: false, error: 'Card not found' };
      }

      // Unset all other default cards for this user
      await this.savedCardRepository.update(
        { user_id: userId, gateway: PaymentGateway.PAYSTACK },
        { is_default: false }
      );

      // Set this card as default
      await this.savedCardRepository.update(cardId, { is_default: true });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Charge a saved card using authorization_code
   */
  async chargeSavedCard(
    userId: string,
    amount: number,
    currency: string,
    email: string,
    reference: string,
    cardId?: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; reference?: string; amount?: number; currency?: string; status?: string; error?: string }> {
    try {
      let card: SavedCard;

      if (cardId) {
        // Charge specific card
        card = await this.savedCardRepository.findOne({
          where: { id: cardId, user_id: userId, gateway: PaymentGateway.PAYSTACK, is_active: true }
        });
      } else {
        // Charge default card
        card = await this.savedCardRepository.findOne({
          where: { user_id: userId, gateway: PaymentGateway.PAYSTACK, is_default: true, is_active: true }
        });
      }

      if (!card) {
        return { success: false, error: 'No valid card found' };
      }

      if (card.isExpired()) {
        return { success: false, error: 'Card has expired' };
      }

      if (!card.paystack_authorization_code) {
        return { success: false, error: 'Card authorization code missing' };
      }

      // Charge the saved card
      const result = await this.chargeAuthorizationLight(
        card.paystack_authorization_code,
        email,
        amount,
        currency,
        reference,
        metadata
      );

      if (result.success) {
        // Mark card as used
        card.markAsUsed();
        await this.savedCardRepository.save(card);
      }

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
