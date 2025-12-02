import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Put,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { OrderService } from '../order/services/order.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { OrderFilterDto, OrderResponseDto } from '../order/dto';
import { Category, Vendor } from '@/entities';
import { CategoryService } from '../menu/services/category.service';
import { AdminAuthGuard } from '../auth/guards/admin-auth-guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileStorageService } from '../file-storage/services/file-storage.service';
import { AdminService } from './admin.service';

@Controller('admin')
//@UseGuards()
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly orderService: OrderService,
    private readonly categoryService: CategoryService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  @Get('get-orders')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({
    summary: '[ADMIN ONLY]: Get all orders with filtering and pagination',
  })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({
    name: 'order_status',
    required: false,
    enum: [
      'NEW',
      'CONFIRMED',
      'PREPARING',
      'READY',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
      'REFUNDED',
    ],
  })
  @ApiQuery({
    name: 'order_type',
    required: false,
    enum: ['DELIVERY', 'PICKUP'],
  })
  @ApiQuery({
    name: 'payment_status',
    required: false,
    enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
  })
  @ApiQuery({
    name: 'from_date',
    required: false,
    description: 'Filter orders from this date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'to_date',
    required: false,
    description: 'Filter orders until this date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'min_amount',
    required: false,
    description: 'Minimum order amount',
  })
  @ApiQuery({
    name: 'max_amount',
    required: false,
    description: 'Maximum order amount',
  })
  @ApiQuery({
    name: 'sort_by',
    required: false,
    enum: ['created_at', 'total_amount', 'order_number'],
  })
  @ApiQuery({ name: 'sort_order', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async getAllOrders(
    @Request() req,
    @Query() filterDto: OrderFilterDto,
  ): Promise<{ orders: OrderResponseDto[] }> {
    return await this.orderService.getAllOrders(filterDto);
  }

  @Post('create-category')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    type: Category,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admins can create categories',
  })
  async createCategory(
    @Request() req,
    @Body() categoryData: Partial<Category>,
  ): Promise<Category> {
    // Verify user is an admin
    if (req.user.user_type !== 'ADMIN') {
      throw new Error('Only admins can create categories');
    }

    return await this.categoryService.createCategory(categoryData);
  }

  @Put(':id')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
    type: Category,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admins can update categories',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async updateCategory(
    @Param('id') id: string,
    @Request() req,
    @Body() updateData: Partial<Category>,
  ): Promise<Category> {
    return await this.categoryService.updateCategory(id, updateData);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Cannot delete category with sub-categories or items',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admins can delete categories',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async deleteCategory(@Param('id') id: string, @Request() req): Promise<void> {
    await this.categoryService.deleteCategory(id);
  }

  @Put(':id/activate')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Activate a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category activated successfully',
    type: Category,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admins can activate categories',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async activateCategory(
    @Param('id') id: string,
    @Request() req,
  ): Promise<Category> {
    // // Verify user is an admin
    // if (req.user.user_type !== 'ADMIN') {
    //   throw new Error('Only admins can activate categories');
    // }
    return await this.categoryService.activateCategory(id);
  }

  @Put(':id/deactivate')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Deactivate a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category deactivated successfully',
    type: Category,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admins can deactivate categories',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async deactivateCategory(
    @Param('id') id: string,
    @Request() req,
  ): Promise<Category> {
    return await this.categoryService.deactivateCategory(id);
  }

  @Put(':id/parent')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Set parent category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Parent category set successfully',
    type: Category,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid parent category',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admins can set parent category',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async setParentCategory(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { parent_id: string | null },
  ): Promise<Category> {
    return await this.categoryService.setParentCategory(id, body.parent_id);
  }

  @Put(':id/sort-order')
  @ApiOperation({ summary: 'Update category sort order' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Sort order updated successfully',
    type: Category,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid sort order' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admins can update sort order',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async updateSortOrder(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { sort_order: number },
  ): Promise<Category> {
    // Verify user is an admin
    if (req.user.user_type !== 'ADMIN') {
      throw new Error('Only admins can update category sort order');
    }

    return await this.categoryService.updateCategorySortOrder(
      id,
      body.sort_order,
    );
  }

  @Post(':id/image')
  @ApiOperation({ summary: 'Upload image for category' })
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
    // Verify user is an admin
    if (req.user.user_type !== 'ADMIN') {
      throw new Error('Only admins can upload category images');
    }

    // Upload image to cloud storage
    const uploadedFile = await this.fileStorageService.uploadImage(file, {
      quality: 85,
      createThumbnail: true,
      thumbnailSize: 200,
    });
    const imageUrl = uploadedFile.url;

    // Update category with image URL
    const updatedCategory = await this.categoryService.updateCategory(id, {
      image_url: imageUrl,
    });

    return updatedCategory;
  }

  @Post(':id/icon')
  @ApiOperation({ summary: 'Upload icon for category' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        icon: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('icon'))
  async uploadIcon(
    @Param('id') id: string,
    @Request() req,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }), // 2MB
          new FileTypeValidator({ fileType: '.(jpg|jpeg|png|webp|svg)' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    // Verify user is an admin
    if (req.user.user_type !== 'ADMIN') {
      throw new Error('Only admins can upload category icons');
    }

    // Upload icon to cloud storage
    const uploadedFile = await this.fileStorageService.uploadImage(file, {
      quality: 90,
      width: 64,
      height: 64,
      format: 'png',
    });
    const iconUrl = uploadedFile.url;

    // Update category with icon URL
    const updatedCategory = await this.categoryService.updateCategory(id, {
      icon_url: iconUrl,
    });

    return updatedCategory;
  }

  @Get('admin/stats')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Get vendor statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Vendor stats retrieved successfully',
  })
  async getVendorStats() {
    return await this.adminService.getVerificationStats();
  }

  @Get('admin/all')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Get all vendors (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'All vendors retrieved successfully',
    type: [Vendor],
  })
  async getAllVendors(): Promise<Vendor[]> {
    return await this.adminService.getAllVendors();
  }
}
