import { Injectable } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MenuItem, Vendor, Category } from 'src/entities';
import { SearchMenuItemsDto } from '../dto/search-menu-items.dto';
import { MenuItemWithDistanceDto } from '../dto/menu-item-response.dto';
import { fetchPage } from '@/utils/pagination.utils';

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
      relations: ['vendor', 'vendor.user', 'vendor.address', 'category'],
    });
  }

  async findByVendorId(vendorId: string): Promise<MenuItem[]> {
    return await this.menuItemRepository.find({
      where: { 
        vendor_id: vendorId,
        // Note: Don't filter by vendor.is_active here because this is used by vendors to see their own menu
      },
      relations: ['category', 'vendor', 'vendor.user'],
      order: { name: 'ASC' },
    });
  }

  async findByCategoryId(categoryId: string): Promise<MenuItem[]> {
    // ✅ Use query builder to filter by active vendors and available items
    return await this.menuItemRepository
      .createQueryBuilder('menu_item')
      .leftJoinAndSelect('menu_item.vendor', 'vendor')
      .leftJoinAndSelect('vendor.user', 'user')
      .leftJoinAndSelect('vendor.address', 'address')
      .leftJoinAndSelect('menu_item.category', 'category')
      .where('menu_item.category_id = :categoryId', { categoryId })
      // ✅ Filter by active vendors
      .andWhere('vendor.is_active = :isActive', { isActive: true })
      .andWhere('vendor.deleted_at IS NULL')
      // ✅ Filter by available items
      .andWhere('menu_item.is_available = :isAvailable', { isAvailable: true })
      .andWhere('menu_item.deleted_at IS NULL')
      .orderBy('menu_item.name', 'ASC')
      .getMany();
  }

  async search(searchDto: SearchMenuItemsDto) {
    const page = searchDto.page ?? 1;
    const limit = searchDto.limit ?? 20;

    const countQB = this.createCountQueryBuilder(searchDto);
    const total = await countQB.getCount();

    const dataQB = this.createSearchQueryBuilder(searchDto);

    // -------- SORTING LOGIC (keeps your rules) --------
    if (searchDto.latitude && searchDto.longitude) {
      dataQB.orderBy(`calculated_distance`, 'ASC');

      if (searchDto.sort_by && searchDto.sort_by !== 'distance') {
        const sortOrder = searchDto.sort_order || 'ASC';
        dataQB.addOrderBy(
          `menu_item.${searchDto.sort_by}`,
          sortOrder as 'ASC' | 'DESC',
        );
      }
    } else if (searchDto.sort_by) {
      const sortOrder = searchDto.sort_order || 'DESC';
      dataQB.orderBy(
        `menu_item.${searchDto.sort_by}`,
        sortOrder as 'ASC' | 'DESC',
      );
    } else {
      dataQB.orderBy('menu_item.created_at', 'DESC');
    }

    // -------- APPLY PAGINATION --------
    const result = await fetchPage(dataQB, {
      page,
      count: limit,
    });

    // Attach distance back to each item
    if (searchDto.latitude && searchDto.longitude) {
      result.documents = result.documents.map((item: any) => {
        (item as any).distance = (item as any).calculated_distance;
        return item;
      });
    }

    return {
      items: result.documents,
      meta: result.meta,
      total,
    };
  }

  async update(
    id: string,
    updateData: Partial<MenuItem>,
  ): Promise<MenuItem | null> {
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
    const result = await this.menuItemRepository.update(ids, {
      is_available: value,
    });
    return result.affected || 0;
  }

  async bulkUpdateCategory(ids: string[], categoryId: string): Promise<number> {
    const result = await this.menuItemRepository.update(ids, {
      category_id: categoryId,
    });
    return result.affected || 0;
  }

  async bulkDelete(ids: string[]): Promise<number> {
    const result = await this.menuItemRepository.softDelete(ids);
    return result.affected || 0;
  }

  createCountQueryBuilder(searchDto: SearchMenuItemsDto) {
    const qb = this.menuItemRepository.createQueryBuilder('menu_item');

    // ✅ ALWAYS join vendor to filter by is_active
    qb.innerJoin('menu_item.vendor', 'vendor');

    // ✅ CRITICAL: Filter by active vendors ONLY (unless include_inactive is true)
    if (!searchDto.include_inactive) {
      qb.andWhere('vendor.is_active = :vendorActive', { vendorActive: true });
    }
    
    // Always filter out soft-deleted records
    qb.andWhere('vendor.deleted_at IS NULL');
    qb.andWhere('menu_item.deleted_at IS NULL');

    // ✅ Default to showing only available items unless explicitly specified
    if (searchDto.is_available !== undefined) {
      qb.andWhere('menu_item.is_available = :available', {
        available: searchDto.is_available,
      });
    } else {
      // Default behavior: show only available items
      qb.andWhere('menu_item.is_available = :available', {
        available: true,
      });
    }

    // Existing filters
    if (searchDto.vendor_id) {
      qb.andWhere('menu_item.vendor_id = :vendorId', {
        vendorId: searchDto.vendor_id,
      });
    }

    if (searchDto.category_id) {
      qb.andWhere('menu_item.category_id = :categoryId', {
        categoryId: searchDto.category_id,
      });
    }

    if (searchDto.min_price !== undefined) {
      qb.andWhere('menu_item.price >= :minPrice', {
        minPrice: searchDto.min_price,
      });
    }

    if (searchDto.max_price !== undefined) {
      qb.andWhere('menu_item.price <= :maxPrice', {
        maxPrice: searchDto.max_price,
      });
    }

    if (searchDto.query) {
      qb.andWhere(
        `(LOWER(menu_item.name) LIKE LOWER(:q) 
        OR LOWER(menu_item.description) LIKE LOWER(:q))`,
        { q: `%${searchDto.query}%` },
      );
    }

    // Cheap bounding box only (NO distance math)
    if (searchDto.latitude && searchDto.longitude) {
      const maxDistanceKm = searchDto.max_distance ?? 10;

      const lat = searchDto.latitude;
      const lon = searchDto.longitude;

      const latBuffer = maxDistanceKm / 111;
      const lonBuffer = maxDistanceKm / 111;

      qb.innerJoin('vendor.address', 'vendor_address')
        .andWhere(
          `vendor_address.latitude BETWEEN :minLat AND :maxLat
         AND vendor_address.longitude BETWEEN :minLon AND :maxLon`,
          {
            minLat: lat - latBuffer,
            maxLat: lat + latBuffer,
            minLon: lon - lonBuffer,
            maxLon: lon + lonBuffer,
          },
        );
    }

    return qb;
  }

  createSearchQueryBuilder(searchDto: SearchMenuItemsDto) {
    const qb = this.menuItemRepository
      .createQueryBuilder('menu_item')
      .leftJoinAndSelect('menu_item.vendor', 'vendor')
      .leftJoinAndSelect('vendor.user', 'user')  // ✅ Include user for phone, email, image_url
      .leftJoinAndSelect('vendor.address', 'vendor_address')
      .leftJoinAndSelect('menu_item.category', 'category');

    // ✅ CRITICAL: Filter by active vendors ONLY (unless include_inactive is true)
    if (!searchDto.include_inactive) {
      qb.andWhere('vendor.is_active = :vendorActive', { vendorActive: true });
    }
    
    // Always filter out soft-deleted records
    qb.andWhere('vendor.deleted_at IS NULL');
    qb.andWhere('menu_item.deleted_at IS NULL');

    // ✅ Default to showing only available items unless explicitly specified
    if (searchDto.is_available !== undefined) {
      qb.andWhere('menu_item.is_available = :available', {
        available: searchDto.is_available,
      });
    } else {
      // Default behavior: show only available items
      qb.andWhere('menu_item.is_available = :available', {
        available: true,
      });
    }

    // -------- FAST FILTERS FIRST --------
    if (searchDto.vendor_id) {
      qb.andWhere('menu_item.vendor_id = :vendorId', {
        vendorId: searchDto.vendor_id,
      });
    }

    if (searchDto.category_id) {
      qb.andWhere('menu_item.category_id = :categoryId', {
        categoryId: searchDto.category_id,
      });
    }

    if (searchDto.min_price !== undefined) {
      qb.andWhere('menu_item.price >= :minPrice', {
        minPrice: searchDto.min_price,
      });
    }

    if (searchDto.max_price !== undefined) {
      qb.andWhere('menu_item.price <= :maxPrice', {
        maxPrice: searchDto.max_price,
      });
    }

    if (searchDto.query) {
      qb.andWhere(
        `(LOWER(menu_item.name) LIKE LOWER(:q) 
        OR LOWER(menu_item.description) LIKE LOWER(:q))`,
        { q: `%${searchDto.query}%` },
      );
    }

    // -------- LOCATION FILTER (FAST BOUNDING BOX FIRST) --------
    if (searchDto.latitude && searchDto.longitude) {
      const maxDistanceKm = searchDto.max_distance ?? 10;

      const lat = searchDto.latitude;
      const lon = searchDto.longitude;

      const latBuffer = maxDistanceKm / 111;
      const lonBuffer = maxDistanceKm / 111;

      qb.andWhere(
        `vendor_address.latitude BETWEEN :minLat AND :maxLat
       AND vendor_address.longitude BETWEEN :minLon AND :maxLon`,
        {
          minLat: lat - latBuffer,
          maxLat: lat + latBuffer,
          minLon: lon - lonBuffer,
          maxLon: lon + lonBuffer,
        },
      );

      // -------- ADD REAL DISTANCE CALCULATION --------
      qb.addSelect(
        `(
        6371 * acos(
          cos(radians(:lat)) * cos(radians(vendor_address.latitude)) *
          cos(radians(vendor_address.longitude) - radians(:lon)) +
          sin(radians(:lat)) * sin(radians(vendor_address.latitude))
        )
      )`,
        'calculated_distance',
      );

      qb.setParameter('lat', lat);
      qb.setParameter('lon', lon);
    }

    return qb;
  }
}