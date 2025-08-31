import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveVerifiedByFromVendorsTable1700000000019 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('vendors', 'verified_by');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'vendors',
      new TableColumn({
        name: 'verified_by',
        type: 'varchar',
        length: '255',
        isNullable: true,
        comment: 'Who verified the vendor',
      }),
    );
  }
} 