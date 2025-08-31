import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveCommissionRateFromVendorsTable1700000000016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('vendors', 'commission_rate');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'vendors',
      new TableColumn({
        name: 'commission_rate',
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 10.0,
        isNullable: false,
        comment: 'Commission rate for vendor',
      }),
    );
  }
} 