import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePaymentEntities1703000000000 implements MigrationInterface {
  name = 'CreatePaymentEntities1703000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create payments table
    await queryRunner.createTable(
      new Table({
        name: 'payments',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'order_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'payment_reference',
            type: 'varchar',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'payment_method',
            type: 'enum',
            enum: ['WALLET', 'STRIPE', 'PAYSTACK', 'MERCURY'],
            isNullable: false,
          },
          {
            name: 'provider',
            type: 'enum',
            enum: ['WALLET', 'STRIPE', 'PAYSTACK', 'MERCURY'],
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
            default: "'PENDING'",
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'external_reference',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'gateway_transaction_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'failure_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'processed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'failed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'refunded_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'refunded_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'refund_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'gateway_response',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create indexes for payments table
    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_order_id',
        columnNames: ['order_id'],
      }),
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_payment_reference',
        columnNames: ['payment_reference'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_status_created_at',
        columnNames: ['status', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_provider_status',
        columnNames: ['provider', 'status'],
      }),
    );


    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "payments" 
      ADD CONSTRAINT "FK_payments_order_id" 
      FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_order_id"`);

    // Drop indexes
    await queryRunner.dropIndex('payments', 'IDX_payments_provider_status');
    await queryRunner.dropIndex('payments', 'IDX_payments_status_created_at');
    await queryRunner.dropIndex('payments', 'IDX_payments_payment_reference');
    await queryRunner.dropIndex('payments', 'IDX_payments_order_id');

    // Drop tables
    await queryRunner.dropTable('payments');
  }
}
