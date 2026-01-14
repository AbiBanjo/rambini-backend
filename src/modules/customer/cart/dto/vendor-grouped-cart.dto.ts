import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CartItemResponseDto } from "./cart-response.dto";

export class VendorGroupDto {
  @ApiProperty({ description: "Vendor ID" })
  vendor_id: string;

  @ApiProperty({ description: "Vendor business name" })
  vendor_name: string;

  @ApiPropertyOptional({ description: "Vendor logo URL" })
  vendor_logo?: string;

  @ApiProperty({ description: "Array of cart items from this vendor" })
  items: CartItemResponseDto[];

  @ApiProperty({ description: "Total number of items from this vendor" })
  total_items: number;

  @ApiProperty({ description: "Subtotal for this vendor" })
  subtotal: number;

  @ApiProperty({ description: "Number of unique menu items from this vendor" })
  unique_items: number;
}

export class VendorGroupedCartResponseDto {
  @ApiProperty({ description: "User ID" })
  user_id: string;

  @ApiProperty({ description: "Array of vendors with their cart items" })
  vendors: VendorGroupDto[];

  @ApiProperty({ description: "Total number of items across all vendors" })
  total_items: number;

  @ApiProperty({ description: "Total subtotal across all vendors" })
  total_subtotal: number;

  @ApiProperty({ description: "Number of unique vendors" })
  vendor_count: number;

  @ApiProperty({ description: "Whether cart is empty" })
  is_empty: boolean;
}
