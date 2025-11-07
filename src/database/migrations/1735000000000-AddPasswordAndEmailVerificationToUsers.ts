import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddPasswordAndEmailVerificationToUsers1735000000000 implements MigrationInterface {
  name = 'AddPasswordAndEmailVerificationToUsers1735000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, update all users with NULL email to have temporary unique emails
    // Using PostgreSQL's built-in functions to ensure uniqueness per row
    await queryRunner.query(`
      UPDATE users 
      SET email = 'migrated_' || id || '_' || EXTRACT(EPOCH FROM NOW())::bigint || '_' || floor(random() * 100000)::int || '@migrated.rambini.com' 
      WHERE email IS NULL
    `);

    // Make phone_number nullable first (before making email required)
    await queryRunner.changeColumn(
      'users',
      'phone_number',
      new TableColumn({
        name: 'phone_number',
        type: 'varchar',
        length: '20',
        isNullable: true,
        comment: 'E.164 format',
      }),
    );

    // Now make email NOT NULL (after ensuring all rows have emails)
    await queryRunner.changeColumn(
      'users',
      'email',
      new TableColumn({
        name: 'email',
        type: 'varchar',
        length: '255',
        isUnique: true,
        isNullable: false,
      }),
    );

    // Add password field
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'password',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    // Add email_verification_token field
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'email_verification_token',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    // Add password_reset_token field
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'password_reset_token',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    // Add password_reset_expires field
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'password_reset_expires',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    // Create indexes for the new fields
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USERS_EMAIL_VERIFICATION_TOKEN',
        columnNames: ['email_verification_token'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USERS_PASSWORD_RESET_TOKEN',
        columnNames: ['password_reset_token'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('users', 'IDX_USERS_PASSWORD_RESET_TOKEN');
    await queryRunner.dropIndex('users', 'IDX_USERS_EMAIL_VERIFICATION_TOKEN');

    // Drop columns
    await queryRunner.dropColumn('users', 'password_reset_expires');
    await queryRunner.dropColumn('users', 'password_reset_token');
    await queryRunner.dropColumn('users', 'email_verification_token');
    await queryRunner.dropColumn('users', 'password');

    // Revert email to nullable
    await queryRunner.changeColumn(
      'users',
      'email',
      new TableColumn({
        name: 'email',
        type: 'varchar',
        length: '255',
        isUnique: true,
        isNullable: true,
      }),
    );

    // Revert phone_number to NOT NULL
    await queryRunner.changeColumn(
      'users',
      'phone_number',
      new TableColumn({
        name: 'phone_number',
        type: 'varchar',
        length: '20',
        isNullable: false,
        comment: 'E.164 format',
      }),
    );
  }
}

