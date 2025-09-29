import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateWithdrawalsTable1734567890131 implements MigrationInterface {
  name = 'CreateWithdrawalsTable1734567890131';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'withdrawals',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'enum',
            enum: ['NGN', 'USD', 'EUR', 'GBP'],
            isNullable: false,
          },
          {
            name: 'country',
            type: 'enum',
            enum: ['NG', 'US', 'UK'],
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REJECTED'],
            default: "'PENDING'",
            isNullable: false,
          },
          {
            name: 'fee',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'bank_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'account_number',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'account_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'recipient_type',
            type: 'enum',
            enum: ['INDIVIDUAL', 'CORPORATE'],
            isNullable: true,
          },
          {
            name: 'routing_number',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'account_type',
            type: 'enum',
            enum: ['CHECKING', 'CURRENT', 'SAVINGS'],
            isNullable: true,
          },
          {
            name: 'recipient_address',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'recipient_city',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'recipient_state',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'recipient_zip_code',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'sort_code',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'admin_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'transaction_reference',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'processed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'processed_by',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'is_otp_verified',
            type: 'boolean',
            default: false,
            isNullable: false,
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
        foreignKeys: [
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'withdrawals',
      new TableIndex({
        name: 'IDX_withdrawals_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'withdrawals',
      new TableIndex({
        name: 'IDX_withdrawals_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'withdrawals',
      new TableIndex({
        name: 'IDX_withdrawals_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('withdrawals', 'IDX_withdrawals_created_at');
    await queryRunner.dropIndex('withdrawals', 'IDX_withdrawals_status');
    await queryRunner.dropIndex('withdrawals', 'IDX_withdrawals_user_id');

    // Drop table
    await queryRunner.dropTable('withdrawals');
  }
}
