import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUsersTable1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            length: '36',
          },
          {
            name: 'phone_number',
            type: 'varchar',
            length: '20',
            isUnique: true,
            comment: 'E.164 format',
          },
          {
            name: 'first_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'last_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: true,
          },
          {
            name: 'user_type',
            type: 'enum',
            enum: ['CUSTOMER', 'VENDOR', 'ADMIN'],
            default: "'CUSTOMER'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['ACTIVE', 'SUSPENDED', 'DELETED', 'PENDING_VERIFICATION'],
            default: "'ACTIVE'",
          },
          {
            name: 'is_phone_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'profile_completed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'email_verified_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'phone_verified_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'last_active_at',
            type: 'timestamp',
            isNullable: true,
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
      'users',
      new TableIndex({
        name: 'IDX_USERS_PHONE_NUMBER',
        columnNames: ['phone_number'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USERS_EMAIL',
        columnNames: ['email'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USERS_USER_TYPE_STATUS',
        columnNames: ['user_type', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USERS_CREATED_AT',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
} 