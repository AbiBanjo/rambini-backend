// src/modules/admin/controllers/admin-order.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
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
import { AdminOrderService } from '../service/admin-order.service';
import { AdminAuthGuard } from '../../auth/guards/admin-auth-guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { User } from '@/entities';
import {
  OrderFilterDto,
  OrderResponseDto,
  UpdateOrderStatusDto,
} from '../../order/dto';
import {
  AdminCancelOrderDto,
  AdminCancelOrderResponseDto,
} from '../dto/admin-order.dto';

@ApiTags('Admin - Orders')
@Controller('admin/orders')
@UseGuards(JwtAuthGuard, AdminAuthGuard)
@ApiBearerAuth()
export class AdminOrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly adminOrderService: AdminOrderService,
  ) {}

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

  @Get('failed-payments')
  @ApiOperation({
    summary: '[ADMIN ONLY]: Get orders with failed payments',
    description: 'Returns orders where payment failed but status is still NEW',
  })
  @ApiResponse({
    status: 200,
    description: 'Failed payment orders retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getFailedPaymentOrders(): Promise<OrderResponseDto[]> {
    return await this.adminOrderService.getFailedPaymentOrders();
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
  async getOrderById(@Param('id') id: string): Promise<OrderResponseDto> {
    return await this.adminOrderService.getOrderByIdForAdmin(id);
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
    @GetUser() admin: User,
    @Param('id') id: string,
    @Body() updateDto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    return await this.adminOrderService.updateOrderStatusAsAdmin(
      id,
      admin.id,
      updateDto,
    );
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[ADMIN ONLY]: Cancel an order and refund customer',
    description: `
      Cancels an order and processes refund if payment was successful.
      - Can only cancel orders with status NEW, CONFIRMED, or PREPARING
      - If payment was PAID: Refunds customer wallet and debits vendor wallet
      - If payment was PENDING/FAILED: Just cancels the order
      - Sends email notifications to customer, vendor, and admin
      - Records cancellation details with admin info
    `,
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully with refund details',
    type: AdminCancelOrderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel - order status not eligible for cancellation',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancelOrder(
    @GetUser() admin: User,
    @Param('id') orderId: string,
    @Body() cancelDto: AdminCancelOrderDto,
  ): Promise<AdminCancelOrderResponseDto> {
    return await this.adminOrderService.cancelOrderAsAdmin(
      orderId,
      admin,
      cancelDto,
    );
  }

  @Post(':id/mark-failed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[ADMIN ONLY]: Mark order with failed payment as cancelled',
    description: `
      For orders where payment failed but status is still NEW.
      This will update the order status to CANCELLED without any wallet operations.
    `,
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order marked as cancelled successfully',
  })
  @ApiResponse({ status: 400, description: 'Order not eligible' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async markFailedOrderCancelled(
    @GetUser() admin: User,
    @Param('id') orderId: string,
    @Body() body: { reason?: string },
  ): Promise<{ message: string; order: OrderResponseDto }> {
    return await this.adminOrderService.markFailedOrderCancelled(
      orderId,
      admin,
      body.reason,
    );
  }
}