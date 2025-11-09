import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddSocialAuthToUsers1736000000000 implements MigrationInterface {
  name = 'AddSocialAuthToUsers1736000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add auth_provider column with enum type
    // TypeORM will create the enum type automatically
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'auth_provider',
        type: 'enum',
        enum: ['LOCAL', 'GOOGLE', 'APPLE'],
        default: "'LOCAL'",
        isNullable: false,
      }),
    );

    // Add provider_id column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'provider_id',
        type: 'varchar',
        length: '255',
        isNullable: true,
        comment: 'Provider user ID (Google/Apple)',
      }),
    );

    // Add provider_email column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'provider_email',
        type: 'varchar',
        length: '255',
        isNullable: true,
        comment: 'Email from provider (may differ from user email)',
      }),
    );

    // Create indexes for provider lookups
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USERS_AUTH_PROVIDER',
        columnNames: ['auth_provider'],
      }),
    );

    // Create unique index with WHERE clause using raw SQL
    // This ensures provider_id is unique per auth_provider when not null
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_USERS_PROVIDER_ID" 
      ON users (auth_provider, provider_id) 
      WHERE provider_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('users', 'IDX_USERS_PROVIDER_ID');
    await queryRunner.dropIndex('users', 'IDX_USERS_AUTH_PROVIDER');

    // Drop columns
    await queryRunner.dropColumn('users', 'provider_email');
    await queryRunner.dropColumn('users', 'provider_id');
    await queryRunner.dropColumn('users', 'auth_provider');

    // Note: TypeORM will handle enum type cleanup automatically
  }
}
