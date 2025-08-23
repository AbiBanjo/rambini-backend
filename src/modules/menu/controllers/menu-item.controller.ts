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
  MenuItemResponseDto,
} from 'src/modules/menu/dto';
import { VendorOnly, AdminOrVendor, AccessControl } from 'src/common/guards';
import { UserType } from 'src/entities';

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
  @ApiResponse({ status: 201, description: 'Menu item created successfully', type: MenuItemResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only vendors can create menu items' })
  async createMenuItem(
    @Request() req,
    @Body() createDto: CreateMenuItemDto,
  ): Promise<MenuItemResponseDto> {
    const menuItem = await this.menuItemService.createMenuItem(req.user.vendor_id, createDto);
    return this.mapToResponseDto(menuItem);
  }

  @Get()
  @ApiOperation({ summary: 'Search and filter menu items' })
  @ApiResponse({ status: 200, description: 'Menu items retrieved successfully' })
  @ApiQuery({ name: 'query', required: false, description: 'Search query' })
  @ApiQuery({ name: 'category_id', required: false, description: 'Category filter' })
  @ApiQuery({ name: 'vendor_id', required: false, description: 'Vendor filter' })
  @ApiQuery({ name: 'min_price', required: false, description: 'Minimum price' })
  @ApiQuery({ name: 'max_price', required: false, description: 'Maximum price' })
  @ApiQuery({ name: 'is_available', required: false, description: 'Availability filter' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async searchMenuItems(@Query() searchDto: SearchMenuItemsDto) {
    return await this.menuItemService.searchMenuItems(searchDto);
  }

  @Get('vendor/:vendorId')
  @ApiOperation({ summary: 'Get menu items by vendor' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiResponse({ status: 200, description: 'Vendor menu items retrieved successfully' })
  async getVendorMenu(@Param('vendorId') vendorId: string) {
    const items = await this.menuItemService.getVendorMenu(vendorId);
    return items.map(item => this.mapToResponseDto(item));
  }

  @Get('category/:categoryId')
  @ApiOperation({ summary: 'Get menu items by category' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category menu items retrieved successfully' })
  async getCategoryMenu(@Param('categoryId') categoryId: string) {
    const items = await this.menuItemService.getCategoryMenu(categoryId);
    return items.map(item => this.mapToResponseDto(item));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get menu item by ID' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: 200, description: 'Menu item retrieved successfully', type: MenuItemResponseDto })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async getMenuItemById(@Param('id') id: string): Promise<MenuItemResponseDto> {
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
  @ApiResponse({ status: 200, description: 'Menu item updated successfully', type: MenuItemResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only owner can update' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async updateMenuItem(
    @Param('id') id: string,
    @Request() req,
    @Body() updateDto: UpdateMenuItemDto,
  ): Promise<MenuItemResponseDto> {
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
  @ApiResponse({ status: 200, description: 'Availability toggled successfully', type: MenuItemResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden - Only owner can modify' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async toggleAvailability(@Param('id') id: string, @Request() req): Promise<MenuItemResponseDto> {
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

  private mapToResponseDto(menuItem: any): MenuItemResponseDto {
    return {
      id: menuItem.id,
      vendor_id: menuItem.vendor_id,
      category_id: menuItem.category_id,
      name: menuItem.name,
      description: menuItem.description,
      price: menuItem.price,
      preparation_time_minutes: menuItem.preparation_time_minutes,
      image_url: menuItem.image_url,
      is_available: menuItem.is_available,
      created_at: menuItem.created_at,
      updated_at: menuItem.updated_at,
      vendor_name: menuItem.vendor?.business_name,
      vendor_logo: menuItem.vendor?.business_logo_url,
      category_name: menuItem.category?.name,
    };
  }
} 