import { Injectable } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MenuItem, Vendor, Category } from 'src/entities';
import { SearchMenuItemsDto } from '../dto/search-menu-items.dto';
import { MenuItemWithDistanceDto } from '../dto/menu-item-response.dto';

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

  async search(searchDto: SearchMenuItemsDto): Promise<{ items: MenuItemWithDistanceDto[]; total: number }> {
    // Create separate query builders for count and data
    const countQueryBuilder = this.createCountQueryBuilder(searchDto);
    const dataQueryBuilder = this.createSearchQueryBuilder(searchDto);
    
    // Get total count using a simplified count query
    const total = await countQueryBuilder.getCount();
    
    
    // Apply sorting - prioritize distance-based sorting when coordinates are provided
    if (searchDto.latitude && searchDto.longitude ) {
      // When coordinates are provided and distance prioritization is enabled, always sort by distance first
      // Use a CASE statement to handle vendors without coordinates (put them last)
      dataQueryBuilder.orderBy(
        `CASE 
          WHEN vendor_address.latitude IS NOT NULL AND vendor_address.longitude IS NOT NULL 
          THEN (
            6371 * acos(
              cos(radians(:lat)) * cos(radians(vendor_address.latitude)) *
              cos(radians(vendor_address.longitude) - radians(:lon)) +
              sin(radians(:lat)) * sin(radians(vendor_address.longitude))
            )
          )
          ELSE 999999
        END`,
        'ASC'
      );
      dataQueryBuilder.setParameter('lon', searchDto.longitude);
      dataQueryBuilder.setParameter('lat', searchDto.latitude);
      
      // If additional sorting is specified, apply it as secondary sort
      if (searchDto.sort_by && searchDto.sort_by !== 'distance') {
        const sortOrder = searchDto.sort_order || 'ASC';
        dataQueryBuilder.addOrderBy(`menu_item.${searchDto.sort_by}`, sortOrder as 'ASC' | 'DESC');
      }
    } else if (searchDto.sort_by) {
      // Fall back to regular sorting when no coordinates or distance prioritization is disabled
      const sortOrder = searchDto.sort_order || 'DESC';
      dataQueryBuilder.orderBy(`menu_item.${searchDto.sort_by}`, sortOrder as 'ASC' | 'DESC');
    } else {
      dataQueryBuilder.orderBy('menu_item.created_at', 'DESC');
    }
    
    // If coordinates are provided, select the calculated distance as a field
    if (searchDto.latitude && searchDto.longitude) {
      dataQueryBuilder.addSelect(
        `CASE 
          WHEN vendor_address.latitude IS NOT NULL AND vendor_address.longitude IS NOT NULL 
          THEN ROUND(
            (
              6371 * acos(
                cos(radians(:lat)) * cos(radians(vendor_address.latitude)) *
                cos(radians(vendor_address.longitude) - radians(:lon)) +
                sin(radians(:lat)) * sin(radians(vendor_address.longitude))
              )
            ) * 100
          ) / 100
          ELSE NULL
        END`,
        'calculated_distance'
      );
      dataQueryBuilder.setParameter('lon', searchDto.longitude);
      dataQueryBuilder.setParameter('lat', searchDto.latitude);
    }
    
    const rawItems = await dataQueryBuilder.getRawAndEntities();
    
    // Map raw results to entities with distance information
    const items = rawItems.entities.map((entity, index) => {
      const rawItem = rawItems.raw[index];
      
      if (searchDto.latitude && searchDto.longitude) {
        // Use the database-calculated distance
        const distance = rawItem.calculated_distance;
        (entity as MenuItemWithDistanceDto).distance = distance;
      }
      
      return entity;
    });
    
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

  private createCountQueryBuilder(searchDto: SearchMenuItemsDto): SelectQueryBuilder<MenuItem> {
    const queryBuilder = this.menuItemRepository
      .createQueryBuilder('menu_item')
      .leftJoin('menu_item.vendor', 'vendor')
      .leftJoin('vendor.address', 'vendor_address')
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

    // For count query, only check if coordinates exist - don't do complex distance calculations
    if (searchDto.latitude && searchDto.longitude) {
      queryBuilder.andWhere(
        'vendor_address.latitude IS NOT NULL AND vendor_address.longitude IS NOT NULL'
      );
    }

    return queryBuilder;
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
      // Filter vendors within the specified distance using standard coordinates
      queryBuilder.andWhere(
        'vendor_address.latitude IS NOT NULL AND vendor_address.longitude IS NOT NULL'
      );
      
      // Use Haversine formula for distance calculation in SQL
      // This is more compatible than PostGIS spatial functions
      const maxDistanceKm = searchDto.max_distance;
      queryBuilder.andWhere(
        `(
          6371 * acos(
            cos(radians(:lat)) * cos(radians(vendor_address.latitude)) *
            cos(radians(vendor_address.longitude) - radians(:lon)) +
            sin(radians(:lat)) * sin(radians(vendor_address.latitude))
          )
        ) <= :maxDistance`,
        {
          lat: searchDto.latitude,
          lon: searchDto.longitude,
          maxDistance: maxDistanceKm
        }
      );
    }

    // Apply delivery-only filter when coordinates are provided
    if (searchDto.latitude && searchDto.longitude && searchDto.delivery_only !== false) {
      // Ensure vendor has a valid address for delivery
      queryBuilder.andWhere(
        'vendor_address.latitude IS NOT NULL AND vendor_address.longitude IS NOT NULL'
      );
      
      // Filter out vendors that might be too far for practical delivery
      // This is a fallback when max_distance is not specified
      if (!searchDto.max_distance) {
        const defaultMaxDistance = 15; // Default 15km for practical delivery
        queryBuilder.andWhere(
          `(
            6371 * acos(
              cos(radians(:lat)) * cos(radians(vendor_address.latitude)) *
              cos(radians(vendor_address.longitude) - radians(:lon)) +
              sin(radians(:lat)) * sin(radians(vendor_address.latitude))
            )
          ) <= :defaultMaxDistance`,
          {
            lat: searchDto.latitude,
            lon: searchDto.longitude,
            defaultMaxDistance: defaultMaxDistance
          }
        );
      }
    }

    return queryBuilder;
  }
} 