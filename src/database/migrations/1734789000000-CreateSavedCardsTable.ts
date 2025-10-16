import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateSavedCardsTable1734789000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'saved_cards',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'gateway',
            type: 'enum',
            enum: ['stripe', 'paystack'],
            isNullable: false,
          },
          {
            name: 'stripe_customer_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'stripe_payment_method_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'paystack_customer_code',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'paystack_authorization_code',
            type: 'varchar',
            length: '255',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'card_last4',
            type: 'varchar',
            length: '4',
            isNullable: false,
          },
          {
            name: 'card_brand',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'exp_month',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'exp_year',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'country',
            type: 'varchar',
            length: '2',
            isNullable: true,
          },
          {
            name: 'is_default',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'last_used_at',
            type: 'timestamp',
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
      'saved_cards',
      new TableIndex({ name: 'IDX_saved_cards_user_id', columnNames: ['user_id'] }),
    );

    await queryRunner.createIndex(
      'saved_cards',
      new TableIndex({ name: 'IDX_saved_cards_gateway', columnNames: ['gateway'] }),
    );

    await queryRunner.createIndex(
      'saved_cards',
      new TableIndex({ name: 'IDX_saved_cards_stripe_payment_method_id', columnNames: ['stripe_payment_method_id'] }),
    );

    await queryRunner.createIndex(
      'saved_cards',
      new TableIndex({ name: 'IDX_saved_cards_paystack_authorization_code', columnNames: ['paystack_authorization_code'] }),
    );

    await queryRunner.createIndex(
      'saved_cards',
      new TableIndex({ name: 'IDX_saved_cards_user_default', columnNames: ['user_id', 'is_default'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('saved_cards');
  }
}
