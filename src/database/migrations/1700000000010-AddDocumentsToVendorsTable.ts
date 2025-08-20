import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDocumentsToVendorsTable1700000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('vendors', 'documents');
  }
} 