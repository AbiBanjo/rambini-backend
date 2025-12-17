// src/modules/admin/services/revert-cancellation.service.ts
import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus, PaymentStatus, Wallet, Payment, PaymentTransactionStatus } from '@/entities';

export interface RevertCancellationResult {
  success: boolean;
  message: string;
  order_id: string;
  order_number: string;
  previous_state: {
    order_status: OrderStatus;
    payment_status: PaymentStatus;
    customer_balance: number;
    vendor_balance: number;
  };
  new_state: {
    order_status: OrderStatus;
    payment_status: PaymentStatus;
    customer_balance: number;
    vendor_balance: number;
  };
  adjustments: {
    customer_debit: number;
    vendor_credit: number;
    reason: string;
  };
}

export interface FixVendorBalanceResult {
  success: boolean;
  message: string;
  vendor_id: string;
  vendor_name: string;
  previous_balance: number;
  adjustment_amount: number;
  new_balance: number;
  reason: string;
}

@Injectable()
export class RevertCancellationService {
  private readonly logger = new Logger(RevertCancellationService.name);
  private readonly SERVICE_FEE_PERCENTAGE = 0.15;

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  /**
   * Calculate service fee
   */
  private calculateServiceFee(subtotal: number): number {
    return Number((subtotal * this.SERVICE_FEE_PERCENTAGE).toFixed(2));
  }

  /**
   * Revert a cancelled order - undo the refund
   * This will:
   * 1. Debit customer wallet (take back the refund)
   * 2. Credit vendor wallet (give back what was debited)
   * 3. Change order status back to its original state (or DELIVERED if unknown)
   * 4. Update payment status
   */
  async revertCancellation(
    orderId: string,
    confirmationCode: string,
  ): Promise<RevertCancellationResult> {
    if (confirmationCode !== 'REVERT_CANCELLATION_2025') {
      throw new BadRequestException('Invalid confirmation code');
    }

    this.logger.log('[REVERT CANCEL] ========================================');
    this.logger.log(`[REVERT CANCEL] Starting revert for order ${orderId}`);

    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['customer', 'vendor', 'vendor.user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.order_status !== OrderStatus.CANCELLED) {
      throw new BadRequestException('Can only revert CANCELLED orders');
    }

    if (order.payment_status !== PaymentStatus.REFUNDED) {
      throw new BadRequestException('Can only revert orders with REFUNDED payment status');
    }

    // Get wallets
    const customerWallet = await this.walletRepo.findOne({
      where: { user_id: order.customer_id },
    });

    const vendorWallet = await this.walletRepo.findOne({
      where: { user_id: order.vendor.user_id },
    });

    if (!customerWallet || !vendorWallet) {
      throw new BadRequestException('Customer or vendor wallet not found');
    }

    // Store previous state
    const previousState = {
      order_status: order.order_status,
      payment_status: order.payment_status,
      customer_balance: Number(customerWallet.balance),
      vendor_balance: Number(vendorWallet.vendor_balance),
    };

    // Calculate amounts
    const totalAmount = Number(order.total_amount);
    const subtotal = Number(order.subtotal);
    const serviceFee = this.calculateServiceFee(subtotal);
    const vendorReceivedAmount = subtotal - serviceFee;

    this.logger.log(`[REVERT CANCEL] Total Amount: ${totalAmount}`);
    this.logger.log(`[REVERT CANCEL] Vendor Received Amount: ${vendorReceivedAmount}`);

    // REVERT: Debit customer (take back the refund)
    customerWallet.balance = Number(customerWallet.balance) - totalAmount;
    customerWallet.last_transaction_at = new Date();
    await this.walletRepo.save(customerWallet);

    this.logger.log(
      `[REVERT CANCEL] ✓ Debited customer wallet: ${previousState.customer_balance} → ${customerWallet.balance} (-${totalAmount})`
    );

    // REVERT: Credit vendor (give back what was debited)
    vendorWallet.vendor_balance = Number(vendorWallet.vendor_balance) + vendorReceivedAmount;
    vendorWallet.last_transaction_at = new Date();
    await this.walletRepo.save(vendorWallet);

    this.logger.log(
      `[REVERT CANCEL] ✓ Credited vendor wallet: ${previousState.vendor_balance} → ${vendorWallet.vendor_balance} (+${vendorReceivedAmount})`
    );

    // Update order status to DELIVERED (assuming the order was actually delivered)
    order.order_status = OrderStatus.DELIVERED;
    order.payment_status = PaymentStatus.PAID;
    order.delivered_at = order.delivered_at || new Date();
    order.cancellation_reason = null;
    order.cancelled_at = null;
    order.cancelled_by = null;

    await this.orderRepo.save(order);

    this.logger.log(`[REVERT CANCEL] ✓ Order status updated to DELIVERED`);

    // Update payment record
    const payment = await this.paymentRepo.findOne({
      where: { order_id: orderId },
    });

    if (payment) {
      payment.status = PaymentTransactionStatus.COMPLETED; // Fixed: Use enum instead of string
      payment.refunded_amount = 0;
      payment.refunded_at = null;
      payment.refund_reason = null;
      await this.paymentRepo.save(payment);
      this.logger.log(`[REVERT CANCEL] ✓ Payment record updated to COMPLETED`);
    }

    const result: RevertCancellationResult = {
      success: true,
      message: `Cancellation reverted successfully. Customer debited ${totalAmount}, Vendor credited ${vendorReceivedAmount}`,
      order_id: orderId,
      order_number: order.order_number,
      previous_state: previousState,
      new_state: {
        order_status: order.order_status,
        payment_status: order.payment_status,
        customer_balance: Number(customerWallet.balance),
        vendor_balance: Number(vendorWallet.vendor_balance),
      },
      adjustments: {
        customer_debit: totalAmount,
        vendor_credit: vendorReceivedAmount,
        reason: 'Revert incorrect cancellation - order was actually delivered',
      },
    };

    this.logger.log('[REVERT CANCEL] ========================================');
    return result;
  }

  /**
   * Fix vendor balance manually
   * Use this when vendor balance needs direct adjustment
   */
  async fixVendorBalance(
    vendorUserId: string,
    adjustmentAmount: number,
    reason: string,
    confirmationCode: string,
  ): Promise<FixVendorBalanceResult> {
    if (confirmationCode !== 'FIX_VENDOR_BALANCE_2025') {
      throw new BadRequestException('Invalid confirmation code');
    }

    this.logger.log('[FIX VENDOR BALANCE] ========================================');
    this.logger.log(`[FIX VENDOR BALANCE] Fixing balance for vendor ${vendorUserId}`);

    const vendorWallet = await this.walletRepo.findOne({
      where: { user_id: vendorUserId },
      relations: ['user'],
    });

    if (!vendorWallet) {
      throw new NotFoundException('Vendor wallet not found');
    }

    const previousBalance = Number(vendorWallet.vendor_balance);

    // Apply adjustment
    vendorWallet.vendor_balance = Number(vendorWallet.vendor_balance) + adjustmentAmount;
    vendorWallet.last_transaction_at = new Date();
    await this.walletRepo.save(vendorWallet);

    const newBalance = Number(vendorWallet.vendor_balance);

    this.logger.log(
      `[FIX VENDOR BALANCE] ✓ Adjusted vendor balance: ${previousBalance} → ${newBalance} (${adjustmentAmount >= 0 ? '+' : ''}${adjustmentAmount})`
    );

    const result: FixVendorBalanceResult = {
      success: true,
      message: `Vendor balance adjusted successfully`,
      vendor_id: vendorUserId,
      vendor_name: vendorWallet.user?.email || 'Unknown',
      previous_balance: previousBalance,
      adjustment_amount: adjustmentAmount,
      new_balance: newBalance,
      reason: reason,
    };

    this.logger.log('[FIX VENDOR BALANCE] ========================================');
    return result;
  }

  /**
   * Calculate what the correct vendor debit should have been
   * for a specific order
   */
  async calculateCorrectVendorDebit(orderId: string): Promise<{
    order_number: string;
    subtotal: number;
    service_fee: number;
    correct_vendor_debit: number;
    total_refunded_to_customer: number;
    explanation: string;
  }> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const subtotal = Number(order.subtotal);
    const totalAmount = Number(order.total_amount);
    const serviceFee = this.calculateServiceFee(subtotal);
    const correctVendorDebit = subtotal - serviceFee;

    return {
      order_number: order.order_number,
      subtotal: subtotal,
      service_fee: serviceFee,
      correct_vendor_debit: correctVendorDebit,
      total_refunded_to_customer: totalAmount,
      explanation: `Subtotal (${subtotal}) - Service Fee (${serviceFee}) = ${correctVendorDebit}. This is what should be debited from vendor. Customer gets full total (${totalAmount}) refunded.`,
    };
  }
}