import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet, Transaction, TransactionType, TransactionStatus, PaymentMethod, PaymentProvider, PaymentTransactionStatus } from 'src/entities';
import { PaymentRepository } from '../repositories/payment.repository';
import { Payment } from 'src/entities/payment.entity';

@Injectable()
export class WalletPaymentService {
  private readonly logger = new Logger(WalletPaymentService.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly paymentRepository: PaymentRepository,
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

    if (!customerWallet) {
      throw new NotFoundException('Customer wallet not found');
    }

    if (!customerWallet.is_active) {
      throw new BadRequestException('Customer wallet is not active');
    }

    // Check if customer has sufficient balance
    if (!customerWallet.can_transact(amount)) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // Create payment record
    const paymentReference = await this.paymentRepository.generatePaymentReference();
    const payment = await this.paymentRepository.create({
      order_id: orderId,
      payment_reference: paymentReference,
      payment_method: PaymentMethod.WALLET,
      provider: PaymentProvider.WALLET,
      status: PaymentTransactionStatus.PROCESSING,
      amount: amount,
    });

    try {
      // Process wallet debit transaction
      const debitSuccess = customerWallet.debit(amount);
      if (!debitSuccess) {
        throw new BadRequestException('Failed to debit customer wallet');
      }

      // Save updated wallet
      await this.walletRepository.save(customerWallet);

      // Create debit transaction record
      const debitTransaction = await this.transactionRepository.create({
        wallet_id: customerWallet.id,
        transaction_type: TransactionType.DEBIT,
        amount: amount,
        balance_before: customerWallet.balance + amount,
        balance_after: customerWallet.balance,
        description: `Payment for order ${orderId}`,
        reference_id: paymentReference,
        status: TransactionStatus.COMPLETED,
        processed_at: new Date(),
      });

      await this.transactionRepository.save(debitTransaction);

      // Credit vendor wallet
      await this.creditVendorWallet(vendorId, amount, orderId, paymentReference);

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
    let vendorWallet = await this.walletRepository.findOne({
      where: { user_id: vendorId },
    });

    if (!vendorWallet) {
      // Create vendor wallet if it doesn't exist
      vendorWallet = this.walletRepository.create({
        user_id: vendorId,
        balance: 0,
        is_active: true,
      });
      await this.walletRepository.save(vendorWallet);
    }

    // Credit vendor wallet
    vendorWallet.credit(amount);
    await this.walletRepository.save(vendorWallet);

    // Create credit transaction record
    const creditTransaction = await this.transactionRepository.create({
      wallet_id: vendorWallet.id,
      transaction_type: TransactionType.CREDIT,
      amount: amount,
      balance_before: vendorWallet.balance - amount,
      balance_after: vendorWallet.balance,
      description: `Payment received for order ${orderId}`,
      reference_id: paymentReference,
      status: TransactionStatus.COMPLETED,
      processed_at: new Date(),
    });

    await this.transactionRepository.save(creditTransaction);

    this.logger.log(`Vendor wallet credited: ${vendorId}, amount: ${amount}`);
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
      amount: refundAmount,
      balance_before: vendorWallet.balance + refundAmount,
      balance_after: vendorWallet.balance,
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

    // Credit customer wallet
    customerWallet.credit(refundAmount);
    await this.walletRepository.save(customerWallet);

    // Create credit transaction for customer
    const customerCreditTransaction = await this.transactionRepository.create({
      wallet_id: customerWallet.id,
      transaction_type: TransactionType.CREDIT,
      amount: refundAmount,
      balance_before: customerWallet.balance - refundAmount,
      balance_after: customerWallet.balance,
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
}
