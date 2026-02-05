import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateMenuLikesTable1707000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create menu_likes table
    await queryRunner.createTable(
      new Table({
        name: 'menu_likes',
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
            name: 'menu_item_id',
            type: 'varchar',
            isNullable: false,
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
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create unique constraint on user_id and menu_item_id
    await queryRunner.createIndex(
      'menu_likes',
      new TableIndex({
        name: 'IDX_MENU_LIKES_USER_MENU_UNIQUE',
        columnNames: ['user_id', 'menu_item_id'],
        isUnique: true,
      }),
    );

    // Create index on user_id for faster lookups
    await queryRunner.createIndex(
      'menu_likes',
      new TableIndex({
        name: 'IDX_MENU_LIKES_USER_ID',
        columnNames: ['user_id'],
      }),
    );

    // Create index on menu_item_id for faster lookups
    await queryRunner.createIndex(
      'menu_likes',
      new TableIndex({
        name: 'IDX_MENU_LIKES_MENU_ITEM_ID',
        columnNames: ['menu_item_id'],
      }),
    );

    // Create index on created_at for sorting
    await queryRunner.createIndex(
      'menu_likes',
      new TableIndex({
        name: 'IDX_MENU_LIKES_CREATED_AT',
        columnNames: ['created_at'],
      }),
    );

    // Add foreign key to users table
    await queryRunner.createForeignKey(
      'menu_likes',
      new TableForeignKey({
        name: 'FK_MENU_LIKES_USER',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Add foreign key to menu_items table
    await queryRunner.createForeignKey(
      'menu_likes',
      new TableForeignKey({
        name: 'FK_MENU_LIKES_MENU_ITEM',
        columnNames: ['menu_item_id'],
        referencedTableName: 'menu_items',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    await queryRunner.dropForeignKey('menu_likes', 'FK_MENU_LIKES_MENU_ITEM');
    await queryRunner.dropForeignKey('menu_likes', 'FK_MENU_LIKES_USER');

    // Drop indexes
    await queryRunner.dropIndex('menu_likes', 'IDX_MENU_LIKES_CREATED_AT');
    await queryRunner.dropIndex('menu_likes', 'IDX_MENU_LIKES_MENU_ITEM_ID');
    await queryRunner.dropIndex('menu_likes', 'IDX_MENU_LIKES_USER_ID');
    await queryRunner.dropIndex('menu_likes', 'IDX_MENU_LIKES_USER_MENU_UNIQUE');

    // Drop table
    await queryRunner.dropTable('menu_likes');
  }
}