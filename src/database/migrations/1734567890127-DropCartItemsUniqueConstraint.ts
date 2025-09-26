import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropCartItemsUniqueConstraint1734567890127 implements MigrationInterface {
  name = 'DropCartItemsUniqueConstraint1734567890127';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique constraint on cart_items table
    // The constraint name is IDX_f7a8811d8e44261ac7e128a856 based on the error message
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_f7a8811d8e44261ac7e128a856"`);
    
    // Alternative approach if the above doesn't work:
    // await queryRunner.query(`ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "IDX_f7a8811d8e44261ac7e128a856"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the unique constraint if we need to rollback
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f7a8811d8e44261ac7e128a856" ON "cart_items" ("user_id", "menu_item_id", "vendor_id")`);
  }
}
