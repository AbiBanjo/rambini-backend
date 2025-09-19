import { DataSource } from 'typeorm';
import { UserSeeder } from './user.seeder';
import { CategorySeeder } from './category.seeder';

export class DatabaseSeeder {
  constructor(private dataSource: DataSource) {}

  async run(): Promise<void> {
    console.log('Starting database seeding...');

    try {
      // Run seeders in dependency order
      // const userSeeder = new UserSeeder(this.dataSource);
      // await userSeeder.run();

      const categorySeeder = new CategorySeeder(this.dataSource);
      await categorySeeder.run();

      console.log('Database seeding completed successfully!');
    } catch (error) {
      console.error('Error during database seeding:', error);
      throw error;
    }
  }
}

export { UserSeeder } from './user.seeder';
export { CategorySeeder } from './category.seeder'; 