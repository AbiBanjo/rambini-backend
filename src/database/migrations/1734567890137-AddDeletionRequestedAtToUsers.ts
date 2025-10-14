import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDeletionRequestedAtToUsers1734567890137 implements MigrationInterface {
  name = 'AddDeletionRequestedAtToUsers1734567890137';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'deletion_requested_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'deletion_requested_at');
  }
}

