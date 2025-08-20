const { Client } = require('pg');

async function testDatabaseConnection() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'rambini_db',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    console.log('🔌 Testing database connection...');
    await client.connect();
    console.log('✅ Successfully connected to PostgreSQL!');
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    console.log('📊 Database Info:');
    console.log(`   Current Time: ${result.rows[0].current_time}`);
    console.log(`   Version: ${result.rows[0].db_version.split(' ')[0]} ${result.rows[0].db_version.split(' ')[1]}`);
    
    // Test if our database exists
    const dbResult = await client.query("SELECT datname FROM pg_database WHERE datname = 'rambini_db'");
    if (dbResult.rows.length > 0) {
      console.log('✅ Database "rambini_db" exists');
    } else {
      console.log('❌ Database "rambini_db" does not exist');
    }
    
    console.log('\n🎉 Database connection test completed successfully!');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testDatabaseConnection(); 