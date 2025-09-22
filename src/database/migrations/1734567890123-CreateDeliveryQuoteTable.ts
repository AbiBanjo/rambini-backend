import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateDeliveryQuoteTable1734567890123 implements MigrationInterface {
  name = 'CreateDeliveryQuoteTable1734567890123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "quote_status_enum" AS ENUM('pending', 'selected', 'expired', 'used', 'cancelled')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "quote_provider_enum" AS ENUM('shipbubble', 'uber')
    `);

    // Create delivery_quotes table
    await queryRunner.createTable(
      new Table({
        name: 'delivery_quotes',
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
            enum: ['shipbubble', 'uber'],
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'selected', 'expired', 'used', 'cancelled'],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'provider_quote_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'provider_request_token',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'quote_created_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'fee',
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
            isNullable: false,
          },
          {
            name: 'currency_type',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'estimated_delivery_time',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'duration_minutes',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'pickup_duration_minutes',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'courier_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'courier_name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'service_code',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'service_type',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'is_insurance_available',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'insurance_code',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'insurance_fee',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'is_cod_available',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'cod_remit_days',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'tracking_level',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'waybill_available',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'on_demand_available',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'courier_rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'courier_votes',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'pickup_station',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'dropoff_station',
            type: 'jsonb',
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
            name: 'provider_quote_data',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'provider_rates_data',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'selected_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'selected_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'selection_reason',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'used_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'delivery_id',
            type: 'uuid',
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
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'delivery_quotes',
      new TableIndex({ name: 'IDX_delivery_quotes_order_id', columnNames: ['order_id'] }),
    );

    await queryRunner.createIndex(
      'delivery_quotes',
      new TableIndex({ name: 'IDX_delivery_quotes_provider_status', columnNames: ['provider', 'status'] }),
    );

    await queryRunner.createIndex(
      'delivery_quotes',
      new TableIndex({ name: 'IDX_delivery_quotes_expires_at', columnNames: ['expires_at'] }),
    );

    await queryRunner.createIndex(
      'delivery_quotes',
      new TableIndex({ name: 'IDX_delivery_quotes_provider_quote_id', columnNames: ['provider_quote_id'] }),
    );

    await queryRunner.createIndex(
      'delivery_quotes',
      new TableIndex({ name: 'IDX_delivery_quotes_provider_request_token', columnNames: ['provider_request_token'] }),
    );

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "delivery_quotes" 
      ADD CONSTRAINT "FK_delivery_quotes_order_id" 
      FOREIGN KEY ("order_id") 
      REFERENCES "orders"("id") 
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "delivery_quotes" 
      DROP CONSTRAINT "FK_delivery_quotes_order_id"
    `);

    // Drop indexes
    await queryRunner.dropIndex('delivery_quotes', 'IDX_delivery_quotes_provider_request_token');
    await queryRunner.dropIndex('delivery_quotes', 'IDX_delivery_quotes_provider_quote_id');
    await queryRunner.dropIndex('delivery_quotes', 'IDX_delivery_quotes_expires_at');
    await queryRunner.dropIndex('delivery_quotes', 'IDX_delivery_quotes_provider_status');
    await queryRunner.dropIndex('delivery_quotes', 'IDX_delivery_quotes_order_id');

    // Drop table
    await queryRunner.dropTable('delivery_quotes');

    // Drop enum types
    await queryRunner.query(`DROP TYPE "quote_status_enum"`);
    await queryRunner.query(`DROP TYPE "quote_provider_enum"`);
  }
}

