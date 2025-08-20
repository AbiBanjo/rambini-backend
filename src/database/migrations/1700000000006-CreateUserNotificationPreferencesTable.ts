import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateUserNotificationPreferencesTable1700000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_notification_preferences',
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
            name: 'in_app_enabled',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'push_enabled',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'sms_enabled',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'email_enabled',
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
      }),
      true,
    );

    // Create unique index for user_id + notification_type combination
    await queryRunner.createIndex(
      'user_notification_preferences',
      new TableIndex({
        name: 'IDX_USER_NOTIFICATION_PREFERENCES_USER_TYPE_UNIQUE',
        columnNames: ['user_id', 'notification_type'],
        isUnique: true,
      }),
    );

    // Create index for user_id for faster lookups
    await queryRunner.createIndex(
      'user_notification_preferences',
      new TableIndex({
        name: 'IDX_USER_NOTIFICATION_PREFERENCES_USER_ID',
        columnNames: ['user_id'],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'user_notification_preferences',
      new TableForeignKey({
        name: 'FK_USER_NOTIFICATION_PREFERENCES_USER',
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
    const table = await queryRunner.getTable('user_notification_preferences');
    const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('user_id') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('user_notification_preferences', foreignKey);
    }

    // Drop table
    await queryRunner.dropTable('user_notification_preferences');
  }
} 