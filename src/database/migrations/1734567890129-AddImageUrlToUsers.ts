import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddImageUrlToUsers1734567890129 implements MigrationInterface {
  name = 'AddImageUrlToUsers1734567890129';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'image_url',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'image_url');
  }
}
