import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { MenuItemRepository } from '../repositories/menu-item.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CreateMenuItemDto, UpdateMenuItemDto, SearchMenuItemsDto, BulkMenuOperationDto } from 'src/modules/menu/dto';
import { MenuItem } from 'src/entities';
import { VendorService } from 'src/modules/vendor/services/vendor.service';

@Injectable()
export class MenuItemService {
  private readonly logger = new Logger(MenuItemService.name);

  constructor(
    private readonly menuItemRepository: MenuItemRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly vendorService: VendorService,
  ) {}

  async createMenuItem(userId: string, createDto: CreateMenuItemDto): Promise<MenuItem> {
    this.logger.log(`Creating menu item for vendor ${userId}: ${createDto.name}`);

    // get vendor id from user id
    const vendor = await this.vendorService.getVendorByUserId(userId);
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${userId} not found`);
    }

    // Validate category exists
    const category = await this.categoryRepository.findById(createDto.category_id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${createDto.category_id} not found`);
    }

    // Create menu item
    const menuItem = await this.menuItemRepository.create({
      ...createDto,
      vendor_id: vendor.id,
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

  async searchMenuItems(searchDto: SearchMenuItemsDto): Promise<{ items: MenuItem[]; total: number }> {
    this.logger.log(`Searching menu items with query: ${searchDto.query || 'all'}`);
    
    // Log distance-based search parameters if provided
    if (searchDto.latitude && searchDto.longitude) {
      this.logger.log(`Distance-based search enabled - Location: (${searchDto.latitude}, ${searchDto.longitude}), Max distance: ${searchDto.max_distance || 'unlimited'} km`);
      if (searchDto.prioritize_distance !== false) {
        this.logger.log('Distance-based sorting will take priority over other sort criteria');
      }
    }
    
    const result = await this.menuItemRepository.search(searchDto);
    
    // Log search results summary
    if (searchDto.latitude && searchDto.longitude) {
      const itemsWithDistance = result.items.filter(item => (item as any).distance !== undefined);
      this.logger.log(`Found ${result.total} menu items, ${itemsWithDistance.length} with distance information`);
      
      if (itemsWithDistance.length > 0) {
        const distances = itemsWithDistance.map(item => (item as any).distance);
        const minDistance = Math.min(...distances);
        const maxDistance = Math.max(...distances);
        this.logger.log(`Distance range: ${minDistance} km to ${maxDistance} km`);
      }
    } else {
      this.logger.log(`Found ${result.total} menu items`);
    }
    
    return result;
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

  async validateMenuItemOwnership(menuItemId: string, vendorId: string): Promise<boolean> {
    try {
      const menuItem = await this.getMenuItemById(menuItemId);
      return menuItem.vendor_id === vendorId;
    } catch {
      return false;
    }
  }
} 