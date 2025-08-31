import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveVerificationNotesFromVendorsTable1700000000017 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('vendors', 'verification_notes');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'vendors',
      new TableColumn({
        name: 'verification_notes',
        type: 'text',
        isNullable: true,
        comment: 'Verification notes for vendor',
      }),
    );
  }
} 