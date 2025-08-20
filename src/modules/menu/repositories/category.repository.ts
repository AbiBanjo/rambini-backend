import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from 'src/entities';

@Injectable()
export class CategoryRepository {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(category: Partial<Category>): Promise<Category> {
    const newCategory = this.categoryRepository.create(category);
    return await this.categoryRepository.save(newCategory);
  }

  async findById(id: string): Promise<Category | null> {
    return await this.categoryRepository.findOne({
      where: { id },
      relations: ['parent_category', 'sub_categories', 'menu_items'],
    });
  }

  async findByName(name: string): Promise<Category | null> {
    return await this.categoryRepository.findOne({
      where: { name },
    });
  }

  async findAll(): Promise<Category[]> {
    return await this.categoryRepository.find({
      where: { is_active: true },
      relations: ['parent_category', 'sub_categories'],
      order: { sort_order: 'ASC', name: 'ASC' },
    });
  }

  async findActive(): Promise<Category[]> {
    return await this.categoryRepository.find({
      where: { is_active: true },
      order: { sort_order: 'ASC', name: 'ASC' },
    });
  }

  async findParentCategories(): Promise<Category[]> {
    return await this.categoryRepository.find({
      where: { parent_category_id: null, is_active: true },
      relations: ['sub_categories'],
      order: { sort_order: 'ASC', name: 'ASC' },
    });
  }

  async findSubCategories(parentId: string): Promise<Category[]> {
    return await this.categoryRepository.find({
      where: { parent_category_id: parentId, is_active: true },
      order: { sort_order: 'ASC', name: 'ASC' },
    });
  }

  async update(id: string, updateData: Partial<Category>): Promise<Category | null> {
    await this.categoryRepository.update(id, updateData);
    return await this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.categoryRepository.softDelete(id);
  }

  async activate(id: string): Promise<Category | null> {
    await this.categoryRepository.update(id, { is_active: true });
    return await this.findById(id);
  }

  async deactivate(id: string): Promise<Category | null> {
    await this.categoryRepository.update(id, { is_active: false });
    return await this.findById(id);
  }

  async updateSortOrder(id: string, newOrder: number): Promise<Category | null> {
    await this.categoryRepository.update(id, { sort_order: newOrder });
    return await this.findById(id);
  }

  async setParentCategory(id: string, parentId: string | null): Promise<Category | null> {
    await this.categoryRepository.update(id, { parent_category_id: parentId });
    return await this.findById(id);
  }

  async getCategoryHierarchy(): Promise<Category[]> {
    return await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.sub_categories', 'sub_categories')
      .where('category.parent_category_id IS NULL')
      .andWhere('category.is_active = :isActive', { isActive: true })
      .orderBy('category.sort_order', 'ASC')
      .addOrderBy('category.name', 'ASC')
      .getMany();
  }

  async getCategoriesWithItemCount(): Promise<Array<Category & { item_count: number }>> {
    const result = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoin('category.menu_items', 'menu_item')
      .addSelect('COUNT(menu_item.id)', 'item_count')
      .where('category.is_active = :isActive', { isActive: true })
      .groupBy('category.id')
      .orderBy('category.sort_order', 'ASC')
      .addOrderBy('category.name', 'ASC')
      .getRawAndEntities();
    
    // Map the result to include item_count
    return result.entities.map((category, index) => {
      const categoryWithCount = category as Category & { item_count: number };
      categoryWithCount.item_count = parseInt(result.raw[index].item_count) || 0;
      return categoryWithCount;
    });
  }
} 