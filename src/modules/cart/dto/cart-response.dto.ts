import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartItemResponseDto {
  @ApiProperty({ description: 'Cart item ID' })
  id: string;

  @ApiProperty({ description: 'Menu item ID' })
  menu_item_id: string;

  @ApiProperty({ description: 'Quantity in cart' })
  quantity: number;

  @ApiProperty({ description: 'Unit price' })
  unit_price: number;

  @ApiProperty({ description: 'Total price for this item' })
  total_price: number;


  @ApiProperty({ description: 'When added to cart' })
  created_at: Date;

  @ApiProperty({ description: 'When last updated' })
  updated_at: Date;

  // Menu item details
  @ApiProperty({ description: 'Menu item name' })
  menu_item_name: string;

  @ApiPropertyOptional({ description: 'Menu item image' })
  menu_item_image?: string;

  @ApiProperty({ description: 'Vendor ID' })
  vendor_id: string;

  @ApiProperty({ description: 'Vendor name' })
  vendor_name: string;

  @ApiProperty({ description: 'Category ID' })
  category_id: string;

  @ApiProperty({ description: 'Category name' })
  category_name: string;
}

export class CartResponseDto {
  @ApiProperty({ description: 'User ID' })
  user_id: string;

  @ApiProperty({ description: 'Array of cart items' })
  items: CartItemResponseDto[];

  @ApiProperty({ description: 'Total number of items in cart' })
  total_items: number;

  @ApiProperty({ description: 'Subtotal amount' })
  subtotal: number;

  @ApiProperty({ description: 'Total amount including fees' })
  total_amount: number;

  @ApiProperty({ description: 'Whether cart is empty' })
  is_empty: boolean;

  @ApiProperty({ description: 'Number of unique vendors in cart' })
  vendor_count: number;
} 