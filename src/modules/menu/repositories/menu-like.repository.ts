import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MenuLike } from 'src/entities/menu-like.entity';
import { MenuItem } from 'src/entities';

@Injectable()
export class MenuLikeRepository {
  constructor(
    @InjectRepository(MenuLike)
    private readonly menuLikeRepository: Repository<MenuLike>,
  ) {}

  /**
   * Create a new like for a menu item
   */
  async create(userId: string, menuItemId: string): Promise<MenuLike> {
    const like = this.menuLikeRepository.create({
      user_id: userId,
      menu_item_id: menuItemId,
    });
    return await this.menuLikeRepository.save(like);
  }

  /**
   * Find a specific like by user and menu item
   */
  async findByUserAndMenuItem(
    userId: string,
    menuItemId: string,
  ): Promise<MenuLike | null> {
    return await this.menuLikeRepository.findOne({
      where: {
        user_id: userId,
        menu_item_id: menuItemId,
      },
    });
  }

  /**
   * Delete a like
   */
  async delete(userId: string, menuItemId: string): Promise<boolean> {
    const result = await this.menuLikeRepository.delete({
      user_id: userId,
      menu_item_id: menuItemId,
    });
    return (result.affected || 0) > 0;
  }

  /**
   * Get total like count for a menu item
   */
  async getMenuItemLikeCount(menuItemId: string): Promise<number> {
    return await this.menuLikeRepository.count({
      where: { menu_item_id: menuItemId },
    });
  }

  /**
   * Get like counts for multiple menu items (for bulk operations)
   */
  async getMenuItemLikeCounts(
    menuItemIds: string[],
  ): Promise<Map<string, number>> {
    const counts = await this.menuLikeRepository
      .createQueryBuilder('menu_like')
      .select('menu_like.menu_item_id', 'menuItemId')
      .addSelect('COUNT(*)', 'count')
      .where('menu_like.menu_item_id IN (:...menuItemIds)', { menuItemIds })
      .groupBy('menu_like.menu_item_id')
      .getRawMany();

    const countMap = new Map<string, number>();
    counts.forEach((row) => {
      countMap.set(row.menuItemId, parseInt(row.count));
    });

    // Ensure all menu items are in the map (even if count is 0)
    menuItemIds.forEach((id) => {
      if (!countMap.has(id)) {
        countMap.set(id, 0);
      }
    });

    return countMap;
  }

  /**
   * Check if user has liked a menu item
   */
  async hasUserLiked(userId: string, menuItemId: string): Promise<boolean> {
    const count = await this.menuLikeRepository.count({
      where: {
        user_id: userId,
        menu_item_id: menuItemId,
      },
    });
    return count > 0;
  }

  /**
   * Check which menu items user has liked (for bulk operations)
   */
  async getUserLikedStatus(
    userId: string,
    menuItemIds: string[],
  ): Promise<Map<string, boolean>> {
    const likes = await this.menuLikeRepository.find({
      where: {
        user_id: userId,
      },
      select: ['menu_item_id'],
    });

    const likedSet = new Set(likes.map((like) => like.menu_item_id));
    const statusMap = new Map<string, boolean>();

    menuItemIds.forEach((id) => {
      statusMap.set(id, likedSet.has(id));
    });

    return statusMap;
  }

  /**
   * Get all liked menu items by a user with pagination
   */
  async findUserLikedMenuItems(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: MenuItem[]; total: number; meta: any }> {
    const skip = (page - 1) * limit;

    const [likes, total] = await this.menuLikeRepository.findAndCount({
      where: { user_id: userId },
      relations: [
        'menu_item',
        'menu_item.vendor',
        'menu_item.vendor.user',
        'menu_item.vendor.address',
        'menu_item.category',
      ],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    const items = likes
      .map((like) => like.menu_item)
      .filter((item) => item && !item.deleted_at); // Filter out deleted items

    const meta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    };

    return { items, total, meta };
  }

  /**
   * Get likes for all menu items of a vendor
   */
  async getVendorMenuLikes(
    vendorId: string,
  ): Promise<{ menuItemId: string; likeCount: number }[]> {
    const likes = await this.menuLikeRepository
      .createQueryBuilder('menu_like')
      .innerJoin('menu_like.menu_item', 'menu_item')
      .select('menu_like.menu_item_id', 'menuItemId')
      .addSelect('COUNT(*)', 'likeCount')
      .where('menu_item.vendor_id = :vendorId', { vendorId })
      .groupBy('menu_like.menu_item_id')
      .getRawMany();

    return likes.map((row) => ({
      menuItemId: row.menuItemId,
      likeCount: parseInt(row.likeCount),
    }));
  }

  /**
   * Get total likes across all vendor's menu items
   */
  async getVendorTotalLikes(vendorId: string): Promise<number> {
    const result = await this.menuLikeRepository
      .createQueryBuilder('menu_like')
      .innerJoin('menu_like.menu_item', 'menu_item')
      .where('menu_item.vendor_id = :vendorId', { vendorId })
      .getCount();

    return result;
  }

  /**
   * Get most liked menu items for a vendor
   */
  async getVendorMostLikedMenuItems(
    vendorId: string,
    limit: number = 10,
  ): Promise<{ menuItem: MenuItem; likeCount: number }[]> {
    // Query to get menu item IDs with their like counts
    const likeCounts = await this.menuLikeRepository
      .createQueryBuilder('menu_like')
      .innerJoin('menu_like.menu_item', 'menu_item')
      .select('menu_item.id', 'menuItemId')
      .addSelect('COUNT(menu_like.id)', 'likeCount')
      .where('menu_item.vendor_id = :vendorId', { vendorId })
      .groupBy('menu_item.id')
      .orderBy('likeCount', 'DESC')
      .limit(limit)
      .getRawMany();

    if (likeCounts.length === 0) {
      return [];
    }

    // Get the full menu items with relations
    const menuItemIds = likeCounts.map((row) => row.menuItemId);
    const menuItems = await this.menuLikeRepository.manager
      .getRepository(MenuItem)
      .createQueryBuilder('menu_item')
      .leftJoinAndSelect('menu_item.category', 'category')
      .leftJoinAndSelect('menu_item.vendor', 'vendor')
      .whereInIds(menuItemIds)
      .getMany();

    // Create a map for quick lookup
    const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));

    // Combine the data maintaining the order
    return likeCounts.map((row) => ({
      menuItem: menuItemMap.get(row.menuItemId)!,
      likeCount: parseInt(row.likeCount),
    }));
  }
}