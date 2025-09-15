import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, PaymentMethod, PaymentProvider, PaymentTransactionStatus } from 'src/entities';
import { PaymentRepository } from '../repositories/payment.repository';
import { WalletPaymentService } from './wallet-payment.service';
import { StripePaymentService } from './stripe-payment.service';
import { PaystackPaymentService } from './paystack-payment.service';
import { MercuryPaymentService } from './mercury-payment.service';
import { PaymentProviderInterface } from '../interfaces/payment-provider.interface';
import { ProcessPaymentDto, PaymentResponseDto, PaymentWebhookDto } from '../dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly paymentProviders: Map<PaymentMethod, PaymentProviderInterface>;

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly paymentRepository: PaymentRepository,
    private readonly walletPaymentService: WalletPaymentService,
    private readonly stripePaymentService: StripePaymentService,
    private readonly paystackPaymentService: PaystackPaymentService,
    private readonly mercuryPaymentService: MercuryPaymentService,
  ) {
    // Initialize payment providers (excluding wallet as it's handled separately)
    this.paymentProviders = new Map();
    this.paymentProviders.set(PaymentMethod.STRIPE, this.stripePaymentService);
    this.paymentProviders.set(PaymentMethod.PAYSTACK, this.paystackPaymentService);
    this.paymentProviders.set(PaymentMethod.MERCURY, this.mercuryPaymentService);
  }

  /**
   * Process payment for an order
   * @param processPaymentDto Payment processing data
   * @returns Promise<PaymentResponseDto>
   */
  async processPayment(processPaymentDto: ProcessPaymentDto): Promise<PaymentResponseDto> {
    const { order_id, payment_method, metadata } = processPaymentDto;

    this.logger.log(`Processing payment for order ${order_id} with method ${payment_method}`);

    // Get order details
    const order = await this.orderRepository.findOne({
      where: { id: order_id },
      relations: ['customer', 'vendor'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check if payment already exists for this order
    const existingPayment = await this.paymentRepository.findByOrderId(order_id);
    if (existingPayment) {
      throw new BadRequestException('Payment already exists for this order');
    }

    // Get payment provider
    const paymentProvider = this.paymentProviders.get(payment_method);
    if (!paymentProvider) {
      throw new BadRequestException(`Unsupported payment method: ${payment_method}`);
    }

    // Generate payment reference
    const paymentReference = await this.paymentRepository.generatePaymentReference();

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
      } else {
        // Process external payment
        const initiationResult = await paymentProvider.initializePayment(
          order.total_amount,
          'NGN', // Default currency
          paymentReference,
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

  /**
   * Process payment webhook
   * @param provider Payment provider
   * @param payload Webhook payload
   * @param signature Webhook signature
   * @returns Promise<PaymentResponseDto>
   */
  async processWebhook(
    provider: PaymentProvider,
    payload: any,
    signature: string,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`Processing webhook for provider: ${provider}`);

    const paymentMethod = this.getPaymentMethodFromProvider(provider);
    const paymentProvider = this.paymentProviders.get(paymentMethod);
    
    if (!paymentProvider) {
      throw new BadRequestException(`Unsupported payment provider: ${provider}`);
    }

    const webhookResult = await paymentProvider.processWebhook(payload, signature);

    if (!webhookResult.success) {
      throw new BadRequestException(webhookResult.error || 'Webhook processing failed');
    }

    // Find payment by reference
    const payment = await this.paymentRepository.findByPaymentReference(webhookResult.reference);
    if (!payment) {
      throw new NotFoundException('Payment not found for webhook reference');
    }

    // Update payment status
    const newStatus = this.mapVerificationStatusToPaymentStatus(webhookResult.status);
    
    if (newStatus === PaymentTransactionStatus.COMPLETED) {
      payment.markAsCompleted(webhookResult.external_reference, webhookResult.gateway_response);
      
      // Credit vendor wallet for external payments
      await this.creditVendorForExternalPayment(payment);
    } else if (newStatus === PaymentTransactionStatus.FAILED) {
      payment.markAsFailed(webhookResult.error || 'Payment failed', webhookResult.gateway_response);
    }

    await this.paymentRepository.update(payment.id, payment);

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
    if (payment.payment_method === PaymentMethod.WALLET) {
      return; // Already handled in wallet payment service
    }

    const order = payment.order;
    if (!order) {
      this.logger.warn(`Order not found for payment ${payment.id}`);
      return;
    }

    // Use wallet payment service to credit vendor
    await this.walletPaymentService['creditVendorWallet'](
      order.vendor_id,
      payment.amount,
      order.id,
      payment.payment_reference,
    );
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
      default:
        throw new BadRequestException(`Unsupported payment provider: ${provider}`);
    }
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
