import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeAddressAndPackageFieldsNullableInDeliveryQuotes1734567890135 implements MigrationInterface {
  name = 'MakeAddressAndPackageFieldsNullableInDeliveryQuotes1734567890135';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make address and package fields nullable in delivery_quotes table
    await queryRunner.query(`
      ALTER TABLE "delivery_quotes" 
      ALTER COLUMN "origin_address" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "delivery_quotes" 
      ALTER COLUMN "destination_address" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "delivery_quotes" 
      ALTER COLUMN "package_details" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Make address and package fields NOT NULL again
    await queryRunner.query(`
      ALTER TABLE "delivery_quotes" 
      ALTER COLUMN "origin_address" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "delivery_quotes" 
      ALTER COLUMN "destination_address" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "delivery_quotes" 
      ALTER COLUMN "package_details" SET NOT NULL
    `);
  }
}
