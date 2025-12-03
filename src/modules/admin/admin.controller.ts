import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiTags,
} from '@nestjs/swagger';
import { OrderFilterDto, OrderResponseDto } from '../order/dto';
import {
  Category,
  Notification,
  NotificationType,
  NotificationDelivery,
  DeviceToken,
  UserNotificationPreference,
  NotificationPriority,
  Vendor,
} from '../../entities';
import { CategoryService } from '../menu/services/category.service';
import { AdminAuthGuard } from '../auth/guards/admin-auth-guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileStorageService } from '../file-storage/services/file-storage.service';
import { AdminService } from './admin.service';
import { NotificationService } from '../notification/notification.service';
import { WithdrawalResponseDto } from '../payment/dto/withdrawal-response.dto';
import { AdminWithdrawalActionDto } from './dto/admin-withdrawal.dto';
import { WithdrawalService } from '../payment/services/withdrawal.service';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly orderService: OrderService,
    private readonly categoryService: CategoryService,
    private readonly fileStorageService: FileStorageService,
    private readonly notificationService: NotificationService,
    private readonly withdrawalService: WithdrawalService,
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

  @Put('category/:id')
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

  @Delete('category/:id')
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

  @Put('category/:id/activate')
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

  @Put('category/:id/deactivate')
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

  @Put('category/:id/parent')
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

  @Put('category/:id/sort-order')
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

  @Post('category/:id/image')
  @UseGuards(AdminAuthGuard)
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

  @Post('category/:id/icon')
  @UseGuards(AdminAuthGuard)
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

  @Get('vendor/stats')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Get vendor statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Vendor stats retrieved successfully',
  })
  async getVendorStats() {
    return await this.adminService.getVerificationStats();
  }

  @Get('vendor/all')
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

  @Post('/withdrawals/:id/done')
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark withdrawal as completed' })
  @ApiParam({ name: 'id', description: 'Withdrawal ID' })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal marked as completed successfully',
    type: WithdrawalResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - withdrawal already in final status',
  })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async markWithdrawalAsDone(
    @Request() req: any,
    @Param('id') id: string,
    @Body() actionData: AdminWithdrawalActionDto,
  ): Promise<WithdrawalResponseDto> {
    return await this.withdrawalService.markWithdrawalAsDone(
      id,
      req.user.id,
      actionData,
    );
  }

  @Get('withdrawals/pending')
  @ApiOperation({ summary: 'Get all pending withdrawals' })
  @ApiResponse({
    status: 200,
    description: 'Pending withdrawals retrieved successfully',
    type: [WithdrawalResponseDto],
  })
  async getPendingWithdrawals(): Promise<WithdrawalResponseDto[]> {
    return await this.withdrawalService.getAllPendingWithdrawals();
  }

  @Get('processing')
  @ApiOperation({ summary: 'Get all processing withdrawals' })
  @ApiResponse({
    status: 200,
    description: 'Processing withdrawals retrieved successfully',
    type: [WithdrawalResponseDto],
  })
  async getProcessingWithdrawals(): Promise<WithdrawalResponseDto[]> {
    return await this.withdrawalService.getAllProcessingWithdrawals();
  }

  @Post('withdrawals/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark withdrawal as rejected' })
  @ApiParam({ name: 'id', description: 'Withdrawal ID' })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal marked as rejected successfully',
    type: WithdrawalResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - withdrawal already in final status',
  })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async markWithdrawalAsRejected(
    @Request() req: any,
    @Param('id') id: string,
    @Body() actionData: AdminWithdrawalActionDto,
  ): Promise<WithdrawalResponseDto> {
    return await this.withdrawalService.markWithdrawalAsRejected(
      id,
      req.user.id,
      actionData,
    );
  }

  @Post('withdrawals/:id/failed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark withdrawal as failed' })
  @ApiParam({ name: 'id', description: 'Withdrawal ID' })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal marked as failed successfully',
    type: WithdrawalResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - withdrawal already in final status',
  })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async markWithdrawalAsFailed(
    @Request() req: any,
    @Param('id') id: string,
    @Body() actionData: AdminWithdrawalActionDto,
  ): Promise<WithdrawalResponseDto> {
    return await this.withdrawalService.markWithdrawalAsFailed(
      id,
      req.user.id,
      actionData,
    );
  }

  @Post('system/notification')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Create a system notification (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
  })
  async createSystemNotification(
    @Body()
    body: {
      userId: string;
      title: string;
      message: string;
      priority?: string;
    },
  ): Promise<Notification> {
    return this.notificationService.createNotification(
      body.userId,
      NotificationType.SYSTEM,
      body.title,
      body.message,
      {
        priority: body.priority as any,
        deliveryMethod: NotificationDelivery.IN_APP,
      },
    );
  }
}
