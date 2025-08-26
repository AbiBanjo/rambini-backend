import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpatialIndexes1700000000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable PostGIS extension if not already enabled
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
    
    // Add spatial column to addresses table
    await queryRunner.query(`
      ALTER TABLE addresses 
      ADD COLUMN IF NOT EXISTS location geometry(Point, 4326)
    `);
    
    // Update existing location data
    await queryRunner.query(`
      UPDATE addresses 
      SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    `);
    
    // Create spatial index for efficient proximity queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_ADDRESSES_LOCATION_SPATIAL 
      ON addresses USING GIST (location)
    `);
    
    // Create function to automatically update location when coordinates change
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_address_location()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
          NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
        ELSE
          NEW.location = NULL;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    
    // Create trigger to automatically update location
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_update_address_location ON addresses
    `);
    
    await queryRunner.query(`
      CREATE TRIGGER trigger_update_address_location
      BEFORE INSERT OR UPDATE ON addresses
      FOR EACH ROW
      EXECUTE FUNCTION update_address_location()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_update_address_location ON addresses
    `);
    
    // Drop function
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_address_location()
    `);
    
    // Drop spatial index
    await queryRunner.query(`
      DROP INDEX IF EXISTS IDX_ADDRESSES_LOCATION_SPATIAL
    `);
    
    // Drop spatial column
    await queryRunner.query(`
      ALTER TABLE addresses DROP COLUMN IF EXISTS location
    `);
  }
} 