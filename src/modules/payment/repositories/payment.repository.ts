import { Injectable, Logger } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Payment, PaymentTransactionStatus, PaymentMethod } from 'src/entities';

@Injectable()
export class PaymentRepository {
  private readonly logger = new Logger(PaymentRepository.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async create(payment: Partial<Payment>): Promise<Payment> {
    const newPayment = this.paymentRepository.create(payment);
    return await this.paymentRepository.save(newPayment);
  }

  async findById(id: string): Promise<Payment | null> {
    return await this.paymentRepository.findOne({
      where: { id },
      relations: ['order', 'order.customer', 'order.vendor'],
    });
  }

  async findByPaymentReference(
    paymentReference: string,
  ): Promise<Payment | null> {
    return await this.paymentRepository.findOne({
      where: { payment_reference: paymentReference },
      relations: ['order', 'order.customer', 'order.vendor'],
    });
  }

  async findByReference(reference: string): Promise<Payment | null> {
    return await this.findByPaymentReference(reference);
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    return await this.paymentRepository.findOne({
      where: { order_id: orderId },
      relations: ['order', 'order.customer', 'order.vendor'],
    });
  }

  async findByExternalReference(
    externalReference: string,
  ): Promise<Payment | null> {
    return await this.paymentRepository.findOne({
      where: { external_reference: externalReference },
      relations: ['order', 'order.customer', 'order.vendor'],
    });
  }

  async findByGatewayTransactionId(
    gatewayTransactionId: string,
  ): Promise<Payment | null> {
    return await this.paymentRepository.findOne({
      where: { gateway_transaction_id: gatewayTransactionId },
      relations: ['order', 'order.customer', 'order.vendor'],
    });
  }

  async update(
    id: string,
    updateData: Partial<Payment>,
  ): Promise<Payment | null> {
    await this.paymentRepository.update(id, updateData);
    return await this.findById(id);
  }

  async updateByPaymentReference(
    paymentReference: string,
    updateData: Partial<Payment>,
  ): Promise<Payment | null> {
    await this.paymentRepository.update(
      { payment_reference: paymentReference },
      updateData,
    );
    return await this.findByPaymentReference(paymentReference);
  }

  async findByStatus(
    status: PaymentTransactionStatus,
    limit?: number,
  ): Promise<Payment[]> {
    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.order', 'order')
      .where('payment.status = :status', { status })
      .orderBy('payment.created_at', 'ASC');

    if (limit) {
      queryBuilder.take(limit);
    }

    return await queryBuilder.getMany();
  }

  async findByPaymentMethod(
    paymentMethod: PaymentMethod,
    limit?: number,
  ): Promise<Payment[]> {
    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.order', 'order')
      .where('payment.payment_method = :paymentMethod', { paymentMethod })
      .orderBy('payment.created_at', 'DESC');

    if (limit) {
      queryBuilder.take(limit);
    }

    return await queryBuilder.getMany();
  }

  async getPaymentStats(
    vendorId?: string,
    customerId?: string,
  ): Promise<{
    total_payments: number;
    total_amount: number;
    successful_payments: number;
    failed_payments: number;
    pending_payments: number;
    payments_by_method: Record<string, number>;
    payments_by_status: Record<string, number>;
  }> {
    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoin('payment.order', 'order');

    if (vendorId) {
      queryBuilder.andWhere('order.vendor_id = :vendorId', { vendorId });
    }

    if (customerId) {
      queryBuilder.andWhere('order.customer_id = :customerId', { customerId });
    }

    // Get total payments and amount
    const totalPayments = await queryBuilder.getCount();
    const totalAmount = await queryBuilder
      .select('SUM(payment.amount)', 'total')
      .getRawOne();

    // Get payments by status
    const paymentsByStatus = await queryBuilder
      .select('payment.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('payment.status')
      .getRawMany();

    // Get payments by method
    const paymentsByMethod = await queryBuilder
      .select('payment.payment_method', 'method')
      .addSelect('COUNT(*)', 'count')
      .groupBy('payment.payment_method')
      .getRawMany();

    const statusCounts: Record<string, number> = {};
    paymentsByStatus.forEach((item: any) => {
      statusCounts[item.status] = parseInt(item.count);
    });

    const methodCounts: Record<string, number> = {};
    paymentsByMethod.forEach((item: any) => {
      methodCounts[item.method] = parseInt(item.count);
    });

    return {
      total_payments: totalPayments,
      total_amount: parseFloat(totalAmount?.total || '0'),
      successful_payments:
        statusCounts[PaymentTransactionStatus.COMPLETED] || 0,
      failed_payments: statusCounts[PaymentTransactionStatus.FAILED] || 0,
      pending_payments: statusCounts[PaymentTransactionStatus.PENDING] || 0,
      payments_by_method: methodCounts,
      payments_by_status: statusCounts,
    };
  }

  async generatePaymentReference(): Promise<string> {
    // Generate UUID-based payment reference - simple and no race conditions!
    const { v4: uuidv4 } = await import('uuid');
    const paymentReference = `PAY-${uuidv4()}`;
    this.logger.log(
      `Generated UUID-based payment reference: ${paymentReference}`,
    );
    return paymentReference;
  }

  async findPendingPayments(limit?: number): Promise<Payment[]> {
    return await this.findByStatus(PaymentTransactionStatus.PENDING, limit);
  }

  async findProcessingPayments(limit?: number): Promise<Payment[]> {
    return await this.findByStatus(PaymentTransactionStatus.PROCESSING, limit);
  }

  async findFailedPayments(limit?: number): Promise<Payment[]> {
    return await this.findByStatus(PaymentTransactionStatus.FAILED, limit);
  }
}
