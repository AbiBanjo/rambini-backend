import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateDeliveryTables1700000000000 implements MigrationInterface {
  name = 'CreateDeliveryTables1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create deliveries table
    await queryRunner.createTable(
      new Table({
        name: 'deliveries',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'order_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'provider',
            type: 'enum',
            enum: ['shipbubble'],
            default: "'shipbubble'",
          },
          {
            name: 'tracking_number',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'cancelled', 'returned'],
            default: "'pending'",
          },
          {
            name: 'cost',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'NGN'",
          },
          {
            name: 'courier_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'service_type',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'rate_id',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'reference_number',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'label_url',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'estimated_delivery',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'actual_delivery',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'origin_address',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'destination_address',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'package_details',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'provider_response',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'failure_reason',
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
        foreignKeys: [
          {
            columnNames: ['order_id'],
            referencedTableName: 'orders',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create delivery_tracking table
    await queryRunner.createTable(
      new Table({
        name: 'delivery_tracking',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'delivery_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'location',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'provider_data',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['delivery_id'],
            referencedTableName: 'deliveries',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create indexes for better performance
    await queryRunner.createIndex(
      'deliveries',
      new TableIndex({ name: 'IDX_DELIVERIES_ORDER_ID', columnNames: ['order_id'] }),
    );

    await queryRunner.createIndex(
      'deliveries',
      new TableIndex({ name: 'IDX_DELIVERIES_TRACKING_NUMBER', columnNames: ['tracking_number'] }),
    );

    await queryRunner.createIndex(
      'deliveries',
      new TableIndex({ name: 'IDX_DELIVERIES_STATUS', columnNames: ['status'] }),
    );

    await queryRunner.createIndex(
      'deliveries',
      new TableIndex({ name: 'IDX_DELIVERIES_PROVIDER', columnNames: ['provider'] }),
    );

    await queryRunner.createIndex(
      'delivery_tracking',
      new TableIndex({ name: 'IDX_DELIVERY_TRACKING_DELIVERY_ID', columnNames: ['delivery_id'] }),
    );

    await queryRunner.createIndex(
      'delivery_tracking',
      new TableIndex({ name: 'IDX_DELIVERY_TRACKING_TIMESTAMP', columnNames: ['timestamp'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('delivery_tracking', 'IDX_DELIVERY_TRACKING_TIMESTAMP');
    await queryRunner.dropIndex('delivery_tracking', 'IDX_DELIVERY_TRACKING_DELIVERY_ID');
    await queryRunner.dropIndex('deliveries', 'IDX_DELIVERIES_PROVIDER');
    await queryRunner.dropIndex('deliveries', 'IDX_DELIVERIES_STATUS');
    await queryRunner.dropIndex('deliveries', 'IDX_DELIVERIES_TRACKING_NUMBER');
    await queryRunner.dropIndex('deliveries', 'IDX_DELIVERIES_ORDER_ID');

    // Drop tables
    await queryRunner.dropTable('delivery_tracking');
    await queryRunner.dropTable('deliveries');
  }
}
