import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MenuItemRepository } from '../repositories/menu-item.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CreateMenuItemDto, UpdateMenuItemDto, SearchMenuItemsDto, BulkMenuOperationDto, SearchMenuItemsResponseDto, MenuItemWithDistanceDto } from 'src/modules/menu/dto';
import { MenuItem } from 'src/entities';
import { VendorService } from 'src/modules/vendor/services/vendor.service';
import { AddressService } from 'src/modules/user/services/address.service';

@Injectable()
export class MenuItemService {
  private readonly logger = new Logger(MenuItemService.name);

  constructor(
    private readonly menuItemRepository: MenuItemRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly vendorService: VendorService,
    private readonly addressService: AddressService,
    private readonly configService: ConfigService,
  ) {}

  async createMenuItem(userId: string, createDto: CreateMenuItemDto): Promise<MenuItem> {
    this.logger.log(`Creating menu item for vendor ${userId}: ${createDto.name}`);

    // get vendor id from user id
    const vendor = await this.vendorService.getVendorByUserId(userId);
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${userId} not found`);
    }

    // check if vendor is active
    if (!vendor.is_active) {
      throw new BadRequestException('Vendor is not active');
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

  async createMenuItemWithFile(
    userId: string, 
    createDto: CreateMenuItemDto, 
    file?: Express.Multer.File
  ): Promise<MenuItem> {
    this.logger.log(`Creating menu item with file for vendor ${userId}: ${createDto.name}`);

    // get vendor id from user id
    const vendor = await this.vendorService.getVendorByUserId(userId);
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${userId} not found`);
    }

    // check if vendor is active
    if (!vendor.is_active) {
      throw new BadRequestException('Vendor is not active');
    }

    // Validate category exists
    const category = await this.categoryRepository.findById(createDto.category_id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${createDto.category_id} not found`);
    }

    // Create menu item data
    const menuItemData: any = {
      ...createDto,
      vendor_id: vendor.id,
      category_id: createDto.category_id,
    };

    // If file is provided, process it and add image_url
    if (file) {
      // Import FileStorageService dynamically to avoid circular dependency
      const { FileStorageService } = await import('src/modules/file-storage/services/file-storage.service');
      const fileStorageService = new FileStorageService(this.configService);
      
      // Upload image to cloud storage
      const uploadedFile = await fileStorageService.uploadImage(file, {
        quality: 85,
        createThumbnail: true,
        thumbnailSize: 300,
      });
      
      menuItemData.image_url = uploadedFile.url;
      this.logger.log(`Image uploaded successfully: ${uploadedFile.url}`);
    }

    // Create menu item
    const menuItem = await this.menuItemRepository.create(menuItemData);

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

  async searchMenuItems(searchDto: SearchMenuItemsDto): Promise<SearchMenuItemsResponseDto> {
    this.logger.log(`Searching menu items with query: ${searchDto.query || 'all'}`);
    
    let searchLatitude = searchDto.latitude;
    let searchLongitude = searchDto.longitude;
    let maxDistance = searchDto.max_distance || 10; // Default to 10km if not specified
    
    // Handle address_id if provided - fetch coordinates from saved address
    if (searchDto.address_id) {
      this.logger.log(`Address ID provided: ${searchDto.address_id} - fetching coordinates`);
      
      const address = await this.addressService.getAddressByIdWithoutValidation(searchDto.address_id);
      if (!address) {
        throw new BadRequestException(`Address with ID ${searchDto.address_id} not found`);
      }
      
      if (!address.latitude || !address.longitude) {
        throw new BadRequestException(`Address ${searchDto.address_id} does not have valid coordinates`);
      }
      
      searchLatitude = address.latitude;
      searchLongitude = address.longitude;
      
      this.logger.log(`Resolved coordinates from address ${searchDto.address_id}: (${searchLatitude}, ${searchLongitude})`);
    }
    
    // Validate coordinates if provided (either directly or via address_id)
    if (searchLatitude || searchLongitude) {
      if (!searchLatitude || !searchLongitude) {
        throw new BadRequestException('Both latitude and longitude must be provided for location-based search');
      }
      
      // Validate coordinate ranges
      if (searchLatitude < -90 || searchLatitude > 90) {
        throw new BadRequestException('Latitude must be between -90 and 90 degrees');
      }
      if (searchLongitude < -180 || searchLongitude > 180) {
        throw new BadRequestException('Longitude must be between -180 and 180 degrees');
      }
      
      this.logger.log(`Address-based proximity search enabled - Location: (${searchLatitude}, ${searchLongitude})`);
      this.logger.log(`Max delivery distance: ${maxDistance} km`);
      
      if (searchDto.prioritize_distance !== false) {
        this.logger.log('Proximity-based sorting will take priority - results sorted from closest to farthest');
      } else {
        this.logger.log('Proximity-based sorting disabled - using specified sort criteria');
      }
    }
    
    // Create search DTO with resolved coordinates and default max_distance
    const resolvedSearchDto = {
      ...searchDto,
      latitude: searchLatitude,
      longitude: searchLongitude,
      max_distance: maxDistance
    };
    
    const result = await this.menuItemRepository.search(resolvedSearchDto);
    
    // Enhanced logging for proximity search results
    if (searchLatitude && searchLongitude) {
      const itemsWithDistance = result.items.filter(item => (item as MenuItemWithDistanceDto).distance !== undefined && (item as MenuItemWithDistanceDto).distance !== null);
      const itemsWithoutDistance = result.items.filter(item => (item as MenuItemWithDistanceDto).distance === undefined || (item as MenuItemWithDistanceDto).distance === null);
      
      this.logger.log(`Found ${result.total} menu items total`);
      this.logger.log(`Items with distance info: ${itemsWithDistance.length}`);
      this.logger.log(`Items without distance info: ${itemsWithoutDistance.length}`);
      
      if (itemsWithDistance.length > 0) {
        const distances = itemsWithDistance.map(item => (item as MenuItemWithDistanceDto).distance!);
        const minDistance = Math.min(...distances);
        const maxDistance = Math.max(...distances);
        const avgDistance = distances.reduce((sum, dist) => sum + dist, 0) / distances.length;
        
        this.logger.log(`Distance range: ${minDistance} km to ${maxDistance} km`);
        this.logger.log(`Average distance: ${Math.round(avgDistance * 100) / 100} km`);
        
        // Log proximity distribution
        const nearby = itemsWithDistance.filter(item => (item as MenuItemWithDistanceDto).distance! <= 2).length;
        const medium = itemsWithDistance.filter(item => (item as MenuItemWithDistanceDto).distance! > 2 && (item as MenuItemWithDistanceDto).distance! <= 5).length;
        const far = itemsWithDistance.filter(item => (item as MenuItemWithDistanceDto).distance! > 5).length;
        
        this.logger.log(`Proximity distribution: ${nearby} nearby (≤2km), ${medium} medium (2-5km), ${far} far (>5km)`);
      }
      
      if (itemsWithoutDistance.length > 0) {
        this.logger.warn(`${itemsWithoutDistance.length} items lack distance information - vendor address data may be incomplete`);
        
        // Log specific vendors without address information for debugging
        const vendorsWithoutAddress = itemsWithoutDistance.map(item => ({
          menuItemId: item.id,
          vendorId: item.vendor_id,
          vendorName: item.vendor?.business_name || 'Unknown',
          hasAddress: !!item.vendor?.address,
          hasCoordinates: !!(item.vendor?.address?.latitude && item.vendor?.address?.longitude)
        }));
        
        this.logger.warn('Vendors missing address information:', vendorsWithoutAddress);
      }
    } else {
      this.logger.log(`Found ${result.total} menu items (no proximity sorting applied)`);
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

  async updateMenuItemWithFile(
    id: string,
    userId: string,
    updateDto: UpdateMenuItemDto,
    file?: Express.Multer.File,
  ): Promise<MenuItem> {
    this.logger.log(`Updating menu item ${id} with file for vendor ${userId}`);
    const vendor = await this.vendorService.getVendorByUserId(userId);
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${userId} not found`);
    }

    const menuItem = await this.getMenuItemById(id);
    // if menu does not exist 
    if (!menuItem) {
      throw new NotFoundException('Menu item not found')
    }
    // Verify ownership
    if (menuItem.vendor_id !== vendor.id) {
      throw new ForbiddenException('You can only update your own menu items');
    }

    // Validate category if being updated
    if (updateDto.category_id) {
      const category = await this.categoryRepository.findById(updateDto.category_id);
      if (!category) {
        throw new NotFoundException(`Category with ID ${updateDto.category_id} not found`);
      }
    }

    // Prepare update data
    const updateData: any = { ...updateDto };

    // If file is provided, process it and add image_url
    if (file) {
      // Import FileStorageService dynamically to avoid circular dependency
      const { FileStorageService } = await import('src/modules/file-storage/services/file-storage.service');
      const fileStorageService = new FileStorageService(this.configService);
      
      // Upload image to cloud storage
      const uploadedFile = await fileStorageService.uploadImage(file, {
        quality: 85,
        createThumbnail: true,
        thumbnailSize: 300,
      });
      
      updateData.image_url = uploadedFile.url;
      this.logger.log(`Image uploaded successfully: ${uploadedFile.url}`);
    }

    const updatedMenuItem = await this.menuItemRepository.update(id, updateData);
    if (!updatedMenuItem) {
      throw new NotFoundException(`Failed to update menu item ${id}`);
    }

    this.logger.log(`Menu item ${id} updated successfully`);
    return updatedMenuItem;
  }

  async deleteMenuItem(id: string, userId: string): Promise<void> {
    this.logger.log(`Deleting menu item ${id} for vendor ${userId}`);

    const menuItem = await this.getMenuItemById(id);

    // get vendor id from user id
    const vendor = await this.vendorService.getVendorByUserId(userId);
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${userId} not found`);
    }
    
    // Verify ownership
    if (menuItem.vendor_id !== vendor.id) {
      throw new ForbiddenException('You can only delete your own menu items');
    }

    await this.menuItemRepository.delete(id);
    this.logger.log(`Menu item ${id} deleted successfully`);
  }

  async toggleItemAvailability(id: string, userId: string): Promise<MenuItem> {
    this.logger.log(`Toggling availability for menu item ${id}`);

    const menuItem = await this.getMenuItemById(id);

    // get vendor id from user id
    const vendor = await this.vendorService.getVendorByUserId(userId);
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${userId} not found`);
    }
    
    // Verify ownership
    if (menuItem.vendor_id !== vendor.id) {
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