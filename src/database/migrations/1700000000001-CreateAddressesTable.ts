import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateAddressesTable1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'addresses',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            length: '36',
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'address_line_1',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'address_line_2',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'city',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'state',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'postal_code',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'country',
            type: 'varchar',
            length: '2',
            default: "'NG'",
          },
          {
            name: 'latitude',
            type: 'decimal',
            precision: 10,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'longitude',
            type: 'decimal',
            precision: 11,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'is_default',
            type: 'boolean',
            default: false,
          },
          {
            name: 'address_type',
            type: 'enum',
            enum: ['HOME', 'WORK', 'OTHER'],
            default: "'HOME'",
          },
          {
            name: 'delivery_instructions',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'landmark',
            type: 'varchar',
            length: '255',
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

    // Create foreign key
    await queryRunner.createForeignKey(
      'addresses',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'addresses',
      new TableIndex({
        name: 'IDX_ADDRESSES_USER_ID',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'addresses',
      new TableIndex({
        name: 'IDX_ADDRESSES_USER_ID_IS_DEFAULT',
        columnNames: ['user_id', 'is_default'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'addresses',
      new TableIndex({
        name: 'IDX_ADDRESSES_LATITUDE_LONGITUDE',
        columnNames: ['latitude', 'longitude'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('addresses');
  }
} 