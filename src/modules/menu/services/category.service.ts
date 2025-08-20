import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CategoryRepository } from '../repositories/category.repository';
import { Category } from 'src/entities';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async createCategory(categoryData: Partial<Category>): Promise<Category> {
    this.logger.log(`Creating category: ${categoryData.name}`);

    // Check if category name already exists
    const existingCategory = await this.categoryRepository.findByName(categoryData.name);
    if (existingCategory) {
      throw new ConflictException(`Category with name '${categoryData.name}' already exists`);
    }

    // Validate parent category if provided
    if (categoryData.parent_category_id) {
      const parentCategory = await this.categoryRepository.findById(categoryData.parent_category_id);
      if (!parentCategory) {
        throw new NotFoundException(`Parent category with ID ${categoryData.parent_category_id} not found`);
      }
    }

    const category = await this.categoryRepository.create(categoryData);
    this.logger.log(`Category created successfully: ${category.id}`);
    return category;
  }

  async getCategoryById(id: string): Promise<Category> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async getAllCategories(): Promise<Category[]> {
    this.logger.log('Fetching all active categories');
    return await this.categoryRepository.findAll();
  }

  async getActiveCategories(): Promise<Category[]> {
    this.logger.log('Fetching active categories');
    return await this.categoryRepository.findActive();
  }

  async getParentCategories(): Promise<Category[]> {
    this.logger.log('Fetching parent categories');
    return await this.categoryRepository.findParentCategories();
  }

  async getSubCategories(parentId: string): Promise<Category[]> {
    this.logger.log(`Fetching sub-categories for parent ${parentId}`);
    
    // Verify parent category exists
    const parentCategory = await this.getCategoryById(parentId);
    if (parentCategory.parent_category_id) {
      throw new BadRequestException(`Category ${parentId} is not a parent category`);
    }

    return await this.categoryRepository.findSubCategories(parentId);
  }

  async getCategoryHierarchy(): Promise<Category[]> {
    this.logger.log('Fetching category hierarchy');
    return await this.categoryRepository.getCategoryHierarchy();
  }

  async getCategoriesWithItemCount(): Promise<Array<Category & { item_count: number }>> {
    this.logger.log('Fetching categories with item count');
    return await this.categoryRepository.getCategoriesWithItemCount();
  }

  async updateCategory(id: string, updateData: Partial<Category>): Promise<Category> {
    this.logger.log(`Updating category ${id}`);

    // Check if category exists
    const existingCategory = await this.getCategoryById(id);

    // If updating name, check for conflicts
    if (updateData.name && updateData.name !== existingCategory.name) {
      const nameConflict = await this.categoryRepository.findByName(updateData.name);
      if (nameConflict && nameConflict.id !== id) {
        throw new ConflictException(`Category with name '${updateData.name}' already exists`);
      }
    }

    // Validate parent category if being updated
    if (updateData.parent_category_id !== undefined) {
      if (updateData.parent_category_id === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }

      if (updateData.parent_category_id) {
        const parentCategory = await this.categoryRepository.findById(updateData.parent_category_id);
        if (!parentCategory) {
          throw new NotFoundException(`Parent category with ID ${updateData.parent_category_id} not found`);
        }
      }
    }

    const updatedCategory = await this.categoryRepository.update(id, updateData);
    if (!updatedCategory) {
      throw new NotFoundException(`Failed to update category ${id}`);
    }

    this.logger.log(`Category ${id} updated successfully`);
    return updatedCategory;
  }

  async deleteCategory(id: string): Promise<void> {
    this.logger.log(`Deleting category ${id}`);

    const category = await this.getCategoryById(id);

    // Check if category has sub-categories
    const subCategories = await this.categoryRepository.findSubCategories(id);
    if (subCategories.length > 0) {
      throw new BadRequestException(`Cannot delete category with ${subCategories.length} sub-categories. Please delete sub-categories first.`);
    }

    // Check if category has menu items
    if (category.menu_items && category.menu_items.length > 0) {
      throw new BadRequestException(`Cannot delete category with ${category.menu_items.length} menu items. Please reassign or delete menu items first.`);
    }

    await this.categoryRepository.delete(id);
    this.logger.log(`Category ${id} deleted successfully`);
  }

  async activateCategory(id: string): Promise<Category> {
    this.logger.log(`Activating category ${id}`);
    const category = await this.categoryRepository.activate(id);
    if (!category) {
      throw new NotFoundException(`Failed to activate category ${id}`);
    }
    return category;
  }

  async deactivateCategory(id: string): Promise<Category> {
    this.logger.log(`Deactivating category ${id}`);
    const category = await this.categoryRepository.deactivate(id);
    if (!category) {
      throw new NotFoundException(`Failed to deactivate category ${id}`);
    }
    return category;
  }

  async updateCategorySortOrder(id: string, newOrder: number): Promise<Category> {
    this.logger.log(`Updating sort order for category ${id} to ${newOrder}`);
    
    if (newOrder < 0) {
      throw new BadRequestException('Sort order must be non-negative');
    }

    const category = await this.categoryRepository.updateSortOrder(id, newOrder);
    if (!category) {
      throw new NotFoundException(`Failed to update sort order for category ${id}`);
    }

    return category;
  }

  async setParentCategory(id: string, parentId: string | null): Promise<Category> {
    this.logger.log(`Setting parent category for ${id} to ${parentId || 'none'}`);

    if (parentId === id) {
      throw new BadRequestException('Category cannot be its own parent');
    }

    if (parentId) {
      const parentCategory = await this.getCategoryById(parentId);
      if (parentCategory.parent_category_id) {
        throw new BadRequestException(`Category ${parentId} is not a parent category`);
      }
    }

    const category = await this.categoryRepository.setParentCategory(id, parentId);
    if (!category) {
      throw new NotFoundException(`Failed to set parent category for ${id}`);
    }

    return category;
  }

  async validateCategoryExists(id: string): Promise<boolean> {
    try {
      await this.getCategoryById(id);
      return true;
    } catch {
      return false;
    }
  }
} 