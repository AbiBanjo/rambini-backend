import { DataSource } from 'typeorm';
import { Category } from '../../entities';

export class CategorySeeder {
  constructor(private dataSource: DataSource) {}

  async run(): Promise<void> {
    const categoryRepository = this.dataSource.getRepository(Category);

    // Check if categories already exist
    const existingCategories = await categoryRepository.count();
    if (existingCategories > 0) {
      console.log('Categories already seeded, skipping...');
      return;
    }

    const categories = [
      // Main Food Categories
      {
        name: 'Rice Dishes',
        description: 'Various rice-based meals including jollof, fried rice, and local rice dishes',
        sort_order: 1,
        is_active: true,
      },
      {
        name: 'Swallow Foods',
        description: 'Traditional Nigerian swallow foods like pounded yam, eba, amala, and fufu',
        sort_order: 2,
        is_active: true,
      },
      {
        name: 'Soups & Stews',
        description: 'Rich Nigerian soups and stews including egusi, okro, efo riro, and more',
        sort_order: 3,
        is_active: true,
      },
      {
        name: 'Grilled & BBQ',
        description: 'Grilled meats, fish, and barbecue items',
        sort_order: 4,
        is_active: true,
      },
      {
        name: 'Fast Food',
        description: 'Quick meals, burgers, sandwiches, and snacks',
        sort_order: 5,
        is_active: true,
      },
      {
        name: 'Beverages',
        description: 'Drinks, juices, smoothies, and traditional beverages',
        sort_order: 6,
        is_active: true,
      },
      {
        name: 'Desserts',
        description: 'Sweet treats, cakes, pastries, and traditional desserts',
        sort_order: 7,
        is_active: true,
      },
      {
        name: 'Breakfast',
        description: 'Morning meals, continental and local breakfast options',
        sort_order: 8,
        is_active: true,
      },
      {
        name: 'Seafood',
        description: 'Fish, prawns, crabs, and other seafood dishes',
        sort_order: 9,
        is_active: true,
      },
      {
        name: 'Vegetarian',
        description: 'Plant-based meals and vegetarian options',
        sort_order: 10,
        is_active: true,
      },
      {
        name: 'International Cuisine',
        description: 'Chinese, Indian, Italian, and other international dishes',
        sort_order: 11,
        is_active: true,
      },
      {
        name: 'Local Delicacies',
        description: 'Traditional Nigerian delicacies and street food',
        sort_order: 12,
        is_active: true,
      },
    ];

    // Create categories
    for (const categoryData of categories) {
      const category = categoryRepository.create(categoryData);
      await categoryRepository.save(category);
      console.log(`Created category: ${category.name}`);
    }

    console.log(`Successfully seeded ${categories.length} categories`);
  }
} 