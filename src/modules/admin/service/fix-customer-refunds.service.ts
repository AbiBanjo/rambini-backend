// src/modules/admin/services/fix-customer-refunds.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus, PaymentStatus, Wallet, Payment } from '@/entities';

export interface RefundFixResult {
  total_cancelled_orders: number;
  customers_affected: number;
  total_amount_to_refund: number;
  already_fixed_count: number;
  details: Array<{
    order_id: string;
    order_number: string;
    customer_id: string;
    customer_email: string;
    customer_name: string;
    refund_amount: number;
    current_balance: number;
    new_balance: number;
    cancelled_at: Date;
    status: 'success' | 'error' | 'already_fixed';
    error_message?: string;
    refund_processed_at?: Date;
  }>;
}

@Injectable()
export class FixCustomerRefundsService {
  private readonly logger = new Logger(FixCustomerRefundsService.name);
  private readonly SERVICE_FEE_PERCENTAGE = 0.15;

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  /**
   * Calculate service fee from subtotal
   */
  private calculateServiceFee(subtotal: number): number {
    return Number((subtotal * this.SERVICE_FEE_PERCENTAGE).toFixed(2));
  }

  /**
   * DRY RUN - Analyze cancelled orders that need refunds
   */
  async analyzeCancelledOrders(): Promise<RefundFixResult> {
    this.logger.log('[REFUND ANALYSIS] ========================================');
    this.logger.log('[REFUND ANALYSIS] Starting dry run analysis of cancelled orders...');

    const result: RefundFixResult = {
      total_cancelled_orders: 0,
      customers_affected: 0,
      total_amount_to_refund: 0,
      already_fixed_count: 0,
      details: [],
    };

    try {
      // Find cancelled orders with PAID payment status but NOT REFUNDED
      const cancelledOrders = await this.orderRepository.find({
        where: { 
          order_status: OrderStatus.CANCELLED,
          payment_status: PaymentStatus.PAID, // They paid but weren't refunded
        },
        relations: ['customer', 'customer.wallet'],
        order: { cancelled_at: 'ASC' },
      });

      this.logger.log(
        `[REFUND ANALYSIS] Found ${cancelledOrders.length} cancelled orders with PAID status (potential missing refunds)`,
      );

      result.total_cancelled_orders = cancelledOrders.length;

      const customerOrdersMap = new Map<string, Order[]>();

      // Group orders by customer
      for (const order of cancelledOrders) {
        if (!customerOrdersMap.has(order.customer_id)) {
          customerOrdersMap.set(order.customer_id, []);
        }
        customerOrdersMap.get(order.customer_id).push(order);
      }

      result.customers_affected = customerOrdersMap.size;

      // Analyze each customer's orders
      for (const [customerId, orders] of customerOrdersMap.entries()) {
        const customer = orders[0].customer;
        
        if (!customer) {
          this.logger.warn(`[REFUND ANALYSIS] ❌ Customer ${customerId} not found`);
          continue;
        }

        if (!customer.wallet) {
          this.logger.warn(`[REFUND ANALYSIS] ❌ Wallet not found for ${customer.email}`);
          continue;
        }

        const currentBalance = Number(customer.wallet.balance);

        for (const order of orders) {
          try {
            // Check if payment record exists and shows refund was processed
            const payment = await this.paymentRepository.findOne({
              where: { order_id: order.id },
            });

            // If payment shows REFUNDED status, mark as already fixed
            const alreadyFixed = payment && 
              payment.status === 'REFUNDED' && 
              Number(payment.refunded_amount) > 0;

            if (alreadyFixed) {
              result.already_fixed_count++;
              result.details.push({
                order_id: order.id,
                order_number: order.order_number,
                customer_id: customerId,
                customer_email: customer.email,
                customer_name: `${customer.first_name} ${customer.last_name}`,
                refund_amount: Number(order.total_amount),
                current_balance: currentBalance,
                new_balance: currentBalance,
                cancelled_at: order.cancelled_at,
                status: 'already_fixed',
                refund_processed_at: payment.refunded_at,
              });

              this.logger.log(
                `[REFUND ANALYSIS] ℹ️  Order ${order.order_number} already refunded`
              );
              continue;
            }

            // Calculate refund amount (full total_amount - customer paid this)
            const refundAmount = Number(order.total_amount);
            const newBalance = currentBalance + refundAmount;

            result.details.push({
              order_id: order.id,
              order_number: order.order_number,
              customer_id: customerId,
              customer_email: customer.email,
              customer_name: `${customer.first_name} ${customer.last_name}`,
              refund_amount: refundAmount,
              current_balance: currentBalance,
              new_balance: newBalance,
              cancelled_at: order.cancelled_at,
              status: 'success',
            });

            result.total_amount_to_refund += refundAmount;

            this.logger.log(
              `[REFUND ANALYSIS] Order ${order.order_number}: ` +
              `Needs refund of ${refundAmount} ${order.currency}`
            );

          } catch (error) {
            this.logger.error(
              `[REFUND ANALYSIS] Error analyzing order ${order.id}: ${error.message}`
            );
            
            result.details.push({
              order_id: order.id,
              order_number: order.order_number,
              customer_id: customerId,
              customer_email: customer.email,
              customer_name: `${customer.first_name} ${customer.last_name}`,
              refund_amount: Number(order.total_amount),
              current_balance: currentBalance,
              new_balance: currentBalance,
              cancelled_at: order.cancelled_at,
              status: 'error',
              error_message: error.message,
            });
          }
        }

        const needsRefund = result.details.filter(
          d => d.customer_id === customerId && d.status === 'success'
        ).length;

        if (needsRefund > 0) {
          const totalToRefund = result.details
            .filter(d => d.customer_id === customerId && d.status === 'success')
            .reduce((sum, d) => sum + d.refund_amount, 0);

          this.logger.log(
            `[REFUND ANALYSIS] Customer ${customer.email}: ${needsRefund} orders need refund, ` +
            `Total: ${totalToRefund}, Current Balance: ${currentBalance}`
          );
        }
      }

      this.logger.log('[REFUND ANALYSIS] ========================================');
      this.logger.log(`[REFUND ANALYSIS SUMMARY]`);
      this.logger.log(`Total Cancelled Orders (PAID status): ${result.total_cancelled_orders}`);
      this.logger.log(`Already Refunded: ${result.already_fixed_count}`);
      this.logger.log(`Needs Refund: ${result.total_cancelled_orders - result.already_fixed_count}`);
      this.logger.log(`Customers Affected: ${result.customers_affected}`);
      this.logger.log(`Total Amount to Refund: ${result.total_amount_to_refund}`);
      this.logger.log(`Can Refund: ${result.details.filter(d => d.status === 'success').length}`);
      this.logger.log(`Errors: ${result.details.filter(d => d.status === 'error').length}`);
      this.logger.log('[REFUND ANALYSIS] ========================================');

      return result;
    } catch (error) {
      this.logger.error(`[REFUND ANALYSIS ERROR] ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * ACTUAL FIX - Process refunds for cancelled orders
   * WARNING: This makes permanent changes to the database
   */
  async fixCancelledOrderRefunds(confirmationCode: string): Promise<RefundFixResult> {
    if (confirmationCode !== 'FIX_CUSTOMER_REFUNDS_2025') {
      throw new Error(
        'Invalid confirmation code. Please provide correct confirmation code to proceed.',
      );
    }

    this.logger.log('[REFUND FIX] ========================================');
    this.logger.log('[REFUND FIX] Starting to process customer refunds...');
    this.logger.warn('[REFUND FIX] ⚠️  THIS WILL MAKE PERMANENT CHANGES TO CUSTOMER WALLETS');

    const result: RefundFixResult = {
      total_cancelled_orders: 0,
      customers_affected: 0,
      total_amount_to_refund: 0,
      already_fixed_count: 0,
      details: [],
    };

    try {
      // Find cancelled orders with PAID payment status
      const cancelledOrders = await this.orderRepository.find({
        where: { 
          order_status: OrderStatus.CANCELLED,
          payment_status: PaymentStatus.PAID,
        },
        relations: ['customer', 'customer.wallet'],
        order: { cancelled_at: 'ASC' },
      });

      this.logger.log(
        `[REFUND FIX] Found ${cancelledOrders.length} cancelled orders to process`,
      );

      result.total_cancelled_orders = cancelledOrders.length;

      const customerOrdersMap = new Map<string, Order[]>();

      for (const order of cancelledOrders) {
        if (!customerOrdersMap.has(order.customer_id)) {
          customerOrdersMap.set(order.customer_id, []);
        }
        customerOrdersMap.get(order.customer_id).push(order);
      }

      result.customers_affected = customerOrdersMap.size;

      for (const [customerId, orders] of customerOrdersMap.entries()) {
        const customer = orders[0].customer;

        if (!customer || !customer.wallet) {
          this.logger.warn(`[REFUND FIX] ❌ Customer ${customerId} or wallet not found - SKIPPING`);
          continue;
        }

        // Ensure wallet exists
        let wallet = await this.walletRepository.findOne({
          where: { user_id: customerId },
        });

        if (!wallet) {
          this.logger.warn(`[REFUND FIX] Creating wallet for customer ${customer.email}`);
          wallet = this.walletRepository.create({
            user_id: customerId,
            balance: 0,
            vendor_balance: 0,
            last_transaction_at: new Date(),
          });
          await this.walletRepository.save(wallet);
        }

        this.logger.log(
          `[REFUND FIX] Processing customer ${customer.email} (${orders.length} orders)`
        );

        let totalRefunded = 0;

        for (const order of orders) {
          try {
            // Check if already refunded
            const payment = await this.paymentRepository.findOne({
              where: { order_id: order.id },
            });

            const alreadyFixed = payment && 
              payment.status === 'REFUNDED' && 
              Number(payment.refunded_amount) > 0;

            if (alreadyFixed) {
              result.already_fixed_count++;
              result.details.push({
                order_id: order.id,
                order_number: order.order_number,
                customer_id: customerId,
                customer_email: customer.email,
                customer_name: `${customer.first_name} ${customer.last_name}`,
                refund_amount: Number(order.total_amount),
                current_balance: Number(wallet.balance),
                new_balance: Number(wallet.balance),
                cancelled_at: order.cancelled_at,
                status: 'already_fixed',
                refund_processed_at: payment.refunded_at,
              });

              this.logger.log(
                `[REFUND FIX] ℹ️  Order ${order.order_number} already refunded - SKIPPING`
              );
              continue;
            }

            const refundAmount = Number(order.total_amount);
            const currentBalance = Number(wallet.balance);

            // Credit customer wallet
            wallet.balance = Number(wallet.balance) + refundAmount;
            wallet.last_transaction_at = new Date();
            totalRefunded += refundAmount;

            // Update order payment status to REFUNDED
            order.payment_status = PaymentStatus.REFUNDED;
            await this.orderRepository.save(order);

            // Update payment record if exists
            if (payment) {
              payment.processRefund(
                refundAmount,
                'Refund processed by admin fix script for cancelled order'
              );
              await this.paymentRepository.save(payment);
            }

            this.logger.log(
              `[REFUND FIX] ✓ Refunded ${refundAmount} ${order.currency} to ${customer.email} ` +
              `for order ${order.order_number}`
            );

            result.details.push({
              order_id: order.id,
              order_number: order.order_number,
              customer_id: customerId,
              customer_email: customer.email,
              customer_name: `${customer.first_name} ${customer.last_name}`,
              refund_amount: refundAmount,
              current_balance: currentBalance,
              new_balance: Number(wallet.balance),
              cancelled_at: order.cancelled_at,
              status: 'success',
              refund_processed_at: new Date(),
            });

          } catch (error) {
            this.logger.error(
              `[REFUND FIX ERROR] ❌ Failed to process order ${order.order_number}: ${error.message}`,
            );

            result.details.push({
              order_id: order.id,
              order_number: order.order_number,
              customer_id: customerId,
              customer_email: customer.email,
              customer_name: `${customer.first_name} ${customer.last_name}`,
              refund_amount: Number(order.total_amount),
              current_balance: Number(wallet.balance),
              new_balance: Number(wallet.balance),
              cancelled_at: order.cancelled_at,
              status: 'error',
              error_message: error.message,
            });
          }
        }

        if (totalRefunded > 0) {
          await this.walletRepository.save(wallet);
          result.total_amount_to_refund += totalRefunded;

          this.logger.log(
            `[REFUND FIX] ✓ Saved wallet for ${customer.email}. ` +
            `Total refunded: ${totalRefunded}. New balance: ${wallet.balance}`,
          );
        }
      }

      this.logger.log('[REFUND FIX] ========================================');
      this.logger.log(`[REFUND FIX SUMMARY]`);
      this.logger.log(`Total Cancelled Orders: ${result.total_cancelled_orders}`);
      this.logger.log(`Already Refunded (Skipped): ${result.already_fixed_count}`);
      this.logger.log(`Newly Refunded: ${result.details.filter(d => d.status === 'success').length}`);
      this.logger.log(`Customers Affected: ${result.customers_affected}`);
      this.logger.log(`Total Amount Refunded: ${result.total_amount_to_refund}`);
      this.logger.log(`Failed: ${result.details.filter(d => d.status === 'error').length}`);
      this.logger.log('[REFUND FIX] ========================================');

      return result;
    } catch (error) {
      this.logger.error(`[REFUND FIX ERROR] ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Fix refunds for a specific customer
   */
  async fixCustomerRefunds(
    customerId: string,
    confirmationCode: string,
  ): Promise<RefundFixResult> {
    if (confirmationCode !== 'FIX_CUSTOMER_REFUNDS_2025') {
      throw new Error('Invalid confirmation code');
    }

    this.logger.log(`[REFUND FIX CUSTOMER] Fixing refunds for customer ${customerId}`);

    const result: RefundFixResult = {
      total_cancelled_orders: 0,
      customers_affected: 1,
      total_amount_to_refund: 0,
      already_fixed_count: 0,
      details: [],
    };

    // Find customer's cancelled orders
    const cancelledOrders = await this.orderRepository.find({
      where: { 
        customer_id: customerId,
        order_status: OrderStatus.CANCELLED,
        payment_status: PaymentStatus.PAID,
      },
      relations: ['customer', 'customer.wallet'],
      order: { cancelled_at: 'ASC' },
    });

    if (cancelledOrders.length === 0) {
      throw new Error('No cancelled orders found for this customer that need refunds');
    }

    const customer = cancelledOrders[0].customer;
    if (!customer) {
      throw new Error('Customer not found');
    }

    let wallet = await this.walletRepository.findOne({
      where: { user_id: customerId },
    });

    if (!wallet) {
      wallet = this.walletRepository.create({
        user_id: customerId,
        balance: 0,
        vendor_balance: 0,
        last_transaction_at: new Date(),
      });
      await this.walletRepository.save(wallet);
    }

    result.total_cancelled_orders = cancelledOrders.length;

    for (const order of cancelledOrders) {
      try {
        const payment = await this.paymentRepository.findOne({
          where: { order_id: order.id },
        });

        const alreadyFixed = payment && 
          payment.status === 'REFUNDED' && 
          Number(payment.refunded_amount) > 0;

        if (alreadyFixed) {
          result.already_fixed_count++;
          result.details.push({
            order_id: order.id,
            order_number: order.order_number,
            customer_id: customerId,
            customer_email: customer.email,
            customer_name: `${customer.first_name} ${customer.last_name}`,
            refund_amount: Number(order.total_amount),
            current_balance: Number(wallet.balance),
            new_balance: Number(wallet.balance),
            cancelled_at: order.cancelled_at,
            status: 'already_fixed',
            refund_processed_at: payment.refunded_at,
          });
          continue;
        }

        const refundAmount = Number(order.total_amount);
        const currentBalance = Number(wallet.balance);

        wallet.balance = Number(wallet.balance) + refundAmount;
        wallet.last_transaction_at = new Date();
        result.total_amount_to_refund += refundAmount;

        order.payment_status = PaymentStatus.REFUNDED;
        await this.orderRepository.save(order);

        if (payment) {
          payment.processRefund(
            refundAmount,
            'Refund processed by admin for cancelled order'
          );
          await this.paymentRepository.save(payment);
        }

        result.details.push({
          order_id: order.id,
          order_number: order.order_number,
          customer_id: customerId,
          customer_email: customer.email,
          customer_name: `${customer.first_name} ${customer.last_name}`,
          refund_amount: refundAmount,
          current_balance: currentBalance,
          new_balance: Number(wallet.balance),
          cancelled_at: order.cancelled_at,
          status: 'success',
          refund_processed_at: new Date(),
        });

      } catch (error) {
        result.details.push({
          order_id: order.id,
          order_number: order.order_number,
          customer_id: customerId,
          customer_email: customer.email,
          customer_name: `${customer.first_name} ${customer.last_name}`,
          refund_amount: Number(order.total_amount),
          current_balance: Number(wallet.balance),
          new_balance: Number(wallet.balance),
          cancelled_at: order.cancelled_at,
          status: 'error',
          error_message: error.message,
        });
      }
    }

    await this.walletRepository.save(wallet);

    return result;
  }

  /**
   * Fix a specific order refund
   */
  async fixSpecificOrderRefund(
    orderId: string,
    confirmationCode: string,
  ): Promise<{ success: boolean; message: string; details: any }> {
    if (confirmationCode !== 'FIX_ORDER_REFUND_2025') {
      throw new Error('Invalid confirmation code');
    }

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['customer', 'customer.wallet'],
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.order_status !== OrderStatus.CANCELLED) {
      throw new Error('Order must be cancelled');
    }

    if (order.payment_status !== PaymentStatus.PAID) {
      throw new Error('Order payment status must be PAID to process refund');
    }

    // Check if already refunded
    const payment = await this.paymentRepository.findOne({
      where: { order_id: orderId },
    });

    if (payment && payment.status === 'REFUNDED' && Number(payment.refunded_amount) > 0) {
      return {
        success: false,
        message: 'Order already refunded',
        details: {
          order_number: order.order_number,
          refunded_at: payment.refunded_at,
          refunded_amount: payment.refunded_amount,
        },
      };
    }

    let wallet = await this.walletRepository.findOne({
      where: { user_id: order.customer_id },
    });

    if (!wallet) {
      wallet = this.walletRepository.create({
        user_id: order.customer_id,
        balance: 0,
        vendor_balance: 0,
        last_transaction_at: new Date(),
      });
      await this.walletRepository.save(wallet);
    }

    const refundAmount = Number(order.total_amount);
    const previousBalance = Number(wallet.balance);

    wallet.balance = Number(wallet.balance) + refundAmount;
    wallet.last_transaction_at = new Date();
    await this.walletRepository.save(wallet);

    order.payment_status = PaymentStatus.REFUNDED;
    await this.orderRepository.save(order);

    if (payment) {
      payment.processRefund(
        refundAmount,
        'Refund processed by admin for cancelled order'
      );
      await this.paymentRepository.save(payment);
    }

    this.logger.log(
      `[FIX ORDER REFUND] ✓ Refunded ${refundAmount} to customer for order ${order.order_number}`
    );

    return {
      success: true,
      message: `Successfully refunded ${refundAmount} ${order.currency} to customer`,
      details: {
        order_id: orderId,
        order_number: order.order_number,
        customer_email: order.customer.email,
        refund_amount: refundAmount,
        previous_balance: previousBalance,
        new_balance: Number(wallet.balance),
        refunded_at: new Date(),
      },
    };
  }
}