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

@ApiTags('Categories')
@Controller('categories')
// @UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all active categories' })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  async getAllCategories(): Promise<Category[]> {
    return await this.categoryService.getAllCategories();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active categories' })
  @ApiResponse({
    status: 200,
    description: 'Active categories retrieved successfully',
  })
  async getActiveCategories(): Promise<Category[]> {
    return await this.categoryService.getActiveCategories();
  }

  @Get('parents')
  @ApiOperation({ summary: 'Get all parent categories' })
  @ApiResponse({
    status: 200,
    description: 'Parent categories retrieved successfully',
  })
  async getParentCategories(): Promise<Category[]> {
    return await this.categoryService.getParentCategories();
  }

  @Get('hierarchy')
  @ApiOperation({ summary: 'Get category hierarchy' })
  @ApiResponse({
    status: 200,
    description: 'Category hierarchy retrieved successfully',
  })
  async getCategoryHierarchy(): Promise<Category[]> {
    return await this.categoryService.getCategoryHierarchy();
  }

  @Get('with-counts')
  @ApiOperation({ summary: 'Get categories with item counts' })
  @ApiResponse({
    status: 200,
    description: 'Categories with counts retrieved successfully',
  })
  async getCategoriesWithItemCount() {
    return await this.categoryService.getCategoriesWithItemCount();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category retrieved successfully',
    type: Category,
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getCategoryById(@Param('id') id: string): Promise<Category> {
    return await this.categoryService.getCategoryById(id);
  }

  @Get(':id/subcategories')
  @ApiOperation({ summary: 'Get sub-categories of a parent category' })
  @ApiParam({ name: 'id', description: 'Parent category ID' })
  @ApiResponse({
    status: 200,
    description: 'Sub-categories retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Not a parent category',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getSubCategories(@Param('id') id: string): Promise<Category[]> {
    return await this.categoryService.getSubCategories(id);
  }
}
