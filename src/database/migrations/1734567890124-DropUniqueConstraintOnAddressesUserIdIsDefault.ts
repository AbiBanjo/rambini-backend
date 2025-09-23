import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUniqueConstraintOnAddressesUserIdIsDefault1734567890124 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the problematic unique constraint that prevents users from having multiple addresses
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ADDRESSES_USER_ID_IS_DEFAULT"`);
    
    // Create a partial unique index that only enforces uniqueness for default addresses (is_default = true)
    // This allows multiple non-default addresses while ensuring only one default address per user
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_ADDRESSES_USER_ID_DEFAULT_TRUE" 
      ON "addresses" ("user_id") 
      WHERE "is_default" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the partial unique index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ADDRESSES_USER_ID_DEFAULT_TRUE"`);
    
    // Recreate the original unique constraint (this might fail if there are multiple addresses per user)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_ADDRESSES_USER_ID_IS_DEFAULT" 
      ON "addresses" ("user_id", "is_default")
    `);
  }
}
