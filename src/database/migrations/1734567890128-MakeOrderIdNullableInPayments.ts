import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeOrderIdNullableInPayments1734567890128 implements MigrationInterface {
  name = 'MakeOrderIdNullableInPayments1734567890128';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make order_id column nullable to support wallet funding payments
    await queryRunner.query(`
      ALTER TABLE "payments" 
      ALTER COLUMN "order_id" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: This rollback might fail if there are NULL values in order_id
    // You may need to clean up wallet funding payments first
    await queryRunner.query(`
      ALTER TABLE "payments" 
      ALTER COLUMN "order_id" SET NOT NULL
    `);
  }
}
