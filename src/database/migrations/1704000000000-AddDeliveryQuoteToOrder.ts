import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddDeliveryQuoteToOrder1704000000000 implements MigrationInterface {
  name = 'AddDeliveryQuoteToOrder1704000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add delivery_quote_id column to orders table
    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'delivery_quote_id',
        type: 'varchar',
        isNullable: true,
      })
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'orders',
      new TableForeignKey({
        columnNames: ['delivery_quote_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'delivery_quotes',
        onDelete: 'RESTRICT',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint
    const table = await queryRunner.getTable('orders');
    const foreignKey = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('delivery_quote_id') !== -1
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('orders', foreignKey);
    }

    // Drop column
    await queryRunner.dropColumn('orders', 'delivery_quote_id');
  }
}
