import { Injectable } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MenuItem, Vendor, Category } from 'src/entities';
import { SearchMenuItemsDto } from '../dto/search-menu-items.dto';

@Injectable()
export class MenuItemRepository {
  constructor(
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(menuItem: Partial<MenuItem>): Promise<MenuItem> {
    const newMenuItem = this.menuItemRepository.create(menuItem);
    return await this.menuItemRepository.save(newMenuItem);
  }

  async findById(id: string): Promise<MenuItem | null> {
    return await this.menuItemRepository.findOne({
      where: { id },
      relations: ['vendor', 'category'],
    });
  }

  async findByVendorId(vendorId: string): Promise<MenuItem[]> {
    return await this.menuItemRepository.find({
      where: { vendor_id: vendorId },
      relations: ['category'],
      order: { sort_order: 'ASC', name: 'ASC' },
    });
  }

  async findByCategoryId(categoryId: string): Promise<MenuItem[]> {
    return await this.menuItemRepository.find({
      where: { category_id: categoryId, is_available: true },
      relations: ['vendor'],
      order: { sort_order: 'ASC', name: 'ASC' },
    });
  }

  async findFeatured(): Promise<MenuItem[]> {
    return await this.menuItemRepository.find({
      where: { is_featured: true, is_available: true },
      relations: ['vendor', 'category'],
      order: { sort_order: 'ASC', name: 'ASC' },
    });
  }

  async search(searchDto: SearchMenuItemsDto): Promise<{ items: MenuItem[]; total: number }> {
    const queryBuilder = this.createSearchQueryBuilder(searchDto);
    
    // Get total count
    const total = await queryBuilder.getCount();
    
    // Apply pagination
    const page = searchDto.page || 1;
    const limit = searchDto.limit || 20;
    const offset = (page - 1) * limit;
    
    queryBuilder.skip(offset).take(limit);
    
    // Apply sorting
    if (searchDto.sort_by) {
      const sortOrder = searchDto.sort_order || 'DESC';
      queryBuilder.orderBy(`menu_item.${searchDto.sort_by}`, sortOrder as 'ASC' | 'DESC');
    } else {
      queryBuilder.orderBy('menu_item.created_at', 'DESC');
    }
    
    const items = await queryBuilder.getMany();
    
    return { items, total };
  }

  async update(id: string, updateData: Partial<MenuItem>): Promise<MenuItem | null> {
    await this.menuItemRepository.update(id, updateData);
    return await this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.menuItemRepository.softDelete(id);
  }

  async toggleAvailability(id: string): Promise<MenuItem | null> {
    const menuItem = await this.findById(id);
    if (!menuItem) return null;
    
    menuItem.is_available = !menuItem.is_available;
    return await this.menuItemRepository.save(menuItem);
  }

  async toggleFeatured(id: string): Promise<MenuItem | null> {
    const menuItem = await this.findById(id);
    if (!menuItem) return null;
    
    menuItem.is_featured = !menuItem.is_featured;
    return await this.menuItemRepository.save(menuItem);
  }

  async bulkToggleAvailability(ids: string[], value: boolean): Promise<number> {
    const result = await this.menuItemRepository.update(ids, { is_available: value });
    return result.affected || 0;
  }

  async bulkToggleFeatured(ids: string[], value: boolean): Promise<number> {
    const result = await this.menuItemRepository.update(ids, { is_featured: value });
    return result.affected || 0;
  }

  async bulkUpdateCategory(ids: string[], categoryId: string): Promise<number> {
    const result = await this.menuItemRepository.update(ids, { category_id: categoryId });
    return result.affected || 0;
  }

  async bulkDelete(ids: string[]): Promise<number> {
    const result = await this.menuItemRepository.softDelete(ids);
    return result.affected || 0;
  }

  async updateRating(id: string, newRating: number): Promise<void> {
    const menuItem = await this.findById(id);
    if (!menuItem) return;
    
    menuItem.updateRating(newRating);
    await this.menuItemRepository.save(menuItem);
  }

  async incrementOrderCount(id: string): Promise<void> {
    const menuItem = await this.findById(id);
    if (!menuItem) return;
    
    menuItem.incrementOrderCount();
    await this.menuItemRepository.save(menuItem);
  }

  private createSearchQueryBuilder(searchDto: SearchMenuItemsDto): SelectQueryBuilder<MenuItem> {
    const queryBuilder = this.menuItemRepository
      .createQueryBuilder('menu_item')
      .leftJoinAndSelect('menu_item.vendor', 'vendor')
      .leftJoinAndSelect('menu_item.category', 'category')
      .where('menu_item.is_available = :isAvailable', { isAvailable: true });

    // Apply search query
    if (searchDto.query) {
      queryBuilder.andWhere(
        '(menu_item.name ILIKE :query OR menu_item.description ILIKE :query)',
        { query: `%${searchDto.query}%` }
      );
    }

    // Apply category filter
    if (searchDto.category_id) {
      queryBuilder.andWhere('menu_item.category_id = :categoryId', { categoryId: searchDto.category_id });
    }

    // Apply vendor filter
    if (searchDto.vendor_id) {
      queryBuilder.andWhere('menu_item.vendor_id = :vendorId', { vendorId: searchDto.vendor_id });
    }

    // Apply price filters
    if (searchDto.min_price !== undefined) {
      queryBuilder.andWhere('menu_item.price >= :minPrice', { minPrice: searchDto.min_price });
    }
    if (searchDto.max_price !== undefined) {
      queryBuilder.andWhere('menu_item.price <= :maxPrice', { maxPrice: searchDto.max_price });
    }

    // Apply availability filter
    if (searchDto.is_available !== undefined) {
      queryBuilder.andWhere('menu_item.is_available = :isAvailable', { isAvailable: searchDto.is_available });
    }

    // Apply featured filter
    if (searchDto.is_featured !== undefined) {
      queryBuilder.andWhere('menu_item.is_featured = :isFeatured', { isFeatured: searchDto.is_featured });
    }

    // Apply dietary info filter
    if (searchDto.dietary_info && searchDto.dietary_info.length > 0) {
      queryBuilder.andWhere('menu_item.dietary_info @> :dietaryInfo', { 
        dietaryInfo: JSON.stringify(searchDto.dietary_info) 
      });
    }

    // Apply proximity sorting if coordinates provided
    if (searchDto.latitude && searchDto.longitude && searchDto.max_distance) {
      queryBuilder
        .leftJoin('vendor.addresses', 'address')
        .andWhere(
          'ST_DWithin(ST_MakePoint(address.longitude, address.latitude), ST_MakePoint(:lon, :lat), :maxDistance)',
          {
            lon: searchDto.longitude,
            lat: searchDto.latitude,
            maxDistance: searchDto.max_distance * 1000, // Convert km to meters
          }
        )
        .orderBy(
          'ST_Distance(ST_MakePoint(address.longitude, address.latitude), ST_MakePoint(:lon, :lat))',
          'ASC'
        );
    }

    return queryBuilder;
  }
} 