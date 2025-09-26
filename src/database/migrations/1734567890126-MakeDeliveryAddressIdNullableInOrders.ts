import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class MakeDeliveryAddressIdNullableInOrders1734567890126 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, drop the existing foreign key constraint
    await queryRunner.dropForeignKey('orders', 'FK_ORDERS_DELIVERY_ADDRESS');

    // Alter the column to allow NULL values
    await queryRunner.query(`
      ALTER TABLE "orders" 
      ALTER COLUMN "delivery_address_id" DROP NOT NULL
    `);

    // Re-create the foreign key constraint with nullable column
    await queryRunner.createForeignKey(
      'orders',
      new TableForeignKey({
        name: 'FK_ORDERS_DELIVERY_ADDRESS',
        columnNames: ['delivery_address_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'addresses',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the foreign key constraint
    await queryRunner.dropForeignKey('orders', 'FK_ORDERS_DELIVERY_ADDRESS');

    // Alter the column back to NOT NULL (this might fail if there are NULL values)
    await queryRunner.query(`
      ALTER TABLE "orders" 
      ALTER COLUMN "delivery_address_id" SET NOT NULL
    `);

    // Re-create the foreign key constraint
    await queryRunner.createForeignKey(
      'orders',
      new TableForeignKey({
        name: 'FK_ORDERS_DELIVERY_ADDRESS',
        columnNames: ['delivery_address_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'addresses',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
  }
}
