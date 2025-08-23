import { MigrationInterface, QueryRunner } from 'typeorm';

export class SimplifyMenuItemsTable1700000000012 implements MigrationInterface {
  name = 'SimplifyMenuItemsTable1700000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove columns that are no longer needed
    await queryRunner.query(`ALTER TABLE "menu_items" DROP COLUMN IF EXISTS "cost_price"`);
    await queryRunner.query(`ALTER TABLE "menu_items" DROP COLUMN IF EXISTS "images"`);
    await queryRunner.query(`ALTER TABLE "menu_items" DROP COLUMN IF EXISTS "is_featured"`);
    await queryRunner.query(`ALTER TABLE "menu_items" DROP COLUMN IF EXISTS "dietary_info"`);
    await queryRunner.query(`ALTER TABLE "menu_items" DROP COLUMN IF EXISTS "ingredients"`);
    await queryRunner.query(`ALTER TABLE "menu_items" DROP COLUMN IF EXISTS "nutritional_info"`);
    await queryRunner.query(`ALTER TABLE "menu_items" DROP COLUMN IF EXISTS "allergen_info"`);
    await queryRunner.query(`ALTER TABLE "menu_items" DROP COLUMN IF EXISTS "portion_size"`);
    await queryRunner.query(`ALTER TABLE "menu_items" DROP COLUMN IF EXISTS "sort_order"`);
    await queryRunner.query(`ALTER TABLE "menu_items" DROP COLUMN IF EXISTS "rating_average"`);
    await queryRunner.query(`ALTER TABLE "menu_items" DROP COLUMN IF EXISTS "total_ratings"`);
    await queryRunner.query(`ALTER TABLE "menu_items" DROP COLUMN IF EXISTS "total_orders"`);

    // Drop indexes that are no longer needed
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_menu_items_is_featured_is_available"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add the removed columns
    await queryRunner.query(`ALTER TABLE "menu_items" ADD COLUMN "cost_price" decimal(10,2)`);
    await queryRunner.query(`ALTER TABLE "menu_items" ADD COLUMN "images" json`);
    await queryRunner.query(`ALTER TABLE "menu_items" ADD COLUMN "is_featured" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "menu_items" ADD COLUMN "dietary_info" json`);
    await queryRunner.query(`ALTER TABLE "menu_items" ADD COLUMN "ingredients" text`);
    await queryRunner.query(`ALTER TABLE "menu_items" ADD COLUMN "nutritional_info" json`);
    await queryRunner.query(`ALTER TABLE "menu_items" ADD COLUMN "allergen_info" text`);
    await queryRunner.query(`ALTER TABLE "menu_items" ADD COLUMN "portion_size" varchar(100)`);
    await queryRunner.query(`ALTER TABLE "menu_items" ADD COLUMN "sort_order" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "menu_items" ADD COLUMN "rating_average" decimal(3,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "menu_items" ADD COLUMN "total_ratings" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "menu_items" ADD COLUMN "total_orders" integer NOT NULL DEFAULT 0`);

    // Re-create the index
    await queryRunner.query(`CREATE INDEX "IDX_menu_items_is_featured_is_available" ON "menu_items" ("is_featured", "is_available")`);
  }
} 