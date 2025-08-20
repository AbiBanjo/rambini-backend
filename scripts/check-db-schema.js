const { Client } = require('pg');
require('dotenv').config();

async function checkDatabaseSchema() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'rambini',
  });

  try {
    await client.connect();
    console.log('Connected to database successfully');

    // Check if vendors table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'vendors'
      );
    `);

    if (tableExists.rows[0].exists) {
      console.log('✅ Vendors table exists');
      
      // Get table structure
      const tableStructure = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'vendors' 
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📋 Vendors table structure:');
      tableStructure.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });

      // Check for address_id column specifically
      const addressIdExists = tableStructure.rows.find(row => row.column_name === 'address_id');
      if (addressIdExists) {
        console.log('\n✅ address_id column exists');
      } else {
        console.log('\n❌ address_id column is missing');
      }

    } else {
      console.log('❌ Vendors table does not exist');
    }

    // Check if addresses table exists
    const addressesTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'addresses'
      );
    `);

    if (addressesTableExists.rows[0].exists) {
      console.log('\n✅ Addresses table exists');
      
      // Get addresses table structure
      const addressesTableStructure = await client.query(`
        SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'addresses' 
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📋 Addresses table structure:');
      addressesTableStructure.rows.forEach(row => {
        const lengthInfo = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
        console.log(`  ${row.column_name}: ${row.data_type}${lengthInfo} (nullable: ${row.is_nullable})`);
      });
    } else {
      console.log('\n❌ Addresses table does not exist');
    }

  } catch (error) {
    console.error('Error checking database schema:', error);
  } finally {
    await client.end();
  }
}

checkDatabaseSchema(); 