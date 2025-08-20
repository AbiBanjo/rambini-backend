import { DataSource } from 'typeorm';
import { DatabaseSeeder } from './index';
import { config } from 'dotenv';

// Load environment variables
config();

async function runSeeders() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'rambini_db',
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established');

    const seeder = new DatabaseSeeder(dataSource);
    await seeder.run();

    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

// Run the seeder if this file is executed directly
if (require.main === module) {
  runSeeders();
} 