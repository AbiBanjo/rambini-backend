import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateMenuItemsTable1700000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'menu_items',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'vendor_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'category_id',
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
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'cost_price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'preparation_time_minutes',
            type: 'int',
            default: 15,
          },
          {
            name: 'image_url',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'images',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'is_available',
            type: 'boolean',
            default: true,
          },
          {
            name: 'is_featured',
            type: 'boolean',
            default: false,
          },
          {
            name: 'dietary_info',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'ingredients',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'nutritional_info',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'allergen_info',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'portion_size',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'sort_order',
            type: 'int',
            default: 0,
          },
          {
            name: 'rating_average',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0,
          },
          {
            name: 'total_ratings',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_orders',
            type: 'int',
            default: 0,
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
      'menu_items',
      new TableIndex({
        name: 'IDX_MENU_ITEMS_VENDOR_AVAILABLE',
        columnNames: ['vendor_id', 'is_available'],
      }),
    );

    await queryRunner.createIndex(
      'menu_items',
      new TableIndex({
        name: 'IDX_MENU_ITEMS_CATEGORY_AVAILABLE',
        columnNames: ['category_id', 'is_available'],
      }),
    );

    await queryRunner.createIndex(
      'menu_items',
      new TableIndex({
        name: 'IDX_MENU_ITEMS_FEATURED_AVAILABLE',
        columnNames: ['is_featured', 'is_available'],
      }),
    );

    await queryRunner.createIndex(
      'menu_items',
      new TableIndex({
        name: 'IDX_MENU_ITEMS_RATING_DESC',
        columnNames: ['rating_average'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'menu_items',
      new TableForeignKey({
        name: 'FK_MENU_ITEMS_VENDOR',
        columnNames: ['vendor_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'vendors',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'menu_items',
      new TableForeignKey({
        name: 'FK_MENU_ITEMS_CATEGORY',
        columnNames: ['category_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'categories',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const table = await queryRunner.getTable('menu_items');
    const foreignKeys = table.foreignKeys;
    
    for (const foreignKey of foreignKeys) {
      await queryRunner.dropForeignKey('menu_items', foreignKey);
    }

    // Drop indexes
    await queryRunner.dropIndex('menu_items', 'IDX_MENU_ITEMS_VENDOR_AVAILABLE');
    await queryRunner.dropIndex('menu_items', 'IDX_MENU_ITEMS_CATEGORY_AVAILABLE');
    await queryRunner.dropIndex('menu_items', 'IDX_MENU_ITEMS_FEATURED_AVAILABLE');
    await queryRunner.dropIndex('menu_items', 'IDX_MENU_ITEMS_RATING_DESC');

    // Drop table
    await queryRunner.dropTable('menu_items');
  }
} 