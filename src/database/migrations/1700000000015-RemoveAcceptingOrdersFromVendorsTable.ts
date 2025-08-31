import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveAcceptingOrdersFromVendorsTable1700000000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('vendors', 'is_accepting_orders');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'vendors',
      new TableColumn({
        name: 'is_accepting_orders',
        type: 'boolean',
        default: false,
        isNullable: false,
        comment: 'Whether vendor is accepting orders',
      }),
    );
  }
} 