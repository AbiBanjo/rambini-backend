import { DataSource } from 'typeorm';
import { User, UserType, UserStatus } from 'src/entities';

export class UserSeeder {
  constructor(private dataSource: DataSource) {}

  async run(): Promise<void> {
    const userRepository = this.dataSource.getRepository(User);

    // Check if users already exist
    const existingUsers = await userRepository.count();
    if (existingUsers > 0) {
      console.log('Users already seeded, skipping...');
      return;
    }

    // Create sample users
    const users = [
      {
        phone_number: '+2348012345678',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        user_type: UserType.CUSTOMER,
        status: UserStatus.ACTIVE,
        is_phone_verified: true,
        profile_completed: true,
        phone_verified_at: new Date(),
        last_active_at: new Date(),
      },
      {
        phone_number: '+2348012345679',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
        user_type: UserType.CUSTOMER,
        status: UserStatus.ACTIVE,
        is_phone_verified: true,
        profile_completed: true,
        phone_verified_at: new Date(),
        last_active_at: new Date(),
      },
      {
        phone_number: '+2348012345680',
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@rambini.com',
        user_type: UserType.ADMIN,
        status: UserStatus.ACTIVE,
        is_phone_verified: true,
        profile_completed: true,
        phone_verified_at: new Date(),
        last_active_at: new Date(),
      },
      {
        phone_number: '+2348012345681',
        first_name: 'Vendor',
        last_name: 'Owner',
        email: 'vendor@restaurant.com',
        user_type: UserType.VENDOR,
        status: UserStatus.ACTIVE,
        is_phone_verified: true,
        profile_completed: true,
        phone_verified_at: new Date(),
        last_active_at: new Date(),
      },
    ];

    for (const userData of users) {
      const user = userRepository.create(userData);
      await userRepository.save(user);
      console.log(`Created user: ${user.full_name} (${user.phone_number})`);
    }

    console.log(`Seeded ${users.length} users successfully`);
  }
} 