import { Injectable } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MenuItem, Vendor, Category } from 'src/entities';
import { SearchMenuItemsDto } from '../dto/search-menu-items.dto';
import { calculateDistance } from 'src/utils/helpers';

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
      order: { name: 'ASC' },
    });
  }

  async findByCategoryId(categoryId: string): Promise<MenuItem[]> {
    return await this.menuItemRepository.find({
      where: { category_id: categoryId, is_available: true },
      relations: ['vendor'],
      order: { name: 'ASC' },
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
    
    // Apply sorting - prioritize distance-based sorting when coordinates are provided
    if (searchDto.latitude && searchDto.longitude && searchDto.prioritize_distance !== false) {
      // When coordinates are provided and distance prioritization is enabled, always sort by distance first
      queryBuilder.orderBy(
        'ST_Distance(vendor_address.location, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326))',
        'ASC'
      );
      
      // If additional sorting is specified, apply it as secondary sort
      if (searchDto.sort_by && searchDto.sort_by !== 'distance') {
        const sortOrder = searchDto.sort_order || 'ASC';
        queryBuilder.addOrderBy(`menu_item.${searchDto.sort_by}`, sortOrder as 'ASC' | 'DESC');
      }
    } else if (searchDto.sort_by) {
      // Fall back to regular sorting when no coordinates or distance prioritization is disabled
      const sortOrder = searchDto.sort_order || 'DESC';
      queryBuilder.orderBy(`menu_item.${searchDto.sort_by}`, sortOrder as 'ASC' | 'DESC');
    } else {
      queryBuilder.orderBy('menu_item.created_at', 'DESC');
    }
    
    const items = await queryBuilder.getMany();
    
    // If coordinates are provided, calculate and add distance to each item
    if (searchDto.latitude && searchDto.longitude) {
      items.forEach(item => {
        if (item.vendor?.address?.latitude && item.vendor?.address?.longitude) {
          const distance = calculateDistance(
            searchDto.latitude!,
            searchDto.longitude!,
            item.vendor.address.latitude,
            item.vendor.address.longitude
          );
          // Add distance as a virtual property
          (item as any).distance = Math.round(distance * 100) / 100; // Round to 2 decimal places
        }
      });
    }
    
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

  async bulkToggleAvailability(ids: string[], value: boolean): Promise<number> {
    const result = await this.menuItemRepository.update(ids, { is_available: value });
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

  private createSearchQueryBuilder(searchDto: SearchMenuItemsDto): SelectQueryBuilder<MenuItem> {
    const queryBuilder = this.menuItemRepository
      .createQueryBuilder('menu_item')
      .leftJoinAndSelect('menu_item.vendor', 'vendor')
      .leftJoinAndSelect('menu_item.category', 'category')
      .leftJoinAndSelect('vendor.address', 'vendor_address')
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

    // Apply proximity filtering if coordinates and max distance provided
    if (searchDto.latitude && searchDto.longitude && searchDto.max_distance) {
      // Filter vendors within the specified distance using spatial column
      queryBuilder.andWhere(
        'vendor_address.location IS NOT NULL'
      );
      
      // Use PostGIS ST_DWithin with spatial column for efficient proximity filtering
      queryBuilder.andWhere(
        'ST_DWithin(vendor_address.location, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326), :maxDistance)',
        {
          lon: searchDto.longitude,
          lat: searchDto.latitude,
          maxDistance: searchDto.max_distance * 1000, // Convert km to meters
        }
      );
    }

    return queryBuilder;
  }
} 