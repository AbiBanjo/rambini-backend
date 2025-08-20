import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateVendorsTable1700000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'vendors',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            length: '36',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
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
          {
            name: 'user_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'business_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'address_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'is_accepting_orders',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'commission_rate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 10.0,
            isNullable: false,
          },
          {
            name: 'document_verification_status',
            type: 'enum',
            enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'],
            default: "'PENDING'",
            isNullable: false,
          },
          {
            name: 'verification_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'verified_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'verified_by',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'vendors',
      new TableIndex({
        name: 'IDX_VENDORS_USER_ID',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'vendors',
      new TableIndex({
        name: 'IDX_VENDORS_ADDRESS_ID',
        columnNames: ['address_id'],
      }),
    );

    await queryRunner.createIndex(
      'vendors',
      new TableIndex({
        name: 'IDX_VENDORS_DOCUMENT_VERIFICATION_STATUS',
        columnNames: ['document_verification_status'],
      }),
    );

    await queryRunner.createIndex(
      'vendors',
      new TableIndex({
        name: 'IDX_VENDORS_IS_ACTIVE',
        columnNames: ['is_active'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'vendors',
      new TableForeignKey({
        name: 'FK_VENDORS_USER_ID',
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'vendors',
      new TableForeignKey({
        name: 'FK_VENDORS_ADDRESS_ID',
        columnNames: ['address_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'addresses',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('vendors', 'FK_VENDORS_ADDRESS_ID');
    await queryRunner.dropForeignKey('vendors', 'FK_VENDORS_USER_ID');
    await queryRunner.dropIndex('vendors', 'IDX_VENDORS_IS_ACTIVE');
    await queryRunner.dropIndex('vendors', 'IDX_VENDORS_DOCUMENT_VERIFICATION_STATUS');
    await queryRunner.dropIndex('vendors', 'IDX_VENDORS_ADDRESS_ID');
    await queryRunner.dropIndex('vendors', 'IDX_VENDORS_USER_ID');
    await queryRunner.dropTable('vendors');
  }
} 