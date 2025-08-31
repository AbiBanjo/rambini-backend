import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveVerifiedAtFromVendorsTable1700000000018 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('vendors', 'verified_at');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'vendors',
      new TableColumn({
        name: 'verified_at',
        type: 'timestamp',
        isNullable: true,
        comment: 'When vendor was verified',
      }),
    );
  }
} 