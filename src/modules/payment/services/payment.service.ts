import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, PaymentMethod, PaymentProvider, PaymentTransactionStatus, PaymentStatus, OrderStatus, User, NotificationType, SavedCard, PaymentGateway } from 'src/entities';
import { PaymentRepository } from '../repositories/payment.repository';
import { WalletPaymentService } from './wallet-payment.service';
import { StripePaymentService } from './stripe-payment.service';
import { PaystackPaymentService } from './paystack-payment.service';
import { MercuryPaymentService } from './mercury-payment.service';
import { PaymentProviderInterface } from '../interfaces/payment-provider.interface';
import { ProcessPaymentDto, PaymentResponseDto, PaymentWebhookDto, FundWalletDto, WalletFundingResponseDto, WalletFundingStatusDto, WalletBalanceDto } from '../dto';
import { CartService } from '@/modules/cart/services/cart.service';
import { OrderService } from '@/modules/order/services/order.service';
import { NotificationService } from '@/modules/notification/notification.service';
import { getCurrencyForCountry } from '@/utils/currency-mapper';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly paymentProviders: Map<PaymentMethod, PaymentProviderInterface>;

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(SavedCard)
    private readonly savedCardRepository: Repository<SavedCard>,
    private readonly paymentRepository: PaymentRepository,
    private readonly walletPaymentService: WalletPaymentService,
    private readonly stripePaymentService: StripePaymentService,
    private readonly paystackPaymentService: PaystackPaymentService,
    private readonly mercuryPaymentService: MercuryPaymentService,
    private readonly cartService: CartService,
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
    private readonly notificationService: NotificationService,
  ) {
    // Initialize payment providers (excluding wallet as it's handled separately)
    this.paymentProviders = new Map();
    this.paymentProviders.set(PaymentMethod.STRIPE, this.stripePaymentService);
    this.paymentProviders.set(PaymentMethod.PAYSTACK, this.paystackPaymentService);
    // this.paymentProviders.set(PaymentMethod.MERCURY, this.mercuryPaymentService);
  }

 
  async processPayment(processPaymentDto: ProcessPaymentDto): Promise<PaymentResponseDto> {
    this.logger.log(`Processing payment for order ${processPaymentDto.order_id} with method ${processPaymentDto.payment_method}`);
    const { order_id, payment_method, metadata, saved_card_id } = processPaymentDto;
    

    this.logger.log(`Processing payment for order ${order_id} with method 2 ${payment_method}`);

    // Get order details
    const order = await this.orderRepository.findOne({
      where: { id: order_id },
      relations: ['customer', 'vendor'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    this.logger.log(`Order found: ${order.id}`);
    this.logger.log(`Checking if payment already exists for this order`);
    // Check if payment already exists for this order
    const existingPayment = await this.paymentRepository.findByOrderId(order_id);

    if (existingPayment) {
      this.logger.log(`Payment already exists for this order`);
      throw new BadRequestException('Payment already exists for this order');
    }
    this.logger.log(`Payment not found for this order`);

    if (payment_method !== PaymentMethod.WALLET && payment_method !== PaymentMethod.CARD_SAVED) {

      const paymentProvider = this.paymentProviders.get(payment_method);

      if (!paymentProvider) {
        throw new BadRequestException(`Unsupported payment method: ${payment_method}`);
      }
    }

    // Generate payment reference
    this.logger.log(`Generating payment reference`);
    const paymentReference = await this.paymentRepository.generatePaymentReference();
    this.logger.log(`Payment reference: ${paymentReference}`);

    // Create payment record
    const payment = await this.paymentRepository.create({
      order_id: order_id,
      payment_reference: paymentReference,
      payment_method: payment_method,
      provider: this.getProviderFromPaymentMethod(payment_method),
      status: PaymentTransactionStatus.PENDING,
      amount: order.total_amount,
      metadata: metadata,
    });

    try {
      if (payment_method === PaymentMethod.WALLET) {
        // Process wallet payment directly
        const walletPayment = await this.walletPaymentService.processWalletPayment(
          order_id,
          order.total_amount,
          order.customer_id,
          order.vendor_id,
        );

        return this.mapToPaymentResponse(walletPayment);
      } else if (payment_method === PaymentMethod.CARD_SAVED) {
        // Process payment with saved card
        this.logger.log(`Processing payment with saved card for order ${order_id}`);

        // Get saved card
        let savedCard: SavedCard;
        if (saved_card_id) {
          savedCard = await this.savedCardRepository.findOne({
            where: { id: saved_card_id, user_id: order.customer_id, is_active: true }
          });
          if (!savedCard) {
            throw new BadRequestException('Saved card not found or inactive');
          }
        } else {
          // Use default card
          savedCard = await this.savedCardRepository.findOne({
            where: { user_id: order.customer_id, is_default: true, is_active: true }
          });
          if (!savedCard) {
            throw new BadRequestException('No default saved card found');
          }
        }

        // Check if card is expired
        if (savedCard.isExpired()) {
          throw new BadRequestException('Card has expired');
        }

        // Determine gateway and charge the saved card
        let chargeResult: any;
        let gateway: PaymentGateway;

        if (savedCard.gateway === PaymentGateway.STRIPE) {
          gateway = PaymentGateway.STRIPE;
          chargeResult = await this.stripePaymentService.chargeSavedCard(
            order.customer_id,
            order.total_amount,
            order.currency || 'USD',
            `Order #${order.id}`,
            savedCard.id,
            { order_id: order.id, payment_reference: paymentReference, ...metadata }
          );
        } else {
          gateway = PaymentGateway.PAYSTACK;
          chargeResult = await this.paystackPaymentService.chargeSavedCard(
            order.customer_id,
            order.total_amount,
            order.currency || 'NGN',
            order.customer.email,
            paymentReference,
            savedCard.id,
            { order_id: order.id, payment_reference: paymentReference, ...metadata }
          );
        }

        if (!chargeResult.success) {
          throw new BadRequestException(chargeResult.error || 'Card charge failed');
        }

        // Update payment record
        payment.saved_card_id = savedCard.id;
        payment.external_reference = chargeResult.payment_intent_id || chargeResult.reference;
        payment.gateway_response = chargeResult;
        payment.provider = gateway === PaymentGateway.STRIPE ? PaymentProvider.STRIPE : PaymentProvider.PAYSTACK;

        // Determine status based on response
        if (gateway === PaymentGateway.STRIPE) {
          // Stripe: if no client_secret required, it's immediate success
          if (chargeResult.payment_intent_id && !chargeResult.client_secret) {
            payment.status = PaymentTransactionStatus.COMPLETED;
            payment.markAsCompleted(chargeResult.payment_intent_id, chargeResult);
            
            // Credit vendor wallet for completed payment
            await this.creditVendorForExternalPayment(payment);
            
            // Update order status to PAID
            await this.orderRepository.update(order.id, { 
              payment_status: PaymentStatus.PAID
            });
          } else {
            // Requires action (3D Secure)
            payment.status = PaymentTransactionStatus.PENDING;
          }
        } else {
          // Paystack: check status
          if (chargeResult.status === 'success') {
            payment.status = PaymentTransactionStatus.COMPLETED;
            payment.markAsCompleted(chargeResult.reference, chargeResult);
            
            // Credit vendor wallet for completed payment
            await this.creditVendorForExternalPayment(payment);
            
            // Update order status to PAID
            await this.orderRepository.update(order.id, { 
              payment_status: PaymentStatus.PAID
            });
          } else {
            payment.status = PaymentTransactionStatus.PENDING;
          }
        }

        await this.paymentRepository.update(payment.id, payment);

        return {
          id: payment.id,
          payment_reference: payment.payment_reference,
          order_id: payment.order_id,
          payment_method: payment.payment_method,
          status: payment.status,
          amount: payment.amount,
          external_reference: payment.external_reference,
          created_at: payment.created_at,
        };
      } else {

        const paymentProvider = this.paymentProviders.get(payment_method);
        if (!paymentProvider) {
          throw new BadRequestException(`Unsupported payment method: ${payment_method}`);
        }
        // Process external payment
        const initiationResult = await paymentProvider.initializePayment(
          order.total_amount,
          order.currency || 'NGN', // Use order currency or default to NGN
          paymentReference,
          order.customer.email,
          metadata,
        );

        if (!initiationResult.success) {
          throw new BadRequestException(initiationResult.error || 'Payment initialization failed');
        }

        // Update payment with external reference
        payment.external_reference = initiationResult.external_reference;
        payment.gateway_response = initiationResult.gateway_response;
        payment.status = PaymentTransactionStatus.PROCESSING;
        await this.paymentRepository.update(payment.id, payment);

        return {
          id: payment.id,
          payment_reference: payment.payment_reference,
          order_id: payment.order_id,
          payment_method: payment.payment_method,
          status: payment.status,
          amount: payment.amount,
          payment_url: initiationResult.payment_url,
          external_reference: initiationResult.external_reference,
          created_at: payment.created_at,
        };
      }
    } catch (error) {
      this.logger.error(`Payment processing failed for order ${order_id}: ${error.message}`);
      
      // Mark payment as failed
      payment.status = PaymentTransactionStatus.FAILED;
      payment.failure_reason = error.message;
      await this.paymentRepository.update(payment.id, payment);
      
      throw error;
    }
  }

  /**
   * Verify payment status
   * @param paymentReference Payment reference
   * @returns Promise<PaymentResponseDto>
   */
  async verifyPayment(paymentReference: string): Promise<PaymentResponseDto> {
    this.logger.log(`Verifying payment: ${paymentReference}`);

    const payment = await this.paymentRepository.findByPaymentReference(paymentReference);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // If it's a wallet payment, return current status
    if (payment.payment_method === PaymentMethod.WALLET) {
      return this.mapToPaymentResponse(payment);
    }

    // Verify with external provider
    const paymentProvider = this.paymentProviders.get(payment.payment_method);
    if (!paymentProvider) {
      throw new BadRequestException(`Unsupported payment method: ${payment.payment_method}`);
    }

    const verificationResult = await paymentProvider.verifyPayment(payment.external_reference!);

    if (verificationResult.success) {
      // Update payment status based on verification result
      const newStatus = this.mapVerificationStatusToPaymentStatus(verificationResult.status);
      
      if (newStatus === PaymentTransactionStatus.COMPLETED) {
        payment.markAsCompleted(verificationResult.external_reference, verificationResult.gateway_response);
        
        // Credit vendor wallet for external payments
        await this.creditVendorForExternalPayment(payment);
      } else if (newStatus === PaymentTransactionStatus.FAILED) {
        payment.markAsFailed(verificationResult.error || 'Payment verification failed', verificationResult.gateway_response);
      }

      await this.paymentRepository.update(payment.id, payment);
    }

    return this.mapToPaymentResponse(payment);
  }


  async processWebhook(
    provider: PaymentProvider,
    payload: any,
    signature: string,
  ): Promise<PaymentResponseDto | WalletFundingStatusDto> {
    this.logger.log(`Processing webhook for provider: ${provider}`);

    const paymentMethod = this.getPaymentMethodFromProvider(provider);
    const paymentProvider = this.paymentProviders.get(paymentMethod);
    
    if (!paymentProvider) {
      throw new BadRequestException(`Unsupported payment provider: ${provider}`);
    }

    this.logger.log(`Processing webhook for provider: ${provider}`);
    // this.logger.log(`Payload: ${JSON.stringify(payload)}`);
    this.logger.log(`Signature: ${signature}`);

    const webhookResult = await paymentProvider.processWebhook(payload, signature);

    this.logger.log(`Webhook result: ${JSON.stringify(webhookResult)}`);

    if (!webhookResult.success) {
      throw new BadRequestException(webhookResult.error || 'Webhook processing failed');
    }

    this.logger.log(`Finding payment by reference: ${webhookResult.reference}`);

    // Check if this is a wallet funding transaction
    const isWalletFunding = webhookResult.reference.startsWith('wallet_');

    if (isWalletFunding) {
      return await this.processWalletFundingWebhook(webhookResult);
    } else  {
      return await this.processOrderPaymentWebhook(webhookResult);
    }
  }

  
  private async processWalletFundingWebhook(webhookResult: any): Promise<WalletFundingStatusDto> {
    this.logger.log(`Processing wallet funding webhook for reference: ${webhookResult.reference}`);

    // if( !webhookResult.reference.startsWith('wallet_')) {
    //   webhookResult.reference = webhookResult.client_reference_id
    // }

    const payment = await this.paymentRepository.findByPaymentReference(webhookResult.reference);
    if (!payment) {
      throw new NotFoundException('Wallet funding transaction not found for webhook reference');
    }

    if (!payment.metadata?.wallet_funding) {
      throw new BadRequestException('Payment is not a wallet funding transaction');
    }

    const newStatus = this.mapVerificationStatusToPaymentStatus(webhookResult.status);
    
    if (newStatus === PaymentTransactionStatus.COMPLETED) {
      // Complete the wallet funding
      return await this.walletPaymentService.completeFunding(
        webhookResult.reference,
        webhookResult.external_reference,
        webhookResult.gateway_response,
      );
    } else if (newStatus === PaymentTransactionStatus.FAILED) {
      // Mark payment as failed
      payment.markAsFailed(
        webhookResult.error || 'Payment failed',
        webhookResult.gateway_response,
      );
      await this.paymentRepository.update(payment.id, payment);

      return await this.walletPaymentService.getFundingStatus(webhookResult.reference);
    }

    // For other statuses, just return current status
    return await this.walletPaymentService.getFundingStatus(webhookResult.reference);
  }


  private async processOrderPaymentWebhook(webhookResult: any): Promise<PaymentResponseDto> {
    this.logger.log(`Processing order payment webhook for reference: ${webhookResult.reference}`);

    const payment = await this.paymentRepository.findByPaymentReference(webhookResult.reference);
    if (!payment) {
      throw new NotFoundException('Payment not found for webhook reference');
    }

    this.logger.log(`Payment found: ${JSON.stringify(payment)}`);
    // Update payment status
    const newStatus = this.mapVerificationStatusToPaymentStatus(webhookResult.status);
    
    if (newStatus === PaymentTransactionStatus.COMPLETED) {
      payment.markAsCompleted(webhookResult.external_reference, webhookResult.gateway_response);
      
      // Credit vendor wallet for external payments
      await this.creditVendorForExternalPayment(payment);
    } else if (newStatus === PaymentTransactionStatus.FAILED) {
      payment.markAsFailed(webhookResult.error || 'Payment failed', webhookResult.gateway_response);
      // update order status and payment status after failed payment  
      await this.orderRepository.update(payment.order_id, {
        payment_status: PaymentStatus.FAILED,
        order_status: OrderStatus.CANCELLED
      });
    }

    await this.paymentRepository.update(payment.id, payment);

    // make all cart items in the order for this payment as inactive 
    await this.cartService.makeCartItemsInactiveForVendor(payment.order.customer_id, payment.order.vendor_id, payment.order_id);

    // update order status and payment status after successful payment
    if (newStatus === PaymentTransactionStatus.COMPLETED) {
      await this.orderRepository.update(payment.order_id, {
        payment_status: PaymentStatus.PAID,
        order_status: OrderStatus.NEW
      });

      // send push notification to vendor
      await this.notificationService.sendPushNotification(
        payment.order.vendor.user_id,
        NotificationType.ORDER_UPDATE,
        `New Order #${payment.order.order_number}!`,
        `You have received a new ${payment.order.order_type.toLowerCase()} order. Payment confirmed.`,
        {
          order_id: payment.order.id,
          order_number: payment.order.order_number,
          status: OrderStatus.NEW,
          order_type: payment.order.order_type,
          total_amount: payment.order.total_amount,
          payment_status: PaymentStatus.PAID,
        }
      );
    }

    return this.mapToPaymentResponse(payment);
  }

  /**
   * Get payment by ID
   * @param paymentId Payment ID
   * @returns Promise<PaymentResponseDto>
   */
  async getPaymentById(paymentId: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return this.mapToPaymentResponse(payment);
  }

  /**
   * Get payment by reference
   * @param paymentReference Payment reference
   * @returns Promise<PaymentResponseDto>
   */
  async getPaymentByReference(paymentReference: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findByPaymentReference(paymentReference);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return this.mapToPaymentResponse(payment);
  }

  /**
   * Refund payment
   * @param paymentId Payment ID
   * @param amount Refund amount (optional)
   * @param reason Refund reason (optional)
   */
  async refundPayment(
    paymentId: string,
    amount?: number,
    reason?: string,
  ): Promise<void> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.payment_method === PaymentMethod.WALLET) {
      await this.walletPaymentService.refundWalletPayment(paymentId, amount, reason);
    } else {
      const paymentProvider = this.paymentProviders.get(payment.payment_method);
      if (!paymentProvider) {
        throw new BadRequestException(`Unsupported payment method: ${payment.payment_method}`);
      }

      const refundResult = await paymentProvider.refundPayment(
        payment.external_reference!,
        amount,
        reason,
      );

      if (!refundResult.success) {
        throw new BadRequestException(refundResult.error || 'Refund failed');
      }

      // Update payment record
      payment.processRefund(amount || payment.amount, reason || 'Refund processed');
      await this.paymentRepository.update(payment.id, payment);
    }
  }

  /**
   * Credit vendor wallet for external payment
   * @param payment Payment record
   */
  private async creditVendorForExternalPayment(payment: any): Promise<void> {
    this.logger.log(`Credit vendor for external payment: ${payment.id}`);
    if (payment.payment_method === PaymentMethod.WALLET) {
      return; // Already handled in wallet payment service
    }

    const order = payment.order;
    if (!order) {
      this.logger.warn(`Order not found for payment ${payment.id}`);
      return;
    }

    
    this.logger.log(`Order found for payment ${payment.id}: ${order.id}`);
    // Use wallet payment service to credit vendor
    await this.walletPaymentService['creditVendorWallet'](
      order.vendor_id,
      payment.amount,
      order.id,
      payment.payment_reference,
    );
    this.logger.log(`Vendor wallet credited: ${order.vendor_id}, amount: ${payment.amount}`);
  }

  /**
   * Map verification status to payment status
   * @param status Verification status
   * @returns PaymentTransactionStatus
   */
  private mapVerificationStatusToPaymentStatus(status: string): PaymentTransactionStatus {
    switch (status) {
      case 'completed':
        return PaymentTransactionStatus.COMPLETED;
      case 'failed':
        return PaymentTransactionStatus.FAILED;
      case 'cancelled':
        return PaymentTransactionStatus.CANCELLED;
      case 'pending':
      default:
        return PaymentTransactionStatus.PENDING;
    }
  }

  /**
   * Get provider from payment method
   * @param paymentMethod Payment method
   * @returns PaymentProvider
   */
  private getProviderFromPaymentMethod(paymentMethod: PaymentMethod): PaymentProvider {
    switch (paymentMethod) {
      case PaymentMethod.WALLET:
        return PaymentProvider.WALLET;
      case PaymentMethod.STRIPE:
        return PaymentProvider.STRIPE;
      case PaymentMethod.PAYSTACK:
        return PaymentProvider.PAYSTACK;
      case PaymentMethod.MERCURY:
        return PaymentProvider.MERCURY;
      case PaymentMethod.CARD_SAVED:
        return PaymentProvider.CARD_SAVED;
      default:
        throw new BadRequestException(`Unsupported payment method: ${paymentMethod}`);
    }
  }

  /**
   * Get payment method from provider
   * @param provider Payment provider
   * @returns PaymentMethod
   */
  private getPaymentMethodFromProvider(provider: PaymentProvider): PaymentMethod {
    switch (provider) {
      case PaymentProvider.WALLET:
        return PaymentMethod.WALLET;
      case PaymentProvider.STRIPE:
        return PaymentMethod.STRIPE;
      case PaymentProvider.PAYSTACK:
        return PaymentMethod.PAYSTACK;
      case PaymentProvider.MERCURY:
        return PaymentMethod.MERCURY;
      case PaymentProvider.CARD_SAVED:
        return PaymentMethod.CARD_SAVED;
      default:
        throw new BadRequestException(`Unsupported payment provider: ${provider}`);
    }
  }

  /**
   * Initiate wallet funding
   * @param userId User ID
   * @param fundWalletDto Funding details
   * @returns Promise<WalletFundingResponseDto>
   */
  async fundWallet(user: User, fundWalletDto: FundWalletDto,): Promise<WalletFundingResponseDto> {
    const userId = user.id;
    this.logger.log(`Funding wallet for user ${userId} with ${fundWalletDto.payment_method}`);
  
    if (fundWalletDto.payment_method === PaymentMethod.WALLET) {
      throw new BadRequestException('Cannot fund wallet using wallet payment method');
    }

    fundWalletDto.email = user.email;
    // get currency from user country 
    fundWalletDto.currency = getCurrencyForCountry(user.country);

    // Handle CARD_SAVED payment method
    if (fundWalletDto.payment_method === PaymentMethod.CARD_SAVED) {
      this.logger.log(`Funding wallet with saved card for user ${userId}`);

      // Get saved card
      let savedCard: SavedCard;
      if (fundWalletDto.saved_card_id) {
        savedCard = await this.savedCardRepository.findOne({
          where: { id: fundWalletDto.saved_card_id, user_id: userId, is_active: true }
        });
        if (!savedCard) {
          throw new BadRequestException('Saved card not found or inactive');
        }
      } else {
        // Use default card
        savedCard = await this.savedCardRepository.findOne({
          where: { user_id: userId, is_default: true, is_active: true }
        });
        if (!savedCard) {
          throw new BadRequestException('No default saved card found');
        }
      }

      // Check if card is expired
      if (savedCard.isExpired()) {
        throw new BadRequestException('Card has expired');
      }

      // Initiate funding through wallet payment service first
      const fundingResponse = await this.walletPaymentService.initiateFunding(userId, fundWalletDto);

      try {
        // Charge the saved card
        let chargeResult: any;
        let gateway: PaymentGateway = savedCard.gateway;

        if (gateway === PaymentGateway.STRIPE) {
          chargeResult = await this.stripePaymentService.chargeSavedCard(
            userId,
            fundWalletDto.amount,
            fundWalletDto.currency,
            `Wallet funding`,
            savedCard.id,
            { 
              wallet_funding: true,
              funding_reference: fundingResponse.reference,
              user_id: userId
            }
          );
        } else {
          chargeResult = await this.paystackPaymentService.chargeSavedCard(
            userId,
            fundWalletDto.amount,
            fundWalletDto.currency,
            fundWalletDto.email,
            fundingResponse.reference,
            savedCard.id,
            { 
              wallet_funding: true,
              funding_reference: fundingResponse.reference,
              user_id: userId
            }
          );
        }

        if (!chargeResult.success) {
          throw new BadRequestException(chargeResult.error || 'Card charge failed');
        }

        // Update funding response with external reference
        fundingResponse.external_reference = chargeResult.payment_intent_id || chargeResult.reference;

        // If immediate success, complete the funding
        if (gateway === PaymentGateway.STRIPE) {
          if (chargeResult.payment_intent_id && !chargeResult.client_secret) {
            // Immediate success - complete funding
            await this.walletPaymentService.completeFunding(
              fundingResponse.reference,
              chargeResult.payment_intent_id,
              chargeResult
            );
            fundingResponse.message = 'Wallet funded successfully';
          } else {
            fundingResponse.message = 'Wallet funding initiated - awaiting confirmation';
          }
        } else {
          // Paystack
          if (chargeResult.status === 'success') {
            // Immediate success - complete funding
            await this.walletPaymentService.completeFunding(
              fundingResponse.reference,
              chargeResult.reference,
              chargeResult
            );
            fundingResponse.message = 'Wallet funded successfully';
          } else {
            fundingResponse.message = 'Wallet funding initiated - awaiting confirmation';
          }
        }

        return fundingResponse;
      } catch (error) {
        this.logger.error(`Failed to charge saved card for wallet funding: ${error.message}`);
        throw error;
      }
    }

    // Get payment provider for external payment methods
    const provider = this.paymentProviders.get(fundWalletDto.payment_method);
    if (!provider) {
      throw new BadRequestException(`Payment provider not available for ${fundWalletDto.payment_method}`);
    }

    // Initiate funding through wallet payment service
    const fundingResponse = await this.walletPaymentService.initiateFunding(userId, fundWalletDto);

    // For external payment methods, we need to create the payment URL
    try {
      const paymentUrl = await provider.initializePayment(
        fundWalletDto.amount,
        fundWalletDto.currency,
        fundingResponse.reference,
        fundWalletDto.email, // email is optional
        {
          ...fundWalletDto.metadata,
          wallet_funding: true,
          funding_reference: fundingResponse.reference,
          return_url: fundWalletDto.return_url,
          cancel_url: fundWalletDto.cancel_url,
        }
      );

      if (paymentUrl.success) {
        fundingResponse.payment_url = paymentUrl.payment_url;
        fundingResponse.external_reference = paymentUrl.external_reference;
      }
    } catch (error) {
      this.logger.error(`Failed to create payment URL for wallet funding: ${error.message}`);
      // Continue without payment URL - user can still complete payment manually
    }

    return fundingResponse;
  }


  async completeFunding(
    reference: string,
    externalReference?: string,
    gatewayResponse?: any,
  ): Promise<WalletFundingStatusDto> {
    return await this.walletPaymentService.completeFunding(reference, externalReference, gatewayResponse);
  }

  /**
   * Get wallet funding status
   * @param reference Funding reference
   * @returns Promise<WalletFundingStatusDto>
   */
  async getFundingStatus(reference: string): Promise<WalletFundingStatusDto> {
    return await this.walletPaymentService.getFundingStatus(reference);
  }

  /**
   * Verify wallet funding payment
   * @param reference Funding reference
   * @returns Promise<WalletFundingStatusDto>
   */
  async verifyFunding(reference: string): Promise<WalletFundingStatusDto> {
    this.logger.log(`Verifying wallet funding: ${reference}`);

    // Get funding status first
    const fundingStatus = await this.walletPaymentService.getFundingStatus(reference);
    
    if (fundingStatus.status === PaymentTransactionStatus.COMPLETED) {
      return fundingStatus;
    }

    if (fundingStatus.status === PaymentTransactionStatus.FAILED) {
      throw new BadRequestException('Funding transaction failed');
    }

    // For pending transactions, verify with the payment provider
    if (fundingStatus.payment_method !== PaymentMethod.WALLET) {
      const provider = this.paymentProviders.get(fundingStatus.payment_method);
      if (provider) {
        try {
          const verificationResult = await provider.verifyPayment(reference);
          
          if (verificationResult.status === 'completed') {
            // Complete the funding
            return await this.walletPaymentService.completeFunding(
              reference,
              verificationResult.external_reference,
              verificationResult.gateway_response,
            );
          }
        } catch (error) {
          this.logger.error(`Failed to verify funding with provider: ${error.message}`);
          throw new BadRequestException('Failed to verify funding status');
        }
      }
    }

    return fundingStatus;
  }

  /**
   * Get user wallet balance
   * @param userId User ID
   * @returns Promise<WalletBalanceDto>
   */
  async getWalletBalance(userId: string): Promise<WalletBalanceDto> {
    return await this.walletPaymentService.getWalletBalance(userId);
  }

  /**
   * Map payment entity to response DTO
   * @param payment Payment entity
   * @returns PaymentResponseDto
   */
  private mapToPaymentResponse(payment: any): PaymentResponseDto {
    return {
      id: payment.id,
      payment_reference: payment.payment_reference,
      order_id: payment.order_id,
      payment_method: payment.payment_method,
      status: payment.status,
      amount: payment.amount,
      external_reference: payment.external_reference,
      created_at: payment.created_at,
      processed_at: payment.processed_at,
    };
  }
}
