import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { MenuLikeRepository } from '../repositories/menu-like.repository';
import { MenuItemRepository } from '../repositories/menu-item.repository';
import {
  ToggleLikeResponseDto,
  LikedMenuItemsResponseDto,
  VendorLikesSummaryDto,
  MenuItemWithLikeDto,
  LikedMenuItemsQueryDto,
} from '../dto/menu-like.dto';

@Injectable()
export class MenuLikeService {
  private readonly logger = new Logger(MenuLikeService.name);

  constructor(
    private readonly menuLikeRepository: MenuLikeRepository,
    private readonly menuItemRepository: MenuItemRepository,
  ) {}

  /**
   * Toggle like on a menu item (like if not liked, unlike if already liked)
   */
  async toggleLike(
    userId: string,
    menuItemId: string,
  ): Promise<ToggleLikeResponseDto> {
    this.logger.log(
      `User ${userId} toggling like on menu item ${menuItemId}`,
    );

    // Verify menu item exists
    const menuItem = await this.menuItemRepository.findById(menuItemId);
    if (!menuItem) {
      throw new NotFoundException(`Menu item with ID ${menuItemId} not found`);
    }

    // Check if user has already liked this item
    const existingLike = await this.menuLikeRepository.findByUserAndMenuItem(
      userId,
      menuItemId,
    );

    let isLiked: boolean;
    let message: string;

    if (existingLike) {
      // Unlike
      await this.menuLikeRepository.delete(userId, menuItemId);
      isLiked = false;
      message = 'Menu item unliked successfully';
      this.logger.log(`User ${userId} unliked menu item ${menuItemId}`);
    } else {
      // Like
      await this.menuLikeRepository.create(userId, menuItemId);
      isLiked = true;
      message = 'Menu item liked successfully';
      this.logger.log(`User ${userId} liked menu item ${menuItemId}`);
    }

    // Get updated like count
    const likeCount = await this.menuLikeRepository.getMenuItemLikeCount(
      menuItemId,
    );

    return {
      is_liked: isLiked,
      like_count: likeCount,
      message,
    };
  }

  /**
   * Like a menu item
   */
  async likeMenuItem(
    userId: string,
    menuItemId: string,
  ): Promise<ToggleLikeResponseDto> {
    this.logger.log(`User ${userId} liking menu item ${menuItemId}`);

    // Verify menu item exists
    const menuItem = await this.menuItemRepository.findById(menuItemId);
    if (!menuItem) {
      throw new NotFoundException(`Menu item with ID ${menuItemId} not found`);
    }

    // Check if already liked
    const existingLike = await this.menuLikeRepository.findByUserAndMenuItem(
      userId,
      menuItemId,
    );

    if (existingLike) {
      throw new ConflictException('You have already liked this menu item');
    }

    // Create like
    await this.menuLikeRepository.create(userId, menuItemId);

    // Get like count
    const likeCount = await this.menuLikeRepository.getMenuItemLikeCount(
      menuItemId,
    );

    this.logger.log(`User ${userId} liked menu item ${menuItemId}`);

    return {
      is_liked: true,
      like_count: likeCount,
      message: 'Menu item liked successfully',
    };
  }

  /**
   * Unlike a menu item
   */
  async unlikeMenuItem(
    userId: string,
    menuItemId: string,
  ): Promise<ToggleLikeResponseDto> {
    this.logger.log(`User ${userId} unliking menu item ${menuItemId}`);

    // Verify menu item exists
    const menuItem = await this.menuItemRepository.findById(menuItemId);
    if (!menuItem) {
      throw new NotFoundException(`Menu item with ID ${menuItemId} not found`);
    }

    // Check if like exists
    const existingLike = await this.menuLikeRepository.findByUserAndMenuItem(
      userId,
      menuItemId,
    );

    if (!existingLike) {
      throw new BadRequestException('You have not liked this menu item');
    }

    // Delete like
    await this.menuLikeRepository.delete(userId, menuItemId);

    // Get like count
    const likeCount = await this.menuLikeRepository.getMenuItemLikeCount(
      menuItemId,
    );

    this.logger.log(`User ${userId} unliked menu item ${menuItemId}`);

    return {
      is_liked: false,
      like_count: likeCount,
      message: 'Menu item unliked successfully',
    };
  }

  /**
   * Get all menu items liked by a user
   */
  async getUserLikedMenuItems(
    userId: string,
    query: LikedMenuItemsQueryDto,
  ): Promise<LikedMenuItemsResponseDto> {
    this.logger.log(`Fetching liked menu items for user ${userId}`);

    const page = query.page || 1;
    const limit = query.limit || 20;

    const result = await this.menuLikeRepository.findUserLikedMenuItems(
      userId,
      page,
      limit,
    );

    // Enrich items with like information
    const menuItemIds = result.items.map((item) => item.id);
    const likeCounts = await this.menuLikeRepository.getMenuItemLikeCounts(
      menuItemIds,
    );

    const enrichedItems: MenuItemWithLikeDto[] = result.items.map((item) => ({
      ...item,
      like_count: likeCounts.get(item.id) || 0,
      is_liked_by_user: true, // All items in this list are liked by the user
    })) as MenuItemWithLikeDto[];

    return {
      items: enrichedItems,
      total: result.total,
      meta: result.meta,
    };
  }

  /**
   * Get like statistics for a vendor's menu items
   */
  async getVendorLikeStats(
    vendorId: string,
  ): Promise<VendorLikesSummaryDto> {
    this.logger.log(`Fetching like stats for vendor ${vendorId}`);

    // Get total likes
    const totalLikes = await this.menuLikeRepository.getVendorTotalLikes(
      vendorId,
    );

    // Get likes per menu item
    const menuLikes = await this.menuLikeRepository.getVendorMenuLikes(
      vendorId,
    );

    // Get menu items to get their names
    const menuItems = await this.menuItemRepository.findByVendorId(vendorId);
    const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));

    // Build menu items stats
    const menuItemStats = menuLikes.map((like) => {
      const menuItem = menuItemMap.get(like.menuItemId);
      return {
        menu_item_id: like.menuItemId,
        menu_item_name: menuItem?.name || 'Unknown',
        like_count: like.likeCount,
      };
    });

    // Get most liked items
    const mostLikedResult =
      await this.menuLikeRepository.getVendorMostLikedMenuItems(vendorId, 10);

    const mostLiked = mostLikedResult.map((result) => ({
      menu_item_id: result.menuItem.id,
      menu_item_name: result.menuItem.name,
      like_count: result.likeCount,
    }));

    return {
      total_likes: totalLikes,
      menu_items: menuItemStats,
      most_liked: mostLiked,
    };
  }

  /**
   * Check if user has liked a menu item
   */
  async hasUserLiked(userId: string, menuItemId: string): Promise<boolean> {
    return await this.menuLikeRepository.hasUserLiked(userId, menuItemId);
  }

  /**
   * Get like count for a menu item
   */
  async getMenuItemLikeCount(menuItemId: string): Promise<number> {
    return await this.menuLikeRepository.getMenuItemLikeCount(menuItemId);
  }

  /**
   * Enrich menu items with like information for a specific user
   */
  async enrichMenuItemsWithLikes(
    menuItems: any[],
    userId?: string,
  ): Promise<MenuItemWithLikeDto[]> {
    if (!menuItems || menuItems.length === 0) {
      return [];
    }

    const menuItemIds = menuItems.map((item) => item.id);

    // Get like counts for all items
    const likeCounts = await this.menuLikeRepository.getMenuItemLikeCounts(
      menuItemIds,
    );

    // Get user's liked status if userId provided
    let userLikedStatus: Map<string, boolean> | null = null;
    if (userId) {
      userLikedStatus = await this.menuLikeRepository.getUserLikedStatus(
        userId,
        menuItemIds,
      );
    }

    // Enrich items
    return menuItems.map((item) => ({
      ...item,
      like_count: likeCounts.get(item.id) || 0,
      is_liked_by_user: userLikedStatus
        ? userLikedStatus.get(item.id) || false
        : false,
    }));
  }
}