import { MigrationInterface, QueryRunner } from "typeorm";

export class FixItemsPriceDecimal1729000000000 implements MigrationInterface {
    name = 'FixItemsPriceDecimal1729000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Change items_price column from integer to decimal(12,2)
        await queryRunner.query(`
            ALTER TABLE "delivery_quotes" 
            ALTER COLUMN "items_price" TYPE DECIMAL(12,2) 
            USING items_price::DECIMAL(12,2)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert items_price column back to integer
        await queryRunner.query(`
            ALTER TABLE "delivery_quotes" 
            ALTER COLUMN "items_price" TYPE INTEGER 
            USING items_price::INTEGER
        `);
    }
}

