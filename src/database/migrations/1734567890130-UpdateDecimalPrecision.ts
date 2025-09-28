import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateDecimalPrecision1734567890130 implements MigrationInterface {
  name = 'UpdateDecimalPrecision1734567890130';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update transactions table
    await queryRunner.query(`
      ALTER TABLE "transactions" 
      ALTER COLUMN "amount" TYPE DECIMAL(12,2)
    `);
    
    await queryRunner.query(`
      ALTER TABLE "transactions" 
      ALTER COLUMN "balance_before" TYPE DECIMAL(12,2)
    `);
    
    await queryRunner.query(`
      ALTER TABLE "transactions" 
      ALTER COLUMN "balance_after" TYPE DECIMAL(12,2)
    `);

    // Update orders table
    await queryRunner.query(`
      ALTER TABLE "orders" 
      ALTER COLUMN "subtotal" TYPE DECIMAL(12,2)
    `);
    
    await queryRunner.query(`
      ALTER TABLE "orders" 
      ALTER COLUMN "delivery_fee" TYPE DECIMAL(12,2)
    `);
    
    await queryRunner.query(`
      ALTER TABLE "orders" 
      ALTER COLUMN "total_amount" TYPE DECIMAL(12,2)
    `);

    // Update payments table
    await queryRunner.query(`
      ALTER TABLE "payments" 
      ALTER COLUMN "amount" TYPE DECIMAL(12,2)
    `);
    
    await queryRunner.query(`
      ALTER TABLE "payments" 
      ALTER COLUMN "refunded_amount" TYPE DECIMAL(12,2)
    `);

    // Update order_items table
    await queryRunner.query(`
      ALTER TABLE "order_items" 
      ALTER COLUMN "unit_price" TYPE DECIMAL(12,2)
    `);
    
    await queryRunner.query(`
      ALTER TABLE "order_items" 
      ALTER COLUMN "total_price" TYPE DECIMAL(12,2)
    `);

    // Update cart_items table
    await queryRunner.query(`
      ALTER TABLE "cart_items" 
      ALTER COLUMN "unit_price" TYPE DECIMAL(12,2)
    `);
    
    await queryRunner.query(`
      ALTER TABLE "cart_items" 
      ALTER COLUMN "total_price" TYPE DECIMAL(12,2)
    `);

    // Update menu_items table
    await queryRunner.query(`
      ALTER TABLE "menu_items" 
      ALTER COLUMN "price" TYPE DECIMAL(12,2)
    `);

    // Update delivery table
    await queryRunner.query(`
      ALTER TABLE "delivery" 
      ALTER COLUMN "cost" TYPE DECIMAL(12,2)
    `);

    // Update delivery_quotes table
    await queryRunner.query(`
      ALTER TABLE "delivery_quotes" 
      ALTER COLUMN "fee" TYPE DECIMAL(12,2)
    `);
    
    await queryRunner.query(`
      ALTER TABLE "delivery_quotes" 
      ALTER COLUMN "insurance_fee" TYPE DECIMAL(12,2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert transactions table
    await queryRunner.query(`
      ALTER TABLE "transactions" 
      ALTER COLUMN "amount" TYPE DECIMAL(10,2)
    `);
    
    await queryRunner.query(`
      ALTER TABLE "transactions" 
      ALTER COLUMN "balance_before" TYPE DECIMAL(10,2)
    `);
    
    await queryRunner.query(`
      ALTER TABLE "transactions" 
      ALTER COLUMN "balance_after" TYPE DECIMAL(10,2)
    `);

    // Revert orders table
    await queryRunner.query(`
      ALTER TABLE "orders" 
      ALTER COLUMN "subtotal" TYPE DECIMAL(10,2)
    `);
    
    await queryRunner.query(`
      ALTER TABLE "orders" 
      ALTER COLUMN "delivery_fee" TYPE DECIMAL(10,2)
    `);
    
    await queryRunner.query(`
      ALTER TABLE "orders" 
      ALTER COLUMN "total_amount" TYPE DECIMAL(10,2)
    `);

    // Revert payments table
    await queryRunner.query(`
      ALTER TABLE "payments" 
      ALTER COLUMN "amount" TYPE DECIMAL(10,2)
    `);
    
    await queryRunner.query(`
      ALTER TABLE "payments" 
      ALTER COLUMN "refunded_amount" TYPE DECIMAL(10,2)
    `);

    // Revert order_items table
    await queryRunner.query(`
      ALTER TABLE "order_items" 
      ALTER COLUMN "unit_price" TYPE DECIMAL(10,2)
    `);
    
    await queryRunner.query(`
      ALTER TABLE "order_items" 
      ALTER COLUMN "total_price" TYPE DECIMAL(10,2)
    `);

    // Revert cart_items table
    await queryRunner.query(`
      ALTER TABLE "cart_items" 
      ALTER COLUMN "unit_price" TYPE DECIMAL(10,2)
    `);
    
    await queryRunner.query(`
      ALTER TABLE "cart_items" 
      ALTER COLUMN "total_price" TYPE DECIMAL(10,2)
    `);

    // Revert menu_items table
    await queryRunner.query(`
      ALTER TABLE "menu_items" 
      ALTER COLUMN "price" TYPE DECIMAL(10,2)
    `);

    // Revert delivery table
    await queryRunner.query(`
      ALTER TABLE "delivery" 
      ALTER COLUMN "cost" TYPE DECIMAL(10,2)
    `);

    // Revert delivery_quotes table
    await queryRunner.query(`
      ALTER TABLE "delivery_quotes" 
      ALTER COLUMN "fee" TYPE DECIMAL(10,2)
    `);
    
    await queryRunner.query(`
      ALTER TABLE "delivery_quotes" 
      ALTER COLUMN "insurance_fee" TYPE DECIMAL(10,2)
    `);
  }
}
