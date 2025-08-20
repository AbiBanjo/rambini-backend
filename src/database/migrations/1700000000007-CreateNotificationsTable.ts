import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateNotificationsTable1700000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
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
            name: 'notification_type',
            type: 'enum',
            enum: [
              'ORDER_UPDATE', 'PAYMENT', 'PROMOTION', 'SYSTEM', 'VENDOR_APPLICATION',
              'SECURITY_ALERT', 'WALLET_UPDATE', 'REVIEW_REQUEST', 'NEWS',
              'ADMIN_BROADCAST', 'VENDOR_ANNOUNCEMENT', 'CUSTOMER_ANNOUNCEMENT'
            ],
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'message',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'data',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'is_read',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'read_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'delivery_method',
            type: 'enum',
            enum: ['IN_APP', 'PUSH', 'SMS', 'EMAIL'],
            default: "'IN_APP'",
            isNullable: false,
          },
          {
            name: 'scheduled_for',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'sent_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'delivery_status',
            type: 'enum',
            enum: ['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'EXPIRED'],
            default: "'PENDING'",
            isNullable: false,
          },
          {
            name: 'failure_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
            default: "'NORMAL'",
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'retry_count',
            type: 'int',
            default: 0,
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
      'notifications',
      new TableIndex({
        name: 'IDX_NOTIFICATIONS_USER_READ',
        columnNames: ['user_id', 'is_read'],
      }),
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_NOTIFICATIONS_TYPE_CREATED',
        columnNames: ['notification_type', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_NOTIFICATIONS_DELIVERY_STATUS',
        columnNames: ['delivery_status'],
      }),
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_NOTIFICATIONS_PRIORITY',
        columnNames: ['priority'],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'notifications',
      new TableForeignKey({
        name: 'FK_NOTIFICATIONS_USER',
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
    const table = await queryRunner.getTable('notifications');
    const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('user_id') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('notifications', foreignKey);
    }

    // Drop table
    await queryRunner.dropTable('notifications');
  }
} 