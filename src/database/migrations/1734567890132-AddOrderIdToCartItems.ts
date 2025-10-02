import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOrderIdToCartItems1734567890132 implements MigrationInterface {
  name = 'AddOrderIdToCartItems1734567890132';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'cart_items',
      new TableColumn({
        name: 'order_id',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('cart_items', 'order_id');
  }
}
