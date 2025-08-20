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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CartService } from '../services/cart.service';
import {
  AddToCartDto,
  UpdateCartItemDto,
  CartResponseDto,
  CartItemResponseDto,
} from '../dto';

@ApiTags('cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('add')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart successfully', type: CartItemResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - Item not available or invalid quantity' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async addToCart(
    @Request() req,
    @Body() addToCartDto: AddToCartDto,
  ): Promise<CartItemResponseDto> {
    return await this.cartService.addToCart(req.user.id, addToCartDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user cart' })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully', type: CartResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCart(@Request() req): Promise<CartResponseDto> {
    return await this.cartService.getCart(req.user.id);
  }

  @Get('validate')
  @ApiOperation({ summary: 'Validate cart items' })
  @ApiResponse({ status: 200, description: 'Cart validation completed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async validateCart(@Request() req) {
    return await this.cartService.validateCart(req.user.id);
  }

  @Get('item/:id')
  @ApiOperation({ summary: 'Get specific cart item' })
  @ApiParam({ name: 'id', description: 'Cart item ID' })
  @ApiResponse({ status: 200, description: 'Cart item retrieved successfully', type: CartItemResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async getCartItem(
    @Request() req,
    @Param('id') id: string,
  ): Promise<CartItemResponseDto> {
    return await this.cartService.getCartItemById(req.user.id, id);
  }

  @Put('item/:id')
  @ApiOperation({ summary: 'Update cart item' })
  @ApiParam({ name: 'id', description: 'Cart item ID' })
  @ApiResponse({ status: 200, description: 'Cart item updated successfully', type: CartItemResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async updateCartItem(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateCartItemDto,
  ): Promise<CartItemResponseDto> {
    return await this.cartService.updateCartItem(req.user.id, id, updateDto);
  }

  @Delete('item/:id')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'id', description: 'Cart item ID' })
  @ApiResponse({ status: 200, description: 'Item removed from cart successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async removeFromCart(
    @Request() req,
    @Param('id') id: string,
  ): Promise<void> {
    await this.cartService.removeFromCart(req.user.id, id);
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Clear entire cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async clearCart(@Request() req) {
    return await this.cartService.clearCart(req.user.id);
  }

  @Post('checkout/validate')
  @ApiOperation({ summary: 'Validate cart before checkout' })
  @ApiResponse({ status: 200, description: 'Cart validation for checkout completed' })
  @ApiResponse({ status: 400, description: 'Cart validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async validateCartForCheckout(@Request() req) {
    const validation = await this.cartService.validateCart(req.user.id);
    
    if (!validation.is_valid) {
      return {
        can_proceed: false,
        errors: validation.errors,
        invalid_items: validation.invalid_items,
        message: 'Cart contains invalid items that need to be resolved before checkout',
      };
    }

    return {
      can_proceed: true,
      summary: validation.summary,
      message: 'Cart is valid for checkout',
    };
  }
} 