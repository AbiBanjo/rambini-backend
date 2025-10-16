import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { PaymentMethod, PaymentProvider } from 'src/entities';
import { PaymentProviderInterface, PaymentInitiationResult, PaymentVerificationResult, PaymentWebhookResult, RefundResult } from '../interfaces/payment-provider.interface';
import { SavedCard, PaymentGateway } from 'src/entities';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import Stripe from 'stripe';
// Crypto import removed as it's not used in this service

@Injectable()
export class StripePaymentService implements PaymentProviderInterface {
  private readonly logger = new Logger(StripePaymentService.name);
  private readonly stripeSecretKey: string;
  private readonly stripeWebhookSecret: string;
  private readonly stripe: Stripe;

  constructor(
    @Inject(getRepositoryToken(SavedCard))
    private savedCardRepository: Repository<SavedCard>,
  ) {
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
    email?: string,
    metadata?: Record<string, any>
  ): Promise<PaymentInitiationResult> {
    try {
      this.logger.log(`Initializing Stripe payment for reference: ${reference}`);

      if (!this.stripeSecretKey) {
        throw new BadRequestException('Stripe configuration missing');
      }
      // Validate that only USD and GBP are supported
      const supportedCurrencies = ['USD', 'GBP'];
      if (!supportedCurrencies.includes(currency.toUpperCase())) {
        throw new BadRequestException(`Stripe only supports USD and GBP currencies. Received: ${currency}`);
      }

      // Default to USD if not provided
      const paymentCurrency = currency || 'USD';
      
      // Extract redirect URL from metadata or use a default
      const redirectUrl = metadata?.redirectUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
      const description = metadata?.description || `Payment for order ${reference}`;
      const name = metadata?.customerName || email || 'Customer';

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: email,
        client_reference_id: reference,
        line_items: [
          {
            price_data: {
              currency: paymentCurrency.toLowerCase(),
              product_data: {
                name: description,
                description: `Payment for ${description}`,
              },
              unit_amount: amount * 100, // Stripe expects amount in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${redirectUrl}?session_id={CHECKOUT_SESSION.ID}`,
        cancel_url: `${redirectUrl}?success=false`,
        metadata: {
          reference,
          customerName: name,
          email: email || '',
          ...metadata,
        },
      });

      return {
        success: true,
        payment_url: session.url,
        external_reference: session.id,
        gateway_response: session,
      };
    } catch (error) {
      console.error('Stripe payment initialization error:', error);
      const errorMessage = this.handleStripeError(error);
      this.logger.error(`Stripe payment initialization failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // New method for direct checkout session creation
  async createCheckoutSession({
    amount,
    email,
    name,
    reference,
    description,
    currency = 'usd',
    redirectUrl,
  }: {
    amount: number;
    email: string;
    name: string;
    reference: string;
    description: string;
    currency?: string;
    redirectUrl: string;
  }): Promise<{
    success: boolean;
    message?: string;
    checkoutUrl?: string;
    sessionId?: string;
  }> {
    try {
      this.logger.log(`Creating Stripe checkout session for reference: ${reference}`);

      if (!this.stripeSecretKey) {
        throw new BadRequestException('Stripe configuration missing');
      }

      // Validate that only USD and GBP are supported
      const supportedCurrencies = ['USD', 'GBP'];
      if (!supportedCurrencies.includes(currency.toUpperCase())) {
        throw new BadRequestException(`Stripe only supports USD and GBP currencies. Received: ${currency}`);
      }

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: email,
        client_reference_id: reference,
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: description,
                description: `Payment for ${description}`,
              },
              unit_amount: amount * 100, // Stripe expects amount in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${redirectUrl}?session_id={CHECKOUT_SESSION.ID}`,
        cancel_url: `${redirectUrl}?success=false`,
        metadata: {
          reference,
          customerName: name,
          email,
        },
      });

      return {
        success: true,
        checkoutUrl: session.url,
        sessionId: session.id,
      };
    } catch (error) {
      console.error('Stripe payment initialization error:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  }
 
  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    try {
      this.logger.log(`Verifying Stripe payment: ${reference}`);

      if (!this.stripeSecretKey) {
        throw new BadRequestException('Stripe configuration missing');
      }

      // Try to retrieve as checkout session first
      try {
        const session = await this.stripe.checkout.sessions.retrieve(reference);
        
        let status: 'pending' | 'completed' | 'failed' | 'cancelled';
        switch (session.payment_status) {
          case 'unpaid':
            status = 'pending';
            break;
          case 'paid':
            status = 'completed';
            break;
          case 'no_payment_required':
            status = 'completed';
            break;
          default:
            status = 'failed';
        }

        return {
          success: true,
          status,
          external_reference: session.id,
          gateway_response: session,
        };
      } catch (sessionError) {
        // If it's not a checkout session, try as payment intent
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
      }
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

      this.logger.log(`Stripe webhook event: ${JSON.stringify(event)}`);

      switch (event.type) {
        case 'checkout.session.completed':
          status = 'completed';
          reference = event.data.object.client_reference_id as string;
          amount = event.data.object.amount_total / 100; // Convert from cents
          this.logger.log(`Stripe amount_total: ${event.data.object.amount_total}, converted amount: ${amount}`);
          break;
        case 'checkout.session.expired':
          status = 'cancelled';
          reference = event.data.object.id;
          amount = event.data.object.amount_total / 100;
          break;
        case 'payment_intent.succeeded':
          status = 'completed';
          reference = event.data.object.id;
          amount = event.data.object.amount / 100; // Convert from cents
          break;
        case 'setup_intent.succeeded':
          // Handle card tokenization - save card to database
          await this.handleSetupIntentSucceeded(event.data.object);
          status = 'completed';
          reference = event.data.object.id;
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

      this.logger.log(`Stripe webhook reference: ${reference}`);
      this.logger.log(`Stripe webhook status: ${status}`);
      this.logger.log(`Stripe webhook amount: ${amount}`);
     

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

  // =============== Minimal tokenization helpers (no DB writes) ===============
  async createSetupIntentLight(email: string, userId?: string): Promise<{ success: boolean; client_secret?: string; customer_id?: string; error?: string }> {
    try {
      if (!this.stripeSecretKey) throw new BadRequestException('Stripe configuration missing');

      // Create or reuse a Customer implicitly by passing email; client can store customer id if needed
      const customer = await this.stripe.customers.create({ 
        email,
        metadata: userId ? { user_id: userId } : {}
      });
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customer.id,
        payment_method_types: ['card'],
        usage: 'off_session',
        metadata: userId ? { user_id: userId } : {}
      });
      return { 
        success: true, 
        client_secret: setupIntent.client_secret || undefined,
        customer_id: customer.id
      };
    } catch (error) {
      return { success: false, error: this.handleStripeError(error) };
    }
  }

  async attachPaymentMethodLight(
    customerId: string,
    paymentMethodId: string,
  ): Promise<{ success: boolean; customer_id?: string; payment_method_id?: string; error?: string }> {
    try {
      if (!this.stripeSecretKey) throw new BadRequestException('Stripe configuration missing');
      await this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      await this.stripe.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });
      return { success: true, customer_id: customerId, payment_method_id: paymentMethodId };
    } catch (error) {
      return { success: false, error: this.handleStripeError(error) };
    }
  }

  // =============== Webhook handlers for card tokenization ===============
  
  /**
   * Handle setup_intent.succeeded webhook - save card to database
   */
  private async handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent): Promise<void> {
    try {
      this.logger.log(`Processing setup_intent.succeeded for ${setupIntent.id}`);
      
      if (!setupIntent.payment_method || typeof setupIntent.payment_method === 'string') {
        this.logger.warn('Setup intent does not have payment method attached');
        return;
      }

      const paymentMethod = setupIntent.payment_method as Stripe.PaymentMethod;
      const customer = setupIntent.customer as Stripe.Customer;
      
      if (!paymentMethod.card || !customer) {
        this.logger.warn('Setup intent missing card or customer data');
        return;
      }

      // Extract user_id from metadata or customer metadata
      const userId = setupIntent.metadata?.user_id || customer.metadata?.user_id;
      if (!userId) {
        this.logger.warn('No user_id found in setup intent metadata');
        return;
      }

      // Check if card already exists
      const existingCard = await this.savedCardRepository.findOne({
        where: { stripe_payment_method_id: paymentMethod.id }
      });

      if (existingCard) {
        this.logger.log(`Card ${paymentMethod.id} already exists in database`);
        return;
      }

      // Save card to database
      const savedCard = this.savedCardRepository.create({
        user_id: userId,
        gateway: PaymentGateway.STRIPE,
        stripe_customer_id: customer.id,
        stripe_payment_method_id: paymentMethod.id,
        card_last4: paymentMethod.card.last4,
        card_brand: paymentMethod.card.brand,
        exp_month: paymentMethod.card.exp_month,
        exp_year: paymentMethod.card.exp_year,
        country: paymentMethod.card.country,
        is_default: false, // Will be set by client if needed
        is_active: true,
      });

      await this.savedCardRepository.save(savedCard);
      this.logger.log(`Saved card ${paymentMethod.id} to database for user ${userId}`);
      
    } catch (error) {
      this.logger.error(`Failed to handle setup_intent.succeeded: ${error.message}`);
    }
  }

  /**
   * Get user's saved cards from database
   */
  async getUserSavedCards(userId: string): Promise<SavedCard[]> {
    return await this.savedCardRepository.find({
      where: { 
        user_id: userId, 
        gateway: PaymentGateway.STRIPE,
        is_active: true 
      },
      order: { is_default: 'DESC', created_at: 'DESC' }
    });
  }

  /**
   * Delete a saved card
   */
  async deleteSavedCard(userId: string, cardId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const card = await this.savedCardRepository.findOne({
        where: { id: cardId, user_id: userId, gateway: PaymentGateway.STRIPE }
      });

      if (!card) {
        return { success: false, error: 'Card not found' };
      }

      // Detach from Stripe
      if (card.stripe_payment_method_id) {
        await this.stripe.paymentMethods.detach(card.stripe_payment_method_id);
      }

      // Mark as inactive in database
      await this.savedCardRepository.update(cardId, { is_active: false });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: this.handleStripeError(error) };
    }
  }

  /**
   * Set a card as default
   */
  async setDefaultCard(userId: string, cardId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const card = await this.savedCardRepository.findOne({
        where: { id: cardId, user_id: userId, gateway: PaymentGateway.STRIPE }
      });

      if (!card) {
        return { success: false, error: 'Card not found' };
      }

      // Unset all other default cards for this user
      await this.savedCardRepository.update(
        { user_id: userId, gateway: PaymentGateway.STRIPE },
        { is_default: false }
      );

      // Set this card as default
      await this.savedCardRepository.update(cardId, { is_default: true });

      // Update Stripe customer default payment method
      if (card.stripe_customer_id && card.stripe_payment_method_id) {
        await this.stripe.customers.update(card.stripe_customer_id, {
          invoice_settings: { default_payment_method: card.stripe_payment_method_id }
        });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: this.handleStripeError(error) };
    }
  }

  /**
   * Charge a saved card
   */
  async chargeSavedCard(
    userId: string,
    amount: number,
    currency: string,
    description: string,
    cardId?: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; payment_intent_id?: string; client_secret?: string; error?: string }> {
    try {
      let card: SavedCard;

      if (cardId) {
        // Charge specific card
        card = await this.savedCardRepository.findOne({
          where: { id: cardId, user_id: userId, gateway: PaymentGateway.STRIPE, is_active: true }
        });
      } else {
        // Charge default card
        card = await this.savedCardRepository.findOne({
          where: { user_id: userId, gateway: PaymentGateway.STRIPE, is_default: true, is_active: true }
        });
      }

      if (!card) {
        return { success: false, error: 'No valid card found' };
      }

      if (card.isExpired()) {
        return { success: false, error: 'Card has expired' };
      }

      // Create payment intent with saved card
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        customer: card.stripe_customer_id,
        payment_method: card.stripe_payment_method_id,
        confirmation_method: 'automatic',
        confirm: true,
        description,
        metadata: {
          user_id: userId,
          saved_card_id: card.id,
          ...metadata,
        },
      });

      // Mark card as used
      card.markAsUsed();
      await this.savedCardRepository.save(card);

      return {
        success: true,
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
      };
    } catch (error) {
      return { success: false, error: this.handleStripeError(error) };
    }
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
