import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeOrderIdNullableInDeliveryQuotes1734567890134 implements MigrationInterface {
  name = 'MakeOrderIdNullableInDeliveryQuotes1734567890134';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make order_id nullable in delivery_quotes table
    await queryRunner.query(`
      ALTER TABLE "delivery_quotes" 
      ALTER COLUMN "order_id" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Make order_id NOT NULL again
    await queryRunner.query(`
      ALTER TABLE "delivery_quotes" 
      ALTER COLUMN "order_id" SET NOT NULL
    `);
  }
}
