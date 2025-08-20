import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCartItemsTable1700000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'cart_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'menu_item_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'quantity',
            type: 'int',
            isNullable: false,
            default: 1,
          },
          {
            name: 'unit_price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'total_price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'special_instructions',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'customizations',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            isNullable: false,
            default: true,
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
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create unique index for user_id + menu_item_id combination
    await queryRunner.createIndex(
      'cart_items',
      new TableIndex({
        name: 'IDX_CART_ITEMS_USER_MENU_ITEM',
        columnNames: ['user_id', 'menu_item_id'],
        isUnique: true,
      }),
    );

    // Create index for user_id
    await queryRunner.createIndex(
      'cart_items',
      new TableIndex({
        name: 'IDX_CART_ITEMS_USER_ID',
        columnNames: ['user_id'],
      }),
    );

    // Create index for menu_item_id
    await queryRunner.createIndex(
      'cart_items',
      new TableIndex({
        name: 'IDX_CART_ITEMS_MENU_ITEM_ID',
        columnNames: ['menu_item_id'],
      }),
    );

    // Create index for is_active
    await queryRunner.createIndex(
      'cart_items',
      new TableIndex({
        name: 'IDX_CART_ITEMS_IS_ACTIVE',
        columnNames: ['is_active'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('cart_items', 'IDX_CART_ITEMS_USER_MENU_ITEM');
    await queryRunner.dropIndex('cart_items', 'IDX_CART_ITEMS_USER_ID');
    await queryRunner.dropIndex('cart_items', 'IDX_CART_ITEMS_MENU_ITEM_ID');
    await queryRunner.dropIndex('cart_items', 'IDX_CART_ITEMS_IS_ACTIVE');

    // Drop table
    await queryRunner.dropTable('cart_items');
  }
} 