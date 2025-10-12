import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrackingFieldsToDeliveryQuotes1734567890136 implements MigrationInterface {
  name = 'AddTrackingFieldsToDeliveryQuotes1734567890136';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add tracking_number field
    await queryRunner.query(`
      ALTER TABLE "delivery_quotes" 
      ADD COLUMN "tracking_number" varchar NULL
    `);

    // Add reference_number field
    await queryRunner.query(`
      ALTER TABLE "delivery_quotes" 
      ADD COLUMN "reference_number" varchar NULL
    `);

    // Add label_url field
    await queryRunner.query(`
      ALTER TABLE "delivery_quotes" 
      ADD COLUMN "label_url" varchar NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop label_url field
    await queryRunner.query(`
      ALTER TABLE "delivery_quotes" 
      DROP COLUMN "label_url"
    `);

    // Drop reference_number field
    await queryRunner.query(`
      ALTER TABLE "delivery_quotes" 
      DROP COLUMN "reference_number"
    `);

    // Drop tracking_number field
    await queryRunner.query(`
      ALTER TABLE "delivery_quotes" 
      DROP COLUMN "tracking_number"
    `);
  }
}

