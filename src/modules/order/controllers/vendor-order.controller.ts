import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { OrderService } from '../services/order.service';
import {
  UpdateOrderStatusDto,
  OrderResponseDto,
  OrderFilterDto,
} from '../dto';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { User, UserType } from '@/entities';
import { AccessControl } from '@/common/guards';

@ApiTags('vendor-orders')
@Controller('vendor/orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VendorOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @AccessControl({
    roles: [UserType.VENDOR],
    requireVendorOwnership: 'id'
  })
  @ApiOperation({ summary: 'Get vendor orders with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not a vendor' })
  @ApiQuery({ name: 'order_status', required: false, enum: ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED'] })
  @ApiQuery({ name: 'order_type', required: false, enum: ['DELIVERY', 'PICKUP'] })
  @ApiQuery({ name: 'payment_status', required: false, enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'] })
  @ApiQuery({ name: 'from_date', required: false, description: 'Filter orders from this date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to_date', required: false, description: 'Filter orders until this date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'min_amount', required: false, description: 'Minimum order amount' })
  @ApiQuery({ name: 'max_amount', required: false, description: 'Maximum order amount' })
  @ApiQuery({ name: 'sort_by', required: false, enum: ['created_at', 'total_amount', 'order_number'] })
  @ApiQuery({ name: 'sort_order', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async getVendorOrders(
    @GetUser() user : User,
    @Query() filterDto: OrderFilterDto,
  ): Promise<{ orders: OrderResponseDto[]; total: number }> {
    return await this.orderService.getVendorOrders(user.id, filterDto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get vendor order statistics' })
  @ApiResponse({ status: 200, description: 'Order statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not a vendor' })
  async getVendorOrderStats(@Request() req) {
    // Verify user is a vendor
    if (req.user.user_type !== 'VENDOR') {
      throw new Error('Only vendors can access vendor order endpoints');
    }

    return await this.orderService.getOrderStats(req.user.vendor_id);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending orders for vendor' })
  @ApiResponse({ status: 200, description: 'Pending orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not a vendor' })
  async getPendingOrders(@Request() req): Promise<OrderResponseDto[]> {
    // Verify user is a vendor
    if (req.user.user_type !== 'VENDOR') {
      throw new Error('Only vendors can access vendor order endpoints');
    }

    return await this.orderService.getPendingOrders(req.user.vendor_id);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active orders for vendor' })
  @ApiResponse({ status: 200, description: 'Active orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not a vendor' })
  async getActiveOrders(@Request() req): Promise<OrderResponseDto[]> {
    // Verify user is a vendor
    if (req.user.user_type !== 'VENDOR') {
      throw new Error('Only vendors can access vendor order endpoints');
    }

    return await this.orderService.getActiveOrders(req.user.vendor_id);
  }

  @Get('completed')
  @ApiOperation({ summary: 'Get completed orders for vendor' })
  @ApiResponse({ status: 200, description: 'Completed orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not a vendor' })
  async getCompletedOrders(@Request() req): Promise<OrderResponseDto[]> {
    // Verify user is a vendor
    if (req.user.user_type !== 'VENDOR') {
      throw new Error('Only vendors can access vendor order endpoints');
    }

    return await this.orderService.getCompletedOrders(req.user.vendor_id);
  }

  @Get('cancelled')
  @ApiOperation({ summary: 'Get cancelled orders for vendor' })
  @ApiResponse({ status: 200, description: 'Cancelled orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not a vendor' })
  async getCancelledOrders(@Request() req): Promise<OrderResponseDto[]> {
    // Verify user is a vendor
    if (req.user.user_type !== 'VENDOR') {
      throw new Error('Only vendors can access vendor order endpoints');
    }

    return await this.orderService.getCancelledOrders(req.user.vendor_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID for vendor' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully', type: OrderResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Order does not belong to vendor' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderById(
    @Request() req,
    @Param('id') id: string,
  ): Promise<OrderResponseDto> {
    // Verify user is a vendor
    if (req.user.user_type !== 'VENDOR') {
      throw new Error('Only vendors can access vendor order endpoints');
    }

    return await this.orderService.getOrderById(id, req.user.vendor_id, req.user.user_type);
  }

  @Put(':id/status')
  @AccessControl({
    roles: [UserType.VENDOR],
    requireVendorOwnership: 'id'
  })
  @ApiOperation({ summary: 'Update order status' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully', type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid status transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Order does not belong to vendor' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateOrderStatus(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() updateDto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    return await this.orderService.updateOrderStatus(id, user.id, updateDto);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order as vendor' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully', type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - Order cannot be cancelled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Order does not belong to vendor' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancelOrder(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ): Promise<OrderResponseDto> {
    // Verify user is a vendor
    if (req.user.user_type !== 'VENDOR') {
      throw new Error('Only vendors can access vendor order endpoints');
    }

    return await this.orderService.cancelOrder(id, req.user.vendor_id, req.user.user_type, body.reason);
  }
} 