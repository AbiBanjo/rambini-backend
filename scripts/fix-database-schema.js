const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function fixDatabaseSchema() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'rambini',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database successfully');

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'fix-vendors-table.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📋 Executing SQL script to fix vendors table...');
    
    // Execute the SQL script
    const result = await client.query(sqlContent);
    
    console.log('✅ SQL script executed successfully');
    
    // Check the final table structure
    const tableStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'vendors' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Final vendors table structure:');
    tableStructure.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Check for address_id column specifically
    const addressIdExists = tableStructure.rows.find(row => row.column_name === 'address_id');
    if (addressIdExists) {
      console.log('\n✅ address_id column now exists - issue should be resolved!');
    } else {
      console.log('\n❌ address_id column still missing - manual intervention required');
    }

  } catch (error) {
    console.error('❌ Error fixing database schema:', error.message);
    
    if (error.code === '28P01') {
      console.log('\n💡 Database authentication failed. Please check your database credentials:');
      console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
      console.log(`   Port: ${process.env.DB_PORT || 5432}`);
      console.log(`   User: ${process.env.DB_USERNAME || 'postgres'}`);
      console.log(`   Database: ${process.env.DB_DATABASE || 'rambini'}`);
      console.log('\n   Make sure to create a .env file with correct database credentials.');
    }
  } finally {
    await client.end();
  }
}

fixDatabaseSchema(); 