import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateBanksTable1734567890133 implements MigrationInterface {
  name = 'CreateBanksTable1734567890133';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'banks',
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
            name: 'name',
            type: 'varchar',
            length: '255',
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
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
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
      'banks',
      new TableIndex({
        name: 'IDX_banks_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'banks',
      new TableIndex({
        name: 'IDX_banks_bank_name',
        columnNames: ['bank_name'],
      }),
    );

    // Create unique constraint for user_id + account_number to prevent duplicates
    await queryRunner.createIndex(
      'banks',
      new TableIndex({
        name: 'IDX_banks_user_account_unique',
        columnNames: ['user_id', 'account_number'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('banks', 'IDX_banks_user_account_unique');
    await queryRunner.dropIndex('banks', 'IDX_banks_bank_name');
    await queryRunner.dropIndex('banks', 'IDX_banks_user_id');

    // Drop table
    await queryRunner.dropTable('banks');
  }
}

