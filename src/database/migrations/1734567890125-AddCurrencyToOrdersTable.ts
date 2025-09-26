import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCurrencyToOrdersTable1734567890125 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'currency',
        type: 'enum',
        enum: ['NGN', 'USD', 'EUR', 'GBP'],
        default: "'NGN'",
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('orders', 'currency');
  }
}
