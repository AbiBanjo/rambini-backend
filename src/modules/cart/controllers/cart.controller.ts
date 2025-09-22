import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request ,
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
  GroupedCartResponseDto,
  VendorCartResponseDto,
} from '../dto';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { User } from '@/entities';

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
    @GetUser() user: User,
    @Body() addToCartDto: AddToCartDto,
  ): Promise<CartItemResponseDto> {
    return await this.cartService.addToCart(user.id, addToCartDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user cart' })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully', type: CartResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCart(@GetUser() user: User,): Promise<CartResponseDto> {
    return await this.cartService.getCart(user.id);
  }

  @Get('grouped')
  @ApiOperation({ summary: 'Get user cart grouped by vendor' })
  @ApiResponse({ status: 200, description: 'Grouped cart retrieved successfully', type: GroupedCartResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCartGroupedByVendor(@GetUser() user: User): Promise<GroupedCartResponseDto> {
    return await this.cartService.getCartGroupedByVendor(user.id);
  }

  @Get('inactive')
  @ApiOperation({ summary: 'Get user inactive cart items' })
  @ApiResponse({ status: 200, description: 'Inactive cart retrieved successfully', type: CartResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getInactiveCart(@GetUser() user: User): Promise<CartResponseDto> {
    return await this.cartService.getCart(user.id, false);
  }

  @Get('inactive/grouped')
  @ApiOperation({ summary: 'Get user inactive cart items grouped by vendor' })
  @ApiResponse({ status: 200, description: 'Inactive grouped cart retrieved successfully', type: GroupedCartResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getInactiveCartGroupedByVendor(@GetUser() user: User): Promise<GroupedCartResponseDto> {
    return await this.cartService.getCartGroupedByVendor(user.id, false);
  }

  @Get('vendor/:vendorId')
  @ApiOperation({ summary: 'Get user active cart items by vendor ID' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiResponse({ status: 200, description: 'Vendor cart retrieved successfully', type: VendorCartResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCartByVendor(
    @GetUser() user: User,
    @Param('vendorId') vendorId: string,
  ): Promise<VendorCartResponseDto> {
    return await this.cartService.getCartByVendor(user.id, vendorId);
  }

  @Get('vendor/:vendorId/inactive')
  @ApiOperation({ summary: 'Get user inactive cart items by vendor ID' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiResponse({ status: 200, description: 'Inactive vendor cart retrieved successfully', type: VendorCartResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getInactiveCartByVendor(
    @GetUser() user: User,
    @Param('vendorId') vendorId: string,
  ): Promise<VendorCartResponseDto> {
    return await this.cartService.getCartByVendor(user.id, vendorId, false);
  }

  @Get('validate')
  @ApiOperation({ summary: 'Validate cart items' })
  @ApiResponse({ status: 200, description: 'Cart validation completed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async validateCart(@GetUser() user: User) {
    return await this.cartService.validateCart(user.id);
  }

  @Get('item/:id')
  @ApiOperation({ summary: 'Get specific cart item' })
  @ApiParam({ name: 'id', description: 'Cart item ID' })
  @ApiResponse({ status: 200, description: 'Cart item retrieved successfully', type: CartItemResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async getCartItem(
    @GetUser() user: User,
    @Param('id') id: string,
  ): Promise<CartItemResponseDto> {
    return await this.cartService.getCartItemById(user.id, id);
  }

  @Put('item/:id')
  @ApiOperation({ summary: 'Update cart item' })
  @ApiParam({ name: 'id', description: 'Cart item ID' })
  @ApiResponse({ status: 200, description: 'Cart item updated successfully', type: CartItemResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async updateCartItem(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() updateDto: UpdateCartItemDto,
  ): Promise<CartItemResponseDto> {
    return await this.cartService.updateCartItem(user.id, id, updateDto);
  }

  @Delete('item/:id')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'id', description: 'Cart item ID' })
  @ApiResponse({ status: 200, description: 'Item removed from cart successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async removeFromCart(
    @GetUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    await this.cartService.removeFromCart(user.id, id);
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Clear entire cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async clearCart(@GetUser() user: User) {
    return await this.cartService.clearCart(user.id);
  }

  @Post('checkout/validate')
  @ApiOperation({ summary: 'Validate cart before checkout' })
  @ApiResponse({ status: 200, description: 'Cart validation for checkout completed' })
  @ApiResponse({ status: 400, description: 'Cart validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async validateCartForCheckout(@GetUser() user: User) {
    const validation = await this.cartService.validateCart(user.id);
    
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