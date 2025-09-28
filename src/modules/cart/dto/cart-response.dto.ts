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

  @ApiProperty({ description: 'Whether this cart item has a tracking order' })
  tracking_order: boolean;
}

export class CartResponseDto {
  @ApiProperty({ description: 'User ID' })
  user_id: string;

  @ApiProperty({ description: 'Array of cart items' })
  items: CartItemResponseDto[];

  @ApiProperty({ description: 'Total number of items in cart' })
  total_items?: number;

  @ApiProperty({ description: 'Subtotal amount' })
  subtotal?: number;

  @ApiProperty({ description: 'Total amount including fees' })
  total_amount?: number;

  @ApiProperty({ description: 'Whether cart is empty' })
  is_empty?: boolean;

  @ApiProperty({ description: 'Number of unique vendors in cart' })
  vendor_count?: number;
}

export class VendorCartGroupDto {
  @ApiProperty({ description: 'Vendor ID' })
  vendor_id: string;

  @ApiProperty({ description: 'Vendor business name' })
  vendor_name: string;

  @ApiProperty({ description: 'Array of cart items from this vendor' })
  items: CartItemResponseDto[];

  @ApiProperty({ description: 'Total number of items from this vendor' })
  vendor_total_items: number;

  @ApiProperty({ description: 'Subtotal for this vendor' })
  vendor_subtotal: number;
}

export class GroupedCartResponseDto {
  @ApiProperty({ description: 'User ID' })
  user_id: string;

  @ApiProperty({ description: 'Cart items grouped by vendor' })
  vendors: VendorCartGroupDto[];

  @ApiProperty({ description: 'Total number of items across all vendors' })
  total_items: number;

  @ApiProperty({ description: 'Subtotal amount across all vendors' })
  subtotal: number;

  @ApiProperty({ description: 'Total amount including fees' })
  total_amount: number;

  @ApiProperty({ description: 'Whether cart is empty' })
  is_empty: boolean;

  @ApiProperty({ description: 'Number of unique vendors in cart' })
  vendor_count: number;
}

export class VendorCartResponseDto {
  @ApiProperty({ description: 'User ID' })
  user_id: string;

  @ApiProperty({ description: 'Vendor ID' })
  vendor_id: string;

  @ApiProperty({ description: 'Vendor business name' })
  vendor_name: string;

  @ApiProperty({ description: 'Array of cart items from this vendor' })
  items: CartItemResponseDto[];

  @ApiProperty({ description: 'Total number of items from this vendor' })
  total_items: number;

  @ApiProperty({ description: 'Subtotal for this vendor' })
  subtotal: number;

  @ApiProperty({ description: 'Whether vendor cart is empty' })
  is_empty: boolean;
} 