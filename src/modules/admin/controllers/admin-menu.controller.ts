import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Put,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminAuthGuard } from '../../auth/guards/admin-auth-guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MenuItemService } from '../../menu/services/menu-item.service';
import {
  SearchMenuItemsDto,
  SearchMenuItemsResponseDto,
  MenuItemWithDistanceDto,
  UpdateMenuItemDto,
} from '../../menu/dto';

@ApiTags('Admin - Menu Items')
@Controller('admin/menu-items')
@UseGuards(JwtAuthGuard, AdminAuthGuard)
@ApiBearerAuth()
export class AdminMenuController {
  constructor(private readonly menuItemService: MenuItemService) {}

  @Get()
  @ApiOperation({
    summary: '[ADMIN ONLY]: Search and get all menu items',
    description: 'Returns all menu items including those from inactive vendors by default. Use include_inactive=false to filter to active vendors only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Menu items retrieved successfully',
    type: SearchMenuItemsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'query', required: false, description: 'Search query' })
  @ApiQuery({ name: 'category_id', required: false, description: 'Category filter' })
  @ApiQuery({ name: 'vendor_id', required: false, description: 'Vendor filter' })
  @ApiQuery({ name: 'min_price', required: false, description: 'Minimum price' })
  @ApiQuery({ name: 'max_price', required: false, description: 'Maximum price' })
  @ApiQuery({ name: 'is_available', required: false, description: 'Availability filter' })
  @ApiQuery({ 
    name: 'include_inactive', 
    required: false, 
    description: 'Include inactive vendors (default: true for admin)',
    type: Boolean,
    example: true
  })
  @ApiQuery({ name: 'sort_by', required: false, description: 'Sort field' })
  @ApiQuery({ name: 'sort_order', required: false, description: 'Sort order' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async getAllMenuItems(
    @Query() searchDto: SearchMenuItemsDto,
  ): Promise<SearchMenuItemsResponseDto> {
    // ✅ Admin gets all vendors by default (including inactive)
    // If not explicitly set, default to true for admin
    if (searchDto.include_inactive === undefined) {
      searchDto.include_inactive = true;
    }
    
    return await this.menuItemService.searchMenuItems(searchDto);
  }

  @Get(':id')
  @ApiOperation({ summary: '[ADMIN ONLY]: Get menu item by ID' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({
    status: 200,
    description: 'Menu item retrieved successfully',
    type: MenuItemWithDistanceDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async getMenuItemById(@Param('id') id: string): Promise<MenuItemWithDistanceDto> {
    return await this.menuItemService.getMenuItemById(id);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: '[ADMIN ONLY]: Update menu item' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        preparation_time_minutes: { type: 'number' },
        is_available: { type: 'boolean' },
        category_id: { type: 'string' },
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Menu item updated successfully',
    type: MenuItemWithDistanceDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async updateMenuItem(
    @Param('id') id: string,
    @Body() updateDto: UpdateMenuItemDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /image\/.*$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ): Promise<MenuItemWithDistanceDto> {
    // Get the menu item to find its vendor
    const menuItem = await this.menuItemService.getMenuItemById(id);
    
    return await this.menuItemService.updateMenuItemWithFile(
      id,
      menuItem.vendor_id,
      updateDto,
      file,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: '[ADMIN ONLY]: Delete menu item' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: 200, description: 'Menu item deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async deleteMenuItem(@Param('id') id: string): Promise<{ message: string }> {
    // Get the menu item to find its vendor
    const menuItem = await this.menuItemService.getMenuItemById(id);
    
    await this.menuItemService.deleteMenuItem(id, menuItem.vendor_id);
    return { message: 'Menu item deleted successfully' };
  }

  @Put(':id/availability')
  @ApiOperation({ summary: '[ADMIN ONLY]: Toggle menu item availability' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({
    status: 200,
    description: 'Availability toggled successfully',
    type: MenuItemWithDistanceDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async toggleMenuItemAvailability(
    @Param('id') id: string,
  ): Promise<MenuItemWithDistanceDto> {
    // Get the menu item to find its vendor
    const menuItem = await this.menuItemService.getMenuItemById(id);
    
    return await this.menuItemService.toggleItemAvailability(id, menuItem.vendor_id);
  }
}