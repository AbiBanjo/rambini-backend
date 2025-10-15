import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

async function clearDatabase() {
  console.log('🔌 Connecting to database...');
  
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432'),
    username: process.env.DB_USERNAME ?? 'postgres', 
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_DATABASE ?? 'rambini_db',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');
    
    console.log('\n⚠️  WARNING: This will delete ALL data from your database!');
    console.log(`Database: ${process.env.DB_DATABASE}`);
    console.log(`Host: ${process.env.DB_HOST}\n`);
    
    // Get all table names
    const tables = await dataSource.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    
    if (tables.length === 0) {
      console.log('ℹ️  No tables found in database');
      await dataSource.destroy();
      return;
    }
    
    console.log(`📋 Found ${tables.length} tables to drop:\n`);
    tables.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.tablename}`);
    });
    
    // Disable foreign key checks and drop all tables
    console.log('\n🗑️  Dropping all tables...');
    
    // Drop all tables in a single transaction
    await dataSource.query('DROP SCHEMA public CASCADE');
    await dataSource.query('CREATE SCHEMA public');
    
    // Grant permissions to current user
    const currentUser = process.env.DB_USERNAME || 'postgres';
    await dataSource.query(`GRANT ALL ON SCHEMA public TO "${currentUser}"`);
    await dataSource.query('GRANT ALL ON SCHEMA public TO public');
    
    console.log('✅ All tables dropped successfully!');
    console.log('✅ Database schema recreated');
    
    await dataSource.destroy();
    console.log('\n🎉 Database cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

clearDatabase();

