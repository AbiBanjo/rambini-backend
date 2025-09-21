import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShipbubbleAddressCodeToAddressesTable1704000000000 implements MigrationInterface {
  name = 'AddShipbubbleAddressCodeToAddressesTable1704000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE addresses 
      ADD COLUMN shipbubble_address_code VARCHAR(50) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE addresses 
      DROP COLUMN shipbubble_address_code
    `);
  }
}
