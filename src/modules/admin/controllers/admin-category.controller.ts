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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminAuthGuard } from '../../auth/guards/admin-auth-guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CategoryService } from '../../menu/services/category.service';
import { FileStorageService } from '../../file-storage/services/file-storage.service';
import { Category } from '../../../entities';

@ApiTags('Admin - Categories')
@Controller('admin/categories')
@UseGuards(JwtAuthGuard, AdminAuthGuard)
@ApiBearerAuth()
export class AdminCategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    type: Category,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createCategory(@Body() categoryData: Partial<Category>): Promise<Category> {
    return await this.categoryService.createCategory(categoryData);
  }

  @Get()
  @ApiOperation({ summary: '[ADMIN ONLY]: Get all categories' })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
    type: [Category],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllCategories(): Promise<Category[]> {
    return await this.categoryService.getAllCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: '[ADMIN ONLY]: Get category by ID' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category retrieved successfully',
    type: Category,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getCategoryById(@Param('id') id: string): Promise<Category> {
    return await this.categoryService.getCategoryById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
    type: Category,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async updateCategory(
    @Param('id') id: string,
    @Body() updateData: Partial<Category>,
  ): Promise<Category> {
    return await this.categoryService.updateCategory(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Cannot delete category with sub-categories or items',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async deleteCategory(@Param('id') id: string): Promise<void> {
    await this.categoryService.deleteCategory(id);
  }

  @Put(':id/activate')
  @ApiOperation({ summary: 'Activate a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category activated successfully',
    type: Category,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async activateCategory(@Param('id') id: string): Promise<Category> {
    return await this.categoryService.activateCategory(id);
  }

  @Put(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category deactivated successfully',
    type: Category,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async deactivateCategory(@Param('id') id: string): Promise<Category> {
    return await this.categoryService.deactivateCategory(id);
  }

  @Put(':id/parent')
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
  @ApiResponse({ status: 404, description: 'Category not found' })
  async setParentCategory(
    @Param('id') id: string,
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
  @ApiResponse({ status: 404, description: 'Category not found' })
  async updateSortOrder(
    @Param('id') id: string,
    @Body() body: { sort_order: number },
  ): Promise<Category> {
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
  async uploadCategoryImage(
    @Param('id') id: string,
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
    const uploadedFile = await this.fileStorageService.uploadImage(file, {
      quality: 85,
      createThumbnail: true,
      thumbnailSize: 200,
    });
    const imageUrl = uploadedFile.url;

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
  async uploadCategoryIcon(
    @Param('id') id: string,
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
    const uploadedFile = await this.fileStorageService.uploadImage(file, {
      quality: 90,
      width: 64,
      height: 64,
      format: 'png',
    });
    const iconUrl = uploadedFile.url;

    const updatedCategory = await this.categoryService.updateCategory(id, {
      icon_url: iconUrl,
    });

    return updatedCategory;
  }
}