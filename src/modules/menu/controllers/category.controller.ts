import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CategoryService } from '../services/category.service';
import { FileStorageService } from 'src/modules/file-storage/services/file-storage.service';
import { Category } from 'src/entities';

@ApiTags('categories')
@Controller('categories')
// @UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully', type: Category })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only admins can create categories' })
  async createCategory(@Request() req, @Body() categoryData: Partial<Category>): Promise<Category> {
    // Verify user is an admin
    if (req.user.user_type !== 'ADMIN') {
      throw new Error('Only admins can create categories');
    }

    return await this.categoryService.createCategory(categoryData);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async getAllCategories(): Promise<Category[]> {
    return await this.categoryService.getAllCategories();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active categories' })
  @ApiResponse({ status: 200, description: 'Active categories retrieved successfully' })
  async getActiveCategories(): Promise<Category[]> {
    return await this.categoryService.getActiveCategories();
  }

  @Get('parents')
  @ApiOperation({ summary: 'Get all parent categories' })
  @ApiResponse({ status: 200, description: 'Parent categories retrieved successfully' })
  async getParentCategories(): Promise<Category[]> {
    return await this.categoryService.getParentCategories();
  }

  @Get('hierarchy')
  @ApiOperation({ summary: 'Get category hierarchy' })
  @ApiResponse({ status: 200, description: 'Category hierarchy retrieved successfully' })
  async getCategoryHierarchy(): Promise<Category[]> {
    return await this.categoryService.getCategoryHierarchy();
  }

  @Get('with-counts')
  @ApiOperation({ summary: 'Get categories with item counts' })
  @ApiResponse({ status: 200, description: 'Categories with counts retrieved successfully' })
  async getCategoriesWithItemCount() {
    return await this.categoryService.getCategoriesWithItemCount();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully', type: Category })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getCategoryById(@Param('id') id: string): Promise<Category> {
    return await this.categoryService.getCategoryById(id);
  }

  @Get(':id/subcategories')
  @ApiOperation({ summary: 'Get sub-categories of a parent category' })
  @ApiParam({ name: 'id', description: 'Parent category ID' })
  @ApiResponse({ status: 200, description: 'Sub-categories retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Not a parent category' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getSubCategories(@Param('id') id: string): Promise<Category[]> {
    return await this.categoryService.getSubCategories(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category updated successfully', type: Category })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only admins can update categories' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async updateCategory(
    @Param('id') id: string,
    @Request() req,
    @Body() updateData: Partial<Category>,
  ): Promise<Category> {
    // Verify user is an admin
    if (req.user.user_type !== 'ADMIN') {
      throw new Error('Only admins can update categories');
    }

    return await this.categoryService.updateCategory(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Cannot delete category with sub-categories or items' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only admins can delete categories' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async deleteCategory(@Param('id') id: string, @Request() req): Promise<void> {
    // Verify user is an admin
    if (req.user.user_type !== 'ADMIN') {
      throw new Error('Only admins can delete categories');
    }

    await this.categoryService.deleteCategory(id);
  }

  @Put(':id/activate')
  @ApiOperation({ summary: 'Activate a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category activated successfully', type: Category })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only admins can activate categories' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async activateCategory(@Param('id') id: string, @Request() req): Promise<Category> {
    // Verify user is an admin
    if (req.user.user_type !== 'ADMIN') {
      throw new Error('Only admins can activate categories');
    }

    return await this.categoryService.activateCategory(id);
  }

  @Put(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category deactivated successfully', type: Category })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only admins can deactivate categories' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async deactivateCategory(@Param('id') id: string, @Request() req): Promise<Category> {
    // Verify user is an admin
    if (req.user.user_type !== 'ADMIN') {
      throw new Error('Only admins can deactivate categories');
    }

    return await this.categoryService.deactivateCategory(id);
  }

  @Put(':id/sort-order')
  @ApiOperation({ summary: 'Update category sort order' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Sort order updated successfully', type: Category })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid sort order' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only admins can update sort order' })
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

    return await this.categoryService.updateCategorySortOrder(id, body.sort_order);
  }

  @Put(':id/parent')
  @ApiOperation({ summary: 'Set parent category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Parent category set successfully', type: Category })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid parent category' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only admins can set parent category' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async setParentCategory(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { parent_id: string | null },
  ): Promise<Category> {
    // Verify user is an admin
    if (req.user.user_type !== 'ADMIN') {
      throw new Error('Only admins can set parent category');
    }

    return await this.categoryService.setParentCategory(id, body.parent_id);
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
    const updatedCategory = await this.categoryService.updateCategory(id, { image_url: imageUrl });

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
    const updatedCategory = await this.categoryService.updateCategory(id, { icon_url: iconUrl });

    return updatedCategory;
  }
} 