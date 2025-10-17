import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet, Transaction, TransactionType, TransactionStatus, PaymentMethod, PaymentProvider, PaymentTransactionStatus, Currency } from 'src/entities';
import { PaymentRepository } from '../repositories/payment.repository';
import { Payment } from 'src/entities/payment.entity';
import { VendorService } from '@/modules/vendor/services/vendor.service';
import { FundWalletDto, WalletFundingResponseDto, WalletFundingStatusDto, WalletBalanceDto } from '../dto/wallet-funding.dto';
import { TransactionHistoryResponseDto, TransactionQueryDto, TransactionDto } from '../dto/transaction-history.dto';

@Injectable()
export class WalletPaymentService {
  private readonly logger = new Logger(WalletPaymentService.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly paymentRepository: PaymentRepository,
    private readonly vendorService: VendorService,
  ) {}

  /**
   * Process wallet payment for an order
   * @param orderId Order ID
   * @param amount Payment amount
   * @param customerId Customer ID
   * @param vendorId Vendor ID
   * @returns Promise<Payment>
   */
  async processWalletPayment(
    orderId: string,
    amount: number,
    customerId: string,
    vendorId: string,
  ): Promise<Payment> {
    this.logger.log(`Processing wallet payment for order ${orderId}, amount: ${amount}`);

    // Get customer wallet
    const customerWallet = await this.walletRepository.findOne({
      where: { user_id: customerId },
    });

    this.logger.log(`Customer wallet found: ${customerWallet?.id}`);

    if (!customerWallet) {
      throw new NotFoundException('Customer wallet not found');
    }

    if (!customerWallet.is_active) {
      throw new BadRequestException('Customer wallet is not active');
    }

    this.logger.log(`Checking if customer has sufficient balance`);
    // Check if customer has sufficient balance
    if (!customerWallet.can_transact(amount)) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    this.logger.log(`Customer has sufficient balance`);

 

    this.logger.log(`Finding payment with order id: ${orderId}`);
    // find payment with order id
    const payment = await this.paymentRepository.findByOrderId(orderId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    this.logger.log(`Payment found: ${payment?.id}`);

    const paymentReference = payment.payment_reference;

    try {

      this.logger.log(`Processing wallet debit transaction`);
      // Process wallet debit transaction
      const debitSuccess = customerWallet.debit(amount);
      if (!debitSuccess) {
        throw new BadRequestException('Failed to debit customer wallet');
      }

      this.logger.log(`Wallet debit transaction processed`);

      // Save updated wallet
      this.logger.log(`Saving updated wallet`);
      await this.walletRepository.save(customerWallet);

      // Create debit transaction record
      this.logger.log(`Creating debit transaction record`);
      const debitTransaction = await this.transactionRepository.create({
        wallet_id: customerWallet.id,
        transaction_type: TransactionType.DEBIT,
        amount: Number(amount),
        balance_before: Number(customerWallet.balance) + Number(amount),
        balance_after: Number(customerWallet.balance),
        description: `Payment for order ${orderId}`,
        reference_id: paymentReference,
        status: TransactionStatus.COMPLETED,
        processed_at: new Date(),
      });

      this.logger.log(`Saving debit transaction record`);
      await this.transactionRepository.save(debitTransaction);

      // Credit vendor wallet
      this.logger.log(`Credit vendor wallet`);
      await this.creditVendorWallet(vendorId, amount, orderId, paymentReference);
      this.logger.log(`Vendor wallet credited`);

      this.logger.log(`Marking payment as completed`);
      // Mark payment as completed
      payment.markAsCompleted();
      await this.paymentRepository.update(payment.id, payment);

      this.logger.log(`Wallet payment completed for order ${orderId}`);
      return payment;

    } catch (error) {
      this.logger.error(`Wallet payment failed for order ${orderId}: ${error.message}`);
      
      // Mark payment as failed
      payment.markAsFailed(error.message);
      await this.paymentRepository.update(payment.id, payment);
      
      throw error;
    }
  }

  /**
   * Credit vendor wallet after successful payment
   * @param vendorId Vendor ID
   * @param amount Amount to credit
   * @param orderId Order ID
   * @param paymentReference Payment reference
   */
  private async creditVendorWallet(
    vendorId: string,
    amount: number,
    orderId: string,
    paymentReference: string,
  ): Promise<void> {
    // Get vendor wallet
    this.logger.log(`Getting vendor wallet for: ${vendorId}`);
    this.logger.log(`Amount: ${amount}`);
    this.logger.log(`Order ID: ${orderId}`);
    this.logger.log(`Payment reference: ${paymentReference}`);

    // get vendor with vendor id
    const vendor = await this.vendorService.getVendorById(vendorId);

    let vendorWallet = await this.walletRepository.findOne({
      where: { user_id: vendor.user_id },
    });

    this.logger.log(`Vendor wallet found: ${vendorWallet?.id}`);

    if (!vendorWallet) {
      // Create vendor wallet if it doesn't exist\
      this.logger.log(`Creating vendor wallet for: ${vendorId}`);

      vendorWallet = this.walletRepository.create({
        user_id: vendor.user_id,
        balance: 0,
        is_active: true,
      });
      await this.walletRepository.save(vendorWallet);
    }

    this.logger.log(`Vendor wallet found: ${vendorWallet?.id}`);

    // Store balance before credit for transaction record
    const balanceBefore = vendorWallet.balance;

    // Credit vendor wallet
    this.logger.log(`vendor wallet balance: ${balanceBefore}`)
    vendorWallet.credit(amount);

    await this.walletRepository.save(vendorWallet);

    this.logger.log(`Vendor wallet credited: ${vendorWallet?.id}`);


    this.logger.log(`Creating credit transaction record for: ${vendorWallet?.id}`);
    // Create credit transaction record
    const creditTransaction = await this.transactionRepository.create({
      wallet_id: vendorWallet.id,
      transaction_type: TransactionType.CREDIT,
      amount: Number(amount),
      balance_before: Number(balanceBefore),
      balance_after: Number(vendorWallet.balance),
      description: `Payment received for order ${orderId}`,
      reference_id: paymentReference,
      status: TransactionStatus.COMPLETED,
      processed_at: new Date(),
    });


    await this.transactionRepository.save(creditTransaction);

    this.logger.log(`Vendor wallet credited: ${vendorId}, amount: ${amount}`);
    return 
  }

  /**
   * Refund wallet payment
   * @param paymentId Payment ID
   * @param amount Refund amount (optional, defaults to full amount)
   * @param reason Refund reason
   */
  async refundWalletPayment(
    paymentId: string,
    amount?: number,
    reason?: string,
  ): Promise<void> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (!payment.is_wallet_payment) {
      throw new BadRequestException('Payment is not a wallet payment');
    }

    const refundAmount = amount || payment.amount;
    if (refundAmount > payment.amount) {
      throw new BadRequestException('Refund amount cannot exceed payment amount');
    }

    // Get order details
    const order = payment.order;
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Get vendor wallet to debit
    const vendorWallet = await this.walletRepository.findOne({
      where: { user_id: order.vendor_id },
    });

    if (!vendorWallet) {
      throw new NotFoundException('Vendor wallet not found');
    }

    // Check if vendor has sufficient balance
    if (!vendorWallet.can_transact(refundAmount)) {
      throw new BadRequestException('Insufficient vendor wallet balance for refund');
    }

    // Debit vendor wallet
    const debitSuccess = vendorWallet.debit(refundAmount);
    if (!debitSuccess) {
      throw new BadRequestException('Failed to debit vendor wallet for refund');
    }

    await this.walletRepository.save(vendorWallet);

    // Create debit transaction for vendor
    const vendorDebitTransaction = await this.transactionRepository.create({
      wallet_id: vendorWallet.id,
      transaction_type: TransactionType.DEBIT,
      amount: Number(refundAmount),
      balance_before: Number(vendorWallet.balance) + Number(refundAmount),
      balance_after: Number(vendorWallet.balance),
      description: `Refund for order ${order.id}: ${reason || 'No reason provided'}`,
      reference_id: payment.payment_reference,
      status: TransactionStatus.COMPLETED,
      processed_at: new Date(),
    });

    await this.transactionRepository.save(vendorDebitTransaction);

    // Get customer wallet to credit
    const customerWallet = await this.walletRepository.findOne({
      where: { user_id: order.customer_id },
    });

    if (!customerWallet) {
      throw new NotFoundException('Customer wallet not found');
    }

    // Store balance before credit for transaction record
    const customerBalanceBefore = customerWallet.balance;

    // Credit customer wallet
    customerWallet.credit(refundAmount);
    await this.walletRepository.save(customerWallet);

    // Create credit transaction for customer
    const customerCreditTransaction = await this.transactionRepository.create({
      wallet_id: customerWallet.id,
      transaction_type: TransactionType.CREDIT,
      amount: Number(refundAmount),
      balance_before: Number(customerBalanceBefore),
      balance_after: Number(customerWallet.balance),
      description: `Refund for order ${order.id}: ${reason || 'No reason provided'}`,
      reference_id: payment.payment_reference,
      status: TransactionStatus.COMPLETED,
      processed_at: new Date(),
    });

    await this.transactionRepository.save(customerCreditTransaction);

    // Update payment record
    payment.processRefund(refundAmount, reason || 'Refund processed');
    await this.paymentRepository.update(payment.id, payment);

    this.logger.log(`Wallet payment refunded: ${paymentId}, amount: ${refundAmount}`);
  }

  /**
   * Initiate wallet funding with external payment method
   * @param userId User ID
   * @param fundWalletDto Funding details
   * @returns Promise<WalletFundingResponseDto>
   */
  async initiateFunding(userId: string, fundWalletDto: FundWalletDto): Promise<WalletFundingResponseDto> {
    this.logger.log(`Initiating wallet funding for user ${userId}, amount: ${fundWalletDto.amount}`);

    // Get or create user wallet
    let wallet = await this.walletRepository.findOne({
      where: { user_id: userId },
    });

    if (!wallet) {
      wallet = this.walletRepository.create({
        user_id: userId,
        balance: 0,
        currency: fundWalletDto.currency,
        is_active: true,
      });
      await this.walletRepository.save(wallet);
      this.logger.log(`Created new wallet for user ${userId}`);
    }

    if (!wallet.is_active) {
      throw new BadRequestException('Wallet is not active');
    }

    // Generate funding reference
    const fundingReference = await this.generateFundingReference();
    this.logger.log(`Generated funding reference: ${fundingReference}`);

    // Create payment record for wallet funding
    const payment = await this.paymentRepository.create({
      order_id: null, // No order for wallet funding
      payment_reference: fundingReference,
      payment_method: fundWalletDto.payment_method,
      provider: this.getProviderFromPaymentMethod(fundWalletDto.payment_method),
      status: PaymentTransactionStatus.PENDING,
      amount: fundWalletDto.amount,
      metadata: {
        ...fundWalletDto.metadata,
        wallet_funding: true,
        user_id: userId,
        return_url: fundWalletDto.return_url,
        cancel_url: fundWalletDto.cancel_url,
      },
    });

    // For wallet funding, we don't process immediately like order payments
    // We return the payment details for external processing
    const response: WalletFundingResponseDto = {
      id: payment.id,
      reference: fundingReference,
      user_id: userId,
      amount: fundWalletDto.amount,
      currency: fundWalletDto.currency,
      payment_method: fundWalletDto.payment_method,
      status: payment.status,
      created_at: payment.created_at,
      message: 'Wallet funding initiated. Complete payment using the provided details.',
    };

    this.logger.log(`Wallet funding initiated: ${fundingReference}`);
    return response;
  }

  /**
   * Complete wallet funding after successful external payment
   * @param paymentReference Payment reference
   * @param externalReference External payment reference
   * @param gatewayResponse Gateway response data
   * @returns Promise<WalletFundingStatusDto>
   */
  async completeFunding(
    paymentReference: string,
    externalReference?: string,
    gatewayResponse?: any,
  ): Promise<WalletFundingStatusDto> {
    this.logger.log(`Completing wallet funding for reference: ${paymentReference}`);

    const payment = await this.paymentRepository.findByReference(paymentReference);
    if (!payment) {
      throw new NotFoundException('Funding transaction not found');
    }

    if (!payment.metadata?.wallet_funding) {
      throw new BadRequestException('Payment is not a wallet funding transaction');
    }

    if (payment.is_completed) {
      throw new BadRequestException('Funding already completed');
    }

    const userId = payment.metadata.user_id;
    const wallet = await this.walletRepository.findOne({
      where: { user_id: userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    try {
      // Credit the wallet
      const balanceBefore = wallet.balance;
      wallet.credit(payment.amount);
      await this.walletRepository.save(wallet);

      // Create credit transaction record
      const creditTransaction = await this.transactionRepository.create({
        wallet_id: wallet.id,
        transaction_type: TransactionType.CREDIT,
        amount: Number(payment.amount),
        balance_before: Number(balanceBefore),
        balance_after: Number(wallet.balance),
        description: `Wallet funding via ${payment.payment_method}`,
        reference_id: paymentReference,
        external_reference: externalReference,
        status: TransactionStatus.COMPLETED,
        processed_at: new Date(),
        metadata: {
          funding_type: 'wallet_topup',
          payment_method: payment.payment_method,
          gateway_response: gatewayResponse,
        },
      });

      await this.transactionRepository.save(creditTransaction);

      // Mark payment as completed
      payment.markAsCompleted(externalReference, gatewayResponse);
      await this.paymentRepository.update(payment.id, payment);

      const response: WalletFundingStatusDto = {
        id: payment.id,
        reference: paymentReference,
        amount: payment.amount,
        currency: wallet.currency,
        payment_method: payment.payment_method,
        status: payment.status,
        created_at: payment.created_at,
        processed_at: payment.processed_at,
        wallet_balance: wallet.balance,
      };

      this.logger.log(`Wallet funding completed: ${paymentReference}, new balance: ${wallet.balance}`);
      return response;

    } catch (error) {
      this.logger.error(`Wallet funding failed for reference ${paymentReference}: ${error.message}`);
      
      // Mark payment as failed
      payment.markAsFailed(error.message, gatewayResponse);
      await this.paymentRepository.update(payment.id, payment);
      
      throw error;
    }
  }

  /**
   * Get wallet funding status
   * @param reference Funding reference
   * @returns Promise<WalletFundingStatusDto>
   */
  async getFundingStatus(reference: string): Promise<WalletFundingStatusDto> {
    const payment = await this.paymentRepository.findByReference(reference);
    if (!payment) {
      throw new NotFoundException('Funding transaction not found');
    }

    if (!payment.metadata?.wallet_funding) {
      throw new BadRequestException('Payment is not a wallet funding transaction');
    }

    const userId = payment.metadata.user_id;
    let walletBalance: number | undefined;

    if (payment.is_completed) {
      const wallet = await this.walletRepository.findOne({
        where: { user_id: userId },
      });
      walletBalance = wallet?.balance;
    }

    return {
      id: payment.id,
      reference: reference,
      amount: payment.amount,
      currency: Currency.NGN, // Default, should be stored in payment metadata
      payment_method: payment.payment_method,
      status: payment.status,
      failure_reason: payment.failure_reason,
      created_at: payment.created_at,
      processed_at: payment.processed_at,
      failed_at: payment.failed_at,
      wallet_balance: walletBalance,
    };
  }

  /**
   * Get user wallet balance and details
   * @param userId User ID
   * @returns Promise<WalletBalanceDto>
   */
  async getWalletBalance(userId: string): Promise<WalletBalanceDto> {
    let wallet = await this.walletRepository.findOne({
      where: { user_id: userId },
    });

    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = this.walletRepository.create({
        user_id: userId,
        balance: 0,
        currency: Currency.NGN, // Default currency
        is_active: true,
      });
      await this.walletRepository.save(wallet);
    }

    return {
      id: wallet.id,
      user_id: wallet.user_id,
      balance: wallet.balance,
      currency: wallet.currency,
      is_active: wallet.is_active,
      formatted_balance: wallet.formatted_balance,
      last_transaction_at: wallet.last_transaction_at,
      created_at: wallet.created_at,
      updated_at: wallet.updated_at,
    };
  }

  /**
   * Generate unique funding reference
   * @returns Promise<string>
   */
  private async generateFundingReference(): Promise<string> {
    const { v4: uuidv4 } = await import('uuid');
    return `wallet_${uuidv4()}`;
  }

  /**
   * Debit wallet for withdrawal
   * @param userId User ID
   * @param amount Amount to debit
   * @param description Transaction description
   * @returns Promise<void>
   */
  async debitWalletForWithdrawal(userId: string, amount: number, description: string): Promise<void> {
    this.logger.log(`Debiting wallet for withdrawal: user ${userId}, amount: ${amount}`);

    // Get user wallet
    const wallet = await this.walletRepository.findOne({
      where: { user_id: userId },
    });

    if (!wallet) {
      throw new NotFoundException('User wallet not found');
    }

    if (!wallet.is_active) {
      throw new BadRequestException('Wallet is not active');
    }

    // Check if user has sufficient balance
    if (!wallet.can_transact(amount)) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    try {
      // Debit wallet
      const balanceBefore = wallet.balance;
      const debitSuccess = wallet.debit(amount);
      if (!debitSuccess) {
        throw new BadRequestException('Failed to debit wallet');
      }

      // Save updated wallet
      await this.walletRepository.save(wallet);

      // Create debit transaction record
      const debitTransaction = await this.transactionRepository.create({
        wallet_id: wallet.id,
        transaction_type: TransactionType.DEBIT,
        amount: Number(amount),
        balance_before: Number(balanceBefore),
        balance_after: Number(wallet.balance),
        description: description,
        reference_id: `withdrawal_${Date.now()}`,
        status: TransactionStatus.COMPLETED,
        processed_at: new Date(),
      });

      await this.transactionRepository.save(debitTransaction);

      this.logger.log(`Wallet debited successfully for withdrawal: ${amount}`);
    } catch (error) {
      this.logger.error(`Failed to debit wallet for withdrawal: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get payment provider from payment method
   * @param paymentMethod Payment method
   * @returns PaymentProvider
   */
  private getProviderFromPaymentMethod(paymentMethod: PaymentMethod): PaymentProvider {
    switch (paymentMethod) {
      case PaymentMethod.PAYSTACK:
        return PaymentProvider.PAYSTACK;
      case PaymentMethod.STRIPE:
        return PaymentProvider.STRIPE;
      case PaymentMethod.MERCURY:
        return PaymentProvider.MERCURY;
      case PaymentMethod.WALLET:
        return PaymentProvider.WALLET;
      case PaymentMethod.CARD_SAVED:
        return PaymentProvider.CARD_SAVED;
      default:
        throw new BadRequestException(`Unsupported payment method for wallet funding: ${paymentMethod}`);
    }
  }

 
  async getTransactionHistory(userId: string): Promise<{ transactions: TransactionDto[] }> {
    this.logger.log(`Getting transaction history for user ${userId}`);

    // Get user wallet
    const wallet = await this.walletRepository.findOne({
      where: { user_id: userId },
    });

    if (!wallet) {
      throw new NotFoundException('User wallet not found');
    }

    // Build query
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.wallet_id = :walletId', { walletId: wallet.id })
      .orderBy('transaction.created_at', 'DESC');



    // Execute query
    const transactions = await queryBuilder.getMany();

    // Convert to DTOs
    const transactionDtos: TransactionDto[] = transactions.map(transaction => ({
      id: transaction.id,
      wallet_id: transaction.wallet_id,
      transaction_type: transaction.transaction_type,
      amount: transaction.amount,
      balance_before: transaction.balance_before,
      balance_after: transaction.balance_after,
      description: transaction.description,
      reference_id: transaction.reference_id,
      external_reference: transaction.external_reference,
      status: transaction.status,
      failure_reason: transaction.failure_reason,
      processed_at: transaction.processed_at,
      reversed_at: transaction.reversed_at,
      reversal_reason: transaction.reversal_reason,
      metadata: transaction.metadata,
      created_at: transaction.created_at,
      updated_at: transaction.updated_at,
      is_credit: transaction.is_credit,
      is_debit: transaction.is_debit,
      is_completed: transaction.is_completed,
      is_pending: transaction.is_pending,
      is_failed: transaction.is_failed,
      is_reversed: transaction.is_reversed,
    }));



    return {
      transactions: transactionDtos,
    };
  }

  /**
   * Get transaction by ID
   * @param userId User ID
   * @param transactionId Transaction ID
   * @returns Promise<TransactionDto>
   */
  async getTransactionById(userId: string, transactionId: string): Promise<TransactionDto> {
    this.logger.log(`Getting transaction ${transactionId} for user ${userId}`);

    // Get user wallet
    const wallet = await this.walletRepository.findOne({
      where: { user_id: userId },
    });

    if (!wallet) {
      throw new NotFoundException('User wallet not found');
    }

    // Get transaction
    const transaction = await this.transactionRepository.findOne({
      where: {
        id: transactionId,
        wallet_id: wallet.id,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      id: transaction.id,
      wallet_id: transaction.wallet_id,
      transaction_type: transaction.transaction_type,
      amount: transaction.amount,
      balance_before: transaction.balance_before,
      balance_after: transaction.balance_after,
      description: transaction.description,
      reference_id: transaction.reference_id,
      external_reference: transaction.external_reference,
      status: transaction.status,
      failure_reason: transaction.failure_reason,
      processed_at: transaction.processed_at,
      reversed_at: transaction.reversed_at,
      reversal_reason: transaction.reversal_reason,
      metadata: transaction.metadata,
      created_at: transaction.created_at,
      updated_at: transaction.updated_at,
      is_credit: transaction.is_credit,
      is_debit: transaction.is_debit,
      is_completed: transaction.is_completed,
      is_pending: transaction.is_pending,
      is_failed: transaction.is_failed,
      is_reversed: transaction.is_reversed,
    };
  }
}
