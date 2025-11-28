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

  @ApiProperty({ description: 'Service fee for this item' })
  service_fee: number;

  @ApiProperty({ description: 'When added to cart' })
  created_at: Date;

  @ApiProperty({ description: 'When last updated' })
  updated_at: Date;

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

  @ApiPropertyOptional({ description: 'Order ID if this cart item is part of an order' })
  order_id?: string;

  @ApiPropertyOptional({ description: 'Address ID if this cart item is part of an order' })
  address_id?: string;

  @ApiPropertyOptional({ description: 'Address name if this cart item is part of an order' })
  address_name?: string;

  @ApiPropertyOptional({ description: 'Address phone if this cart item is part of an order' })
  address_phone?: string;

  @ApiPropertyOptional({ description: 'Whether this is a pre-order item' })
  is_preOrder?: boolean;
}

export class CartResponseDto {
  @ApiProperty({ description: 'User ID' })
  user_id: string;

  @ApiProperty({ description: 'Array of cart items' })
  items: CartItemResponseDto[];

  @ApiPropertyOptional({ description: 'Total number of items in cart' })
  total_items?: number;

  @ApiPropertyOptional({ description: 'Subtotal amount' })
  subtotal?: number;

  @ApiPropertyOptional({ description: 'Total amount including fees' })
  total_amount?: number;

  @ApiPropertyOptional({ description: 'Whether cart is empty' })
  is_empty?: boolean;

  @ApiPropertyOptional({ description: 'Number of unique vendors in cart' })
  vendor_count?: number;
}

export class AppliedCouponDto {
  @ApiProperty({ description: 'Vendor ID this coupon applies to' })
  vendor_id: string;

  @ApiProperty({ description: 'Coupon code' })
  coupon_code: string;

  @ApiProperty({ description: 'Discount amount' })
  discount_amount: number;
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

  @ApiPropertyOptional({ description: 'Discount amount for this vendor from applied coupon' })
  vendor_discount?: number;
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

  @ApiProperty({ description: 'Service fee amount' })
  service_fee: number;

  @ApiProperty({ description: 'Total discount from applied coupons' })
  discount: number;

  @ApiProperty({ description: 'Total amount including fees and discounts' })
  total_amount: number;

  @ApiProperty({ description: 'Whether cart is empty' })
  is_empty: boolean;

  @ApiProperty({ description: 'Number of unique vendors in cart' })
  vendor_count: number;

  @ApiProperty({ description: 'List of applied coupons', type: [AppliedCouponDto] })
  applied_coupons: AppliedCouponDto[];
}

export class VendorCouponDto {
  @ApiProperty({ description: 'Coupon code' })
  code: string;

  @ApiProperty({ description: 'Discount amount' })
  discount_amount: number;
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

  @ApiProperty({ description: 'Service fee for this vendor' })
  service_fee: number;

  @ApiProperty({ description: 'Discount amount from applied coupon' })
  discount: number;

  @ApiProperty({ description: 'Total amount including fees and discount' })
  total_amount: number;

  @ApiProperty({ description: 'Whether vendor cart is empty' })
  is_empty: boolean;

  @ApiPropertyOptional({ description: 'Applied coupon details', type: VendorCouponDto })
  applied_coupon?: VendorCouponDto;
}