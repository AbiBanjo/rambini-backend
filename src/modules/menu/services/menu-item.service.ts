import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { MenuItemRepository } from '../repositories/menu-item.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CreateMenuItemDto, UpdateMenuItemDto, SearchMenuItemsDto, BulkMenuOperationDto } from 'src/modules/menu/dto';
import { MenuItem, Vendor, UserType } from 'src/entities';

@Injectable()
export class MenuItemService {
  private readonly logger = new Logger(MenuItemService.name);

  constructor(
    private readonly menuItemRepository: MenuItemRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async createMenuItem(vendorId: string, createDto: CreateMenuItemDto): Promise<MenuItem> {
    this.logger.log(`Creating menu item for vendor ${vendorId}: ${createDto.name}`);

    // Validate category exists
    const category = await this.categoryRepository.findById(createDto.category_id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${createDto.category_id} not found`);
    }

    // Create menu item
    const menuItem = await this.menuItemRepository.create({
      ...createDto,
      vendor_id: vendorId,
      category_id: createDto.category_id,
    });

    this.logger.log(`Menu item created successfully: ${menuItem.id}`);
    return menuItem;
  }

  async getMenuItemById(id: string): Promise<MenuItem> {
    const menuItem = await this.menuItemRepository.findById(id);
    if (!menuItem) {
      throw new NotFoundException(`Menu item with ID ${id} not found`);
    }
    return menuItem;
  }

  async getVendorMenu(vendorId: string): Promise<MenuItem[]> {
    this.logger.log(`Fetching menu for vendor ${vendorId}`);
    return await this.menuItemRepository.findByVendorId(vendorId);
  }

  async getCategoryMenu(categoryId: string): Promise<MenuItem[]> {
    this.logger.log(`Fetching menu items for category ${categoryId}`);
    return await this.menuItemRepository.findByCategoryId(categoryId);
  }

  async getFeaturedItems(): Promise<MenuItem[]> {
    this.logger.log('Fetching featured menu items');
    return await this.menuItemRepository.findFeatured();
  }

  async searchMenuItems(searchDto: SearchMenuItemsDto): Promise<{ items: MenuItem[]; total: number }> {
    this.logger.log(`Searching menu items with query: ${searchDto.query || 'all'}`);
    return await this.menuItemRepository.search(searchDto);
  }

  async updateMenuItem(
    id: string,
    vendorId: string,
    updateDto: UpdateMenuItemDto,
  ): Promise<MenuItem> {
    this.logger.log(`Updating menu item ${id} for vendor ${vendorId}`);

    const menuItem = await this.getMenuItemById(id);
    
    // Verify ownership
    if (menuItem.vendor_id !== vendorId) {
      throw new ForbiddenException('You can only update your own menu items');
    }

    // Validate category if being updated
    if (updateDto.category_id) {
      const category = await this.categoryRepository.findById(updateDto.category_id);
      if (!category) {
        throw new NotFoundException(`Category with ID ${updateDto.category_id} not found`);
      }
    }

    const updatedMenuItem = await this.menuItemRepository.update(id, updateDto);
    if (!updatedMenuItem) {
      throw new NotFoundException(`Failed to update menu item ${id}`);
    }

    this.logger.log(`Menu item ${id} updated successfully`);
    return updatedMenuItem;
  }

  async deleteMenuItem(id: string, vendorId: string): Promise<void> {
    this.logger.log(`Deleting menu item ${id} for vendor ${vendorId}`);

    const menuItem = await this.getMenuItemById(id);
    
    // Verify ownership
    if (menuItem.vendor_id !== vendorId) {
      throw new ForbiddenException('You can only delete your own menu items');
    }

    await this.menuItemRepository.delete(id);
    this.logger.log(`Menu item ${id} deleted successfully`);
  }

  async toggleItemAvailability(id: string, vendorId: string): Promise<MenuItem> {
    this.logger.log(`Toggling availability for menu item ${id}`);

    const menuItem = await this.getMenuItemById(id);
    
    // Verify ownership
    if (menuItem.vendor_id !== vendorId) {
      throw new ForbiddenException('You can only modify your own menu items');
    }

    const updatedMenuItem = await this.menuItemRepository.toggleAvailability(id);
    if (!updatedMenuItem) {
      throw new NotFoundException(`Failed to toggle availability for menu item ${id}`);
    }

    this.logger.log(`Menu item ${id} availability toggled to: ${updatedMenuItem.is_available}`);
    return updatedMenuItem;
  }

  async toggleItemFeatured(id: string, vendorId: string): Promise<MenuItem> {
    this.logger.log(`Toggling featured status for menu item ${id}`);

    const menuItem = await this.getMenuItemById(id);
    
    // Verify ownership
    if (menuItem.vendor_id !== vendorId) {
      throw new ForbiddenException('You can only modify your own menu items');
    }

    const updatedMenuItem = await this.menuItemRepository.toggleFeatured(id);
    if (!updatedMenuItem) {
      throw new NotFoundException(`Failed to toggle featured status for menu item ${id}`);
    }

    this.logger.log(`Menu item ${id} featured status toggled to: ${updatedMenuItem.is_featured}`);
    return updatedMenuItem;
  }

  async bulkMenuOperations(
    vendorId: string,
    bulkDto: BulkMenuOperationDto,
  ): Promise<{ affected: number; message: string }> {
    this.logger.log(`Performing bulk operation ${bulkDto.operation_type} for vendor ${vendorId}`);

    // Verify all menu items belong to the vendor
    for (const itemId of bulkDto.menu_item_ids) {
      const menuItem = await this.getMenuItemById(itemId);
      if (menuItem.vendor_id !== vendorId) {
        throw new ForbiddenException(`Menu item ${itemId} does not belong to your vendor account`);
      }
    }

    let affected = 0;
    let message = '';

    switch (bulkDto.operation_type) {
      case 'TOGGLE_AVAILABILITY':
        affected = await this.menuItemRepository.bulkToggleAvailability(
          bulkDto.menu_item_ids,
          bulkDto.boolean_value || false,
        );
        message = `Availability toggled for ${affected} menu items`;
        break;

      case 'TOGGLE_FEATURED':
        affected = await this.menuItemRepository.bulkToggleFeatured(
          bulkDto.menu_item_ids,
          bulkDto.boolean_value || false,
        );
        message = `Featured status toggled for ${affected} menu items`;
        break;

      case 'UPDATE_CATEGORY':
        if (!bulkDto.new_category_id) {
          throw new BadRequestException('New category ID is required for category update operation');
        }
        
        // Validate category exists
        const category = await this.categoryRepository.findById(bulkDto.new_category_id);
        if (!category) {
          throw new NotFoundException(`Category with ID ${bulkDto.new_category_id} not found`);
        }

        affected = await this.menuItemRepository.bulkUpdateCategory(
          bulkDto.menu_item_ids,
          bulkDto.new_category_id,
        );
        message = `Category updated for ${affected} menu items`;
        break;

      case 'DELETE_ITEMS':
        affected = await this.menuItemRepository.bulkDelete(bulkDto.menu_item_ids);
        message = `${affected} menu items deleted successfully`;
        break;

      default:
        throw new BadRequestException(`Unsupported bulk operation: ${bulkDto.operation_type}`);
    }

    this.logger.log(`Bulk operation completed: ${message}`);
    return { affected, message };
  }

  async updateMenuItemRating(id: string, newRating: number): Promise<void> {
    if (newRating < 1 || newRating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    await this.menuItemRepository.updateRating(id, newRating);
    this.logger.log(`Rating updated for menu item ${id}: ${newRating}`);
  }

  async incrementMenuItemOrderCount(id: string): Promise<void> {
    await this.menuItemRepository.incrementOrderCount(id);
    this.logger.log(`Order count incremented for menu item ${id}`);
  }

  async validateMenuItemOwnership(menuItemId: string, vendorId: string): Promise<boolean> {
    try {
      const menuItem = await this.getMenuItemById(menuItemId);
      return menuItem.vendor_id === vendorId;
    } catch {
      return false;
    }
  }
} 