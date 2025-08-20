const { Client } = require('pg');

async function setupDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'rambini_db',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    // Check if tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'addresses', 'vendors', 'wallets')
    `;
    
    const tablesResult = await client.query(tablesQuery);
    const existingTables = tablesResult.rows.map(row => row.table_name);
    
    console.log('Existing tables:', existingTables);

    if (existingTables.length === 0) {
      console.log('No tables found. Please run migrations first.');
      console.log('Run: npm run migration:run');
    } else {
      console.log('Tables found. Database setup appears complete.');
      
      // Check user count
      const userCountQuery = 'SELECT COUNT(*) as count FROM users';
      const userCountResult = await client.query(userCountQuery);
      console.log(`Users in database: ${userCountResult.rows[0].count}`);
    }

  } catch (error) {
    console.error('Database setup error:', error.message);
  } finally {
    await client.end();
  }
}

setupDatabase(); 