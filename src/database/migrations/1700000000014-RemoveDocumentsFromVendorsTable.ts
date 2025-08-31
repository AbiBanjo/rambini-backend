import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveDocumentsFromVendorsTable1700000000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('vendors', 'documents');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'vendors',
      new TableColumn({
        name: 'documents',
        type: 'json',
        isNullable: true,
        comment: 'Array of vendor documents with metadata',
      }),
    );
  }
} 