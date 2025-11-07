import { DataSource } from 'typeorm';
import { loadEnvironmentVariables } from './src/utils/env-loader';

// Load environment variables
loadEnvironmentVariables();

async function fixNullEmails() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'rambini_db',
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    // Fix NULL emails
    const result = await dataSource.query(`
      UPDATE users 
      SET email = 'migrated_' || id || '_' || EXTRACT(EPOCH FROM NOW())::bigint || '_' || floor(random() * 100000)::int || '@migrated.rambini.com' 
      WHERE email IS NULL
    `);

    console.log(`✅ Updated ${result.rowCount || 0} users with NULL emails`);

    // Verify
    const nullCount = await dataSource.query(`
      SELECT COUNT(*) as count FROM users WHERE email IS NULL
    `);
    console.log(`📊 Remaining NULL emails: ${nullCount[0].count}`);

    if (parseInt(nullCount[0].count) === 0) {
      console.log('✅ All NULL emails fixed! You can now start your application.');
    }

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error fixing NULL emails:', error);
    process.exit(1);
  }
}

fixNullEmails();

