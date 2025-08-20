import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateVendorApplicationsTable1700000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'vendor_applications',
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
            name: 'business_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'business_description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'business_type',
            type: 'enum',
            enum: ['RESTAURANT', 'CAFE', 'FAST_FOOD', 'BAKERY', 'FOOD_TRUCK', 'CATERING', 'GROCERY', 'OTHER'],
            isNullable: false,
          },
          {
            name: 'contact_person_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'contact_phone',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'contact_email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'business_address',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'business_city',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'business_state',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'business_postal_code',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'business_country',
            type: 'varchar',
            length: '2',
            default: "'NG'",
            isNullable: false,
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
            name: 'website_url',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'social_media_handles',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ON_HOLD'],
            default: "'PENDING'",
            isNullable: false,
          },
          {
            name: 'rejection_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'documents',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'menu_samples',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'additional_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'reviewed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'reviewed_by',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'review_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_urgent',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'estimated_approval_date',
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
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'vendor_applications',
      new TableIndex({
        name: 'IDX_VENDOR_APPLICATIONS_USER_ID',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'vendor_applications',
      new TableIndex({
        name: 'IDX_VENDOR_APPLICATIONS_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'vendor_applications',
      new TableIndex({
        name: 'IDX_VENDOR_APPLICATIONS_BUSINESS_TYPE',
        columnNames: ['business_type'],
      }),
    );

    await queryRunner.createIndex(
      'vendor_applications',
      new TableIndex({
        name: 'IDX_VENDOR_APPLICATIONS_CREATED_AT',
        columnNames: ['created_at'],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'vendor_applications',
      new TableForeignKey({
        name: 'FK_VENDOR_APPLICATIONS_USER_ID',
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('vendor_applications', 'FK_VENDOR_APPLICATIONS_USER_ID');
    await queryRunner.dropIndex('vendor_applications', 'IDX_VENDOR_APPLICATIONS_USER_ID');
    await queryRunner.dropIndex('vendor_applications', 'IDX_VENDOR_APPLICATIONS_STATUS');
    await queryRunner.dropIndex('vendor_applications', 'IDX_VENDOR_APPLICATIONS_BUSINESS_TYPE');
    await queryRunner.dropIndex('vendor_applications', 'IDX_VENDOR_APPLICATIONS_CREATED_AT');
    await queryRunner.dropTable('vendor_applications');
  }
} 