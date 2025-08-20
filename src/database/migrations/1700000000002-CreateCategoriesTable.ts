import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateCategoriesTable1700000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'categories',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'image_url',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'icon_url',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'sort_order',
            type: 'int',
            default: 0,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'parent_category_id',
            type: 'varchar',
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
      'categories',
      new TableIndex({
        name: 'IDX_CATEGORIES_NAME_UNIQUE',
        columnNames: ['name'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'categories',
      new TableIndex({
        name: 'IDX_CATEGORIES_IS_ACTIVE',
        columnNames: ['is_active'],
      }),
    );

    await queryRunner.createIndex(
      'categories',
      new TableIndex({
        name: 'IDX_CATEGORIES_SORT_ORDER',
        columnNames: ['sort_order'],
      }),
    );

    // Create foreign key for self-referencing parent category
    await queryRunner.createForeignKey(
      'categories',
      new TableForeignKey({
        name: 'FK_CATEGORIES_PARENT_CATEGORY',
        columnNames: ['parent_category_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'categories',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key first
    const table = await queryRunner.getTable('categories');
    const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('parent_category_id') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('categories', foreignKey);
    }

    // Drop indexes
    await queryRunner.dropIndex('categories', 'IDX_CATEGORIES_NAME_UNIQUE');
    await queryRunner.dropIndex('categories', 'IDX_CATEGORIES_IS_ACTIVE');
    await queryRunner.dropIndex('categories', 'IDX_CATEGORIES_SORT_ORDER');

    // Drop table
    await queryRunner.dropTable('categories');
  }
} 