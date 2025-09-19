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
  CreateOrderDto,
  UpdateOrderStatusDto,
  OrderResponseDto,
  OrderFilterDto,
  CalculateOrderCostDto,
  OrderCostResponseDto,
} from '../dto';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { User } from '@/entities';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order from selected cart items' })
  @ApiResponse({ status: 201, description: 'Order created successfully', type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid cart items, single vendor requirement not met, or cart validation issues' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Delivery address or cart items not found' })
  async createOrder(
    @GetUser() user: User,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    return await this.orderService.createOrder(user.id, createOrderDto);
  }

  @Post('cost')
  @ApiOperation({ summary: 'Calculate order cost with delivery fees and addresses' })
  @ApiResponse({ status: 200, description: 'Order cost calculated successfully', type: OrderCostResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid cart items or missing delivery address for delivery orders' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Cart items, vendor, or delivery address not found' })
  async calculateOrderCost(
    @GetUser() user: User,
    @Body() calculateOrderCostDto: CalculateOrderCostDto,
  ): Promise<OrderCostResponseDto> {
    return await this.orderService.calculateOrderCost(user.id, calculateOrderCostDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get customer orders with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  async getCustomerOrders(
    @Request() req,
    @Query() filterDto: OrderFilterDto,
  ): Promise<{ orders: OrderResponseDto[]; total: number }> {
    return await this.orderService.getCustomerOrders(req.user.id, filterDto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get customer order statistics' })
  @ApiResponse({ status: 200, description: 'Order statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCustomerOrderStats(@Request() req) {
    return await this.orderService.getOrderStats(undefined, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully', type: OrderResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Order does not belong to user' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderById(
    @Request() req,
    @Param('id') id: string,
  ): Promise<OrderResponseDto> {
    return await this.orderService.getOrderById(id, req.user.id, req.user.user_type);
  }

  @Delete(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully', type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - Order cannot be cancelled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Order does not belong to user' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancelOrder(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ): Promise<OrderResponseDto> {
    return await this.orderService.cancelOrder(id, req.user.id, req.user.user_type, body.reason);
  }
} 