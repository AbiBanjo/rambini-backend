import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateDeviceTokensTable1700000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'device_tokens',
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
            name: 'token',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'platform',
            type: 'enum',
            enum: ['ANDROID', 'IOS', 'WEB', 'DESKTOP'],
            isNullable: false,
          },
          {
            name: 'device_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'device_model',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'app_version',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'os_version',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'token_status',
            type: 'enum',
            enum: ['ACTIVE', 'INACTIVE', 'EXPIRED', 'REVOKED'],
            default: "'ACTIVE'",
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'last_used_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
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

    // Create indexes
    await queryRunner.createIndex(
      'device_tokens',
      new TableIndex({
        name: 'IDX_DEVICE_TOKENS_USER_ACTIVE',
        columnNames: ['user_id', 'is_active'],
      }),
    );

    await queryRunner.createIndex(
      'device_tokens',
      new TableIndex({
        name: 'IDX_DEVICE_TOKENS_TOKEN_UNIQUE',
        columnNames: ['token'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'device_tokens',
      new TableIndex({
        name: 'IDX_DEVICE_TOKENS_PLATFORM_ACTIVE',
        columnNames: ['platform', 'is_active'],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'device_tokens',
      new TableForeignKey({
        name: 'FK_DEVICE_TOKENS_USER',
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key first
    const table = await queryRunner.getTable('device_tokens');
    const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('user_id') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('device_tokens', foreignKey);
    }

    // Drop table
    await queryRunner.dropTable('device_tokens');
  }
} 