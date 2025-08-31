import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { MenuItemService } from '../services/menu-item.service';
import { FileStorageService } from 'src/modules/file-storage/services/file-storage.service';
import {
  CreateMenuItemDto,
  UpdateMenuItemDto,
  SearchMenuItemsDto,
  BulkMenuOperationDto,
  MenuItemWithDistanceDto,
  SearchMenuItemsResponseDto,
} from 'src/modules/menu/dto';
import { VendorOnly, AdminOrVendor, AccessControl } from 'src/common/guards';
import { User, UserType } from 'src/entities';
import { GetUser } from '@/common/decorators/get-user.decorator';

@ApiTags('menu-items')
@Controller('menu-items')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MenuItemController {
  constructor(
    private readonly menuItemService: MenuItemService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  @Post()
  @VendorOnly()
  @ApiOperation({ summary: 'Create a new menu item' })
  @ApiResponse({ status: 201, description: 'Menu item created successfully', type: MenuItemWithDistanceDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only vendors can create menu items' })
  async createMenuItem(
    @GetUser() user: User,
    @Body() createDto: CreateMenuItemDto,
  ): Promise<MenuItemWithDistanceDto> {
    const menuItem = await this.menuItemService.createMenuItem(user.id, createDto);
    return this.mapToResponseDto(menuItem);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Search and filter menu items',
    description: 'Search menu items with optional proximity-based sorting and filtering. When coordinates are provided (either directly via latitude/longitude or via address_id), results include distance information and are sorted by proximity. Address ID can be used as an alternative to providing coordinates directly.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Menu items retrieved successfully with optional distance information',
    type: SearchMenuItemsResponseDto
  })
  @ApiQuery({ name: 'query', required: false, description: 'Search query for menu item name or description' })
  @ApiQuery({ name: 'category_id', required: false, description: 'Category filter' })
  @ApiQuery({ name: 'vendor_id', required: false, description: 'Vendor filter' })
  @ApiQuery({ name: 'min_price', required: false, description: 'Minimum price filter' })
  @ApiQuery({ name: 'max_price', required: false, description: 'Maximum price filter' })
  @ApiQuery({ name: 'is_available', required: false, description: 'Availability filter' })
  @ApiQuery({ name: 'latitude', required: false, description: 'Customer latitude for proximity search' })
  @ApiQuery({ name: 'longitude', required: false, description: 'Customer longitude for proximity search' })
  @ApiQuery({ name: 'address_id', required: false, description: 'Address ID to use for proximity search (alternative to latitude/longitude)' })
  @ApiQuery({ name: 'max_distance', required: false, description: 'Maximum delivery distance in kilometers' })
  @ApiQuery({ name: 'prioritize_distance', required: false, description: 'Whether to prioritize distance-based sorting' })
  @ApiQuery({ name: 'delivery_only', required: false, description: 'Filter for delivery-only vendors' })
  @ApiQuery({ name: 'sort_by', required: false, description: 'Sort field (distance sorting takes priority when coordinates provided)' })
  @ApiQuery({ name: 'sort_order', required: false, description: 'Sort order' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async searchMenuItems(@Query() searchDto: SearchMenuItemsDto): Promise<SearchMenuItemsResponseDto> {
    return await this.menuItemService.searchMenuItems(searchDto);
  }

  @Get('vendor/:vendorId')
  @ApiOperation({ summary: 'Get menu items by vendor' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiResponse({ status: 200, description: 'Vendor menu items retrieved successfully', type: [MenuItemWithDistanceDto] })
  async getVendorMenu(@Param('vendorId') vendorId: string) {
    const items = await this.menuItemService.getVendorMenu(vendorId);
    return items.map(item => this.mapToResponseDto(item));
  }

  @Get('category/:categoryId')
  @ApiOperation({ summary: 'Get menu items by category' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category menu items retrieved successfully', type: [MenuItemWithDistanceDto] })
  async getCategoryMenu(@Param('categoryId') categoryId: string) {
    const items = await this.menuItemService.getCategoryMenu(categoryId);
    return items.map(item => this.mapToResponseDto(item));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get menu item by ID' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: 200, description: 'Menu item retrieved successfully', type: MenuItemWithDistanceDto })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async getMenuItemById(@Param('id') id: string): Promise<MenuItemWithDistanceDto> {
    const menuItem = await this.menuItemService.getMenuItemById(id);
    return this.mapToResponseDto(menuItem);
  }

  @Put(':id')
  @AccessControl({
    roles: [UserType.VENDOR],
    requireVendorOwnership: 'id'
  })
  @ApiOperation({ summary: 'Update a menu item' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: 200, description: 'Menu item updated successfully', type: MenuItemWithDistanceDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only owner can update' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async updateMenuItem(
    @Param('id') id: string,
    @Request() req,
    @Body() updateDto: UpdateMenuItemDto,
  ): Promise<MenuItemWithDistanceDto> {
    const menuItem = await this.menuItemService.updateMenuItem(id, req.user.vendor_id, updateDto);
    return this.mapToResponseDto(menuItem);
  }

  @Delete(':id')
  @AccessControl({
    roles: [UserType.VENDOR],
    requireVendorOwnership: 'id'
  })
  @ApiOperation({ summary: 'Delete a menu item' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: 200, description: 'Menu item deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only owner can delete' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async deleteMenuItem(@Param('id') id: string, @Request() req): Promise<void> {
    await this.menuItemService.deleteMenuItem(id, req.user.vendor_id);
  }

  @Put(':id/availability')
  @AccessControl({
    roles: [UserType.VENDOR],
    requireVendorOwnership: 'id'
  })
  @ApiOperation({ summary: 'Toggle menu item availability' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: 200, description: 'Availability toggled successfully', type: MenuItemWithDistanceDto })
  @ApiResponse({ status: 403, description: 'Forbidden - Only owner can modify' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async toggleAvailability(@Param('id') id: string, @Request() req): Promise<MenuItemWithDistanceDto> {
    const menuItem = await this.menuItemService.toggleItemAvailability(id, req.user.vendor_id);
    return this.mapToResponseDto(menuItem);
  }

  @Post('bulk-operations')
  @VendorOnly()
  @ApiOperation({ summary: 'Perform bulk operations on menu items' })
  @ApiResponse({ status: 200, description: 'Bulk operation completed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only owner can perform bulk operations' })
  async bulkOperations(
    @Request() req,
    @Body() bulkDto: BulkMenuOperationDto,
  ) {
    return await this.menuItemService.bulkMenuOperations(req.user.vendor_id, bulkDto);
  }

  @Post(':id/image')
  @AccessControl({
    roles: [UserType.VENDOR],
    requireVendorOwnership: 'id'
  })
  @ApiOperation({ summary: 'Upload image for menu item' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @Param('id') id: string,
    @Request() req,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: '.(jpg|jpeg|png|webp)' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const menuItem = await this.menuItemService.getMenuItemById(id);
    if (menuItem.vendor_id !== req.user.vendor_id) {
      throw new Error('You can only upload images for your own menu items');
    }

    // Upload image to cloud storage
    const uploadedFile = await this.fileStorageService.uploadImage(file, {
      quality: 85,
      createThumbnail: true,
      thumbnailSize: 300,
    });
    const imageUrl = uploadedFile.url;

    // Update menu item with image URL
    const updatedMenuItem = await this.menuItemService.updateMenuItem(
      id,
      req.user.vendor_id,
      { image_url: imageUrl },
    );

    return this.mapToResponseDto(updatedMenuItem);
  }

  private mapToResponseDto(menuItem: any): MenuItemWithDistanceDto {
    // Since MenuItemWithDistanceDto extends MenuItem, we can directly assign the menuItem
    // The distance property will be added by the repository when coordinates are provided
    return menuItem as MenuItemWithDistanceDto;
  }
} 