import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrderService } from '../../order/services/order.service';
import { AdminAuthGuard } from '../../auth/guards/admin-auth-guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrderFilterDto, OrderResponseDto, UpdateOrderStatusDto } from '../../order/dto';

@ApiTags('Admin - Orders')
@Controller('admin/orders')
@UseGuards(JwtAuthGuard, AdminAuthGuard)
@ApiBearerAuth()
export class AdminOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
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
    @Query() filterDto: OrderFilterDto,
  ): Promise<{ orders: OrderResponseDto[] }> {
    return await this.orderService.getAllOrders(filterDto);
  }

  @Get('stats')
  @ApiOperation({ summary: '[ADMIN ONLY]: Get order statistics' })
  @ApiResponse({
    status: 200,
    description: 'Order statistics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOrderStats() {
    return await this.orderService.getOrderStats();
  }

  @Get(':id')
  @ApiOperation({ summary: '[ADMIN ONLY]: Get order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order retrieved successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderById(
    @Request() req,
    @Param('id') id: string,
  ): Promise<OrderResponseDto> {
    return await this.orderService.getOrderById(id, req.user.id, 'ADMIN');
  }

  @Put(':id/status')
  @ApiOperation({ summary: '[ADMIN ONLY]: Update order status' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order status updated successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid status transition',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateOrderStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    return await this.orderService.updateOrderStatus(id, req.user.id, updateDto);
  }
}