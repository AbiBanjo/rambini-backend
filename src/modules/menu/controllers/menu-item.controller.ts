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
  ValidationPipe,
  Req,
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
import { MenuItem, User, UserType } from 'src/entities';
import { GetUser } from '@/common/decorators/get-user.decorator';

@ApiTags('Menu Items')
@Controller('menu-items')
@ApiBearerAuth()
export class MenuItemController {
  constructor(
    private readonly menuItemService: MenuItemService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @VendorOnly()
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Create a new menu item with optional image upload',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        category_id: {
          type: 'string',
          description: 'Category ID this item belongs to',
        },
        name: { type: 'string', description: 'Name of the menu item' },
        description: {
          type: 'string',
          description: 'Description of the menu item',
        },
        price: { type: 'number', description: 'Price of the menu item' },
        preparation_time_minutes: {
          type: 'number',
          description: 'Preparation time in minutes',
        },
        is_available: {
          type: 'boolean',
          description: 'Whether the item is available for ordering',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file for the menu item',
        },
      },
      required: ['category_id', 'name', 'price'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Menu item created successfully',
    type: MenuItemWithDistanceDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only vendors can create menu items',
  })
  async createMenuItem(
    @GetUser() user: User,
    @Body() createDto: CreateMenuItemDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /image\/.*$/ }),
        ],
        fileIsRequired: false, // Make file optional
      }),
    )
    file?: Express.Multer.File,
  ): Promise<MenuItem> {
    return this.menuItemService.createMenuItemWithFile(
      user.id,
      createDto,
      file,
    );
  }

  @Get('')
  @ApiOperation({
    summary: 'Search and filter menu items',
    description:
      'Search menu items with optional proximity-based sorting and filtering. When coordinates are provided (either directly via latitude/longitude or via address_id), results include distance information and are sorted by proximity. If authenticated, includes like information (like_count and is_liked_by_user).',
  })
  @ApiResponse({
    status: 200,
    description:
      'Menu items retrieved successfully with optional distance and like information',
    type: SearchMenuItemsResponseDto,
  })
  @ApiQuery({
    name: 'query',
    required: false,
    description: 'Search query for menu item name or description',
  })
  @ApiQuery({
    name: 'category_id',
    required: false,
    description: 'Category filter',
  })
  @ApiQuery({
    name: 'vendor_id',
    required: false,
    description: 'Vendor filter',
  })
  @ApiQuery({
    name: 'min_price',
    required: false,
    description: 'Minimum price filter',
  })
  @ApiQuery({
    name: 'max_price',
    required: false,
    description: 'Maximum price filter',
  })
  @ApiQuery({
    name: 'is_available',
    required: false,
    description: 'Availability filter',
  })
  @ApiQuery({
    name: 'latitude',
    required: false,
    description: 'Customer latitude for proximity search',
  })
  @ApiQuery({
    name: 'longitude',
    required: false,
    description: 'Customer longitude for proximity search',
  })
  @ApiQuery({
    name: 'address_id',
    required: false,
    description:
      'Address ID to use for proximity search (alternative to latitude/longitude)',
  })
  @ApiQuery({
    name: 'max_distance',
    required: false,
    description: 'Maximum delivery distance in kilometers',
  })
  @ApiQuery({
    name: 'prioritize_distance',
    required: false,
    description: 'Whether to prioritize distance-based sorting',
  })
  @ApiQuery({
    name: 'delivery_only',
    required: false,
    description: 'Filter for delivery-only vendors',
  })
  @ApiQuery({
    name: 'sort_by',
    required: false,
    description:
      'Sort field (distance sorting takes priority when coordinates provided)',
  })
  @ApiQuery({ name: 'sort_order', required: false, description: 'Sort order' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async searchMenuItems(
    @Query(new ValidationPipe({ transform: true }))
    searchDto: SearchMenuItemsDto,
    @Req() req: any, // ✅ Add Request to get user
  ): Promise<SearchMenuItemsResponseDto> {
    // ✅ Extract userId if authenticated (undefined if not)
    const userId = req.user?.userId;
    return await this.menuItemService.searchMenuItems(searchDto, userId);
  }

  @Get('vendor')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get menu items by vendor' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiResponse({
    status: 200,
    description: 'Vendor menu items retrieved successfully with like information',
    type: [MenuItemWithDistanceDto],
  })
  async getVendorMenu(@GetUser() user: User, @Req() req: any) {
    // ✅ Pass requesting user ID for like info
    const requestingUserId = req.user?.userId;
    return await this.menuItemService.getVendorMenu(user.id, requestingUserId);
  }

  @Get('category/:categoryId')
  @ApiOperation({ summary: 'Get menu items by category' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category menu items retrieved successfully with like information',
    type: [MenuItemWithDistanceDto],
  })
  async getCategoryMenu(
    @Param('categoryId') categoryId: string,
    @Req() req: any, // ✅ Add Request
  ) {
    // ✅ Extract userId if authenticated
    const userId = req.user?.userId;
    return await this.menuItemService.getCategoryMenu(categoryId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get menu item by ID with like information' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({
    status: 200,
    description: 'Menu item retrieved successfully with like information',
    type: MenuItemWithDistanceDto,
  })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async getMenuItemById(
    @Param('id') id: string,
    @Req() req: any, // ✅ Add Request
  ): Promise<MenuItemWithDistanceDto> {
    // ✅ Extract userId if authenticated
    const userId = req.user?.userId;
    return await this.menuItemService.getMenuItemById(id, userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @AccessControl({
    roles: [UserType.VENDOR],
    requireVendorOwnership: 'id',
  })
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Update a menu item with optional image upload' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the menu item' },
        description: {
          type: 'string',
          description: 'Description of the menu item',
        },
        price: { type: 'number', description: 'Price of the menu item' },
        preparation_time_minutes: {
          type: 'number',
          description: 'Preparation time in minutes',
        },
        is_available: {
          type: 'boolean',
          description: 'Whether the item is available for ordering',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file for the menu item',
        },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({
    status: 200,
    description: 'Menu item updated successfully',
    type: MenuItemWithDistanceDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only owner can update',
  })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async updateMenuItem(
    @Param('id') id: string,
    @GetUser() user: User,
    @Body() updateDto: UpdateMenuItemDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: '.(jpg|jpeg|png|webp)' }),
        ],
        fileIsRequired: false, // Make file optional
      }),
    )
    file?: Express.Multer.File,
  ): Promise<MenuItemWithDistanceDto> {
    const menuItem = await this.menuItemService.updateMenuItemWithFile(
      id,
      user.id,
      updateDto,
      file,
    );
    return menuItem;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @AccessControl({
    roles: [UserType.VENDOR],
    requireVendorOwnership: 'id',
  })
  @ApiOperation({ summary: 'Delete a menu item' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: 200, description: 'Menu item deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only owner can delete',
  })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async deleteMenuItem(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<void> {
    await this.menuItemService.deleteMenuItem(id, user.id);
  }

  @Put(':id/availability')
  @UseGuards(JwtAuthGuard)
  @AccessControl({
    roles: [UserType.VENDOR],
    requireVendorOwnership: 'id',
  })
  @ApiOperation({ summary: 'Toggle menu item availability' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({
    status: 200,
    description: 'Availability toggled successfully',
    type: MenuItemWithDistanceDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only owner can modify',
  })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async toggleAvailability(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<MenuItemWithDistanceDto> {
    const menuItem = await this.menuItemService.toggleItemAvailability(
      id,
      user.id,
    );
    return menuItem;
  }

  @Post('bulk-operations')
  @UseGuards(JwtAuthGuard)
  @VendorOnly()
  @ApiOperation({ summary: 'Perform bulk operations on menu items' })
  @ApiResponse({
    status: 200,
    description: 'Bulk operation completed successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only owner can perform bulk operations',
  })
  async bulkOperations(@Request() req, @Body() bulkDto: BulkMenuOperationDto) {
    return await this.menuItemService.bulkMenuOperations(
      req.user.vendor_id,
      bulkDto,
    );
  }

  @Post(':id/image')
  @UseGuards(JwtAuthGuard)
  @AccessControl({
    roles: [UserType.VENDOR],
    requireVendorOwnership: 'id',
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
          new FileTypeValidator({ fileType: /image\/.*$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const menuItem = await this.menuItemService.getMenuItemById(id, req.user?.userId);
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