import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateOrdersTable1700000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'orders',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'order_number',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'customer_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'vendor_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'delivery_address_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'order_status',
            type: 'enum',
            enum: ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED'],
            default: "'NEW'",
          },
          {
            name: 'order_type',
            type: 'enum',
            enum: ['DELIVERY', 'PICKUP'],
            default: "'DELIVERY'",
          },
          {
            name: 'payment_method',
            type: 'enum',
            enum: ['WALLET', 'STRIPE', 'PAYSTACK', 'CASH_ON_DELIVERY'],
            isNullable: false,
          },
          {
            name: 'payment_status',
            type: 'enum',
            enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
            default: "'PENDING'",
          },
          {
            name: 'payment_reference',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'payment_provider',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'subtotal',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'delivery_fee',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'service_fee',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'tax_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'discount_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'commission_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'total_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'estimated_prep_time_minutes',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'estimated_delivery_time',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'order_ready_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'delivered_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'cancelled_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'cancellation_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'cancelled_by',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'special_instructions',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'delivery_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'customer_rating',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'customer_review',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'vendor_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_ORDERS_ORDER_NUMBER_UNIQUE',
        columnNames: ['order_number'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_ORDERS_CUSTOMER_STATUS',
        columnNames: ['customer_id', 'order_status'],
      }),
    );

    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_ORDERS_VENDOR_STATUS',
        columnNames: ['vendor_id', 'order_status'],
      }),
    );

    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_ORDERS_STATUS_CREATED',
        columnNames: ['order_status', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_ORDERS_PAYMENT_STATUS_CREATED',
        columnNames: ['payment_status', 'created_at'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'orders',
      new TableForeignKey({
        name: 'FK_ORDERS_CUSTOMER',
        columnNames: ['customer_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'orders',
      new TableForeignKey({
        name: 'FK_ORDERS_VENDOR',
        columnNames: ['vendor_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'vendors',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'orders',
      new TableForeignKey({
        name: 'FK_ORDERS_DELIVERY_ADDRESS',
        columnNames: ['delivery_address_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'addresses',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const table = await queryRunner.getTable('orders');
    const foreignKeys = table.foreignKeys;
    
    for (const foreignKey of foreignKeys) {
      await queryRunner.dropForeignKey('orders', foreignKey);
    }

    // Drop indexes
    await queryRunner.dropIndex('orders', 'IDX_ORDERS_ORDER_NUMBER_UNIQUE');
    await queryRunner.dropIndex('orders', 'IDX_ORDERS_CUSTOMER_STATUS');
    await queryRunner.dropIndex('orders', 'IDX_ORDERS_VENDOR_STATUS');
    await queryRunner.dropIndex('orders', 'IDX_ORDERS_STATUS_CREATED');
    await queryRunner.dropIndex('orders', 'IDX_ORDERS_PAYMENT_STATUS_CREATED');

    // Drop table
    await queryRunner.dropTable('orders');
  }
} 