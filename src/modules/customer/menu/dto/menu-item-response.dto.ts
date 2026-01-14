import { ApiProperty } from '@nestjs/swagger';
import { MenuItem } from 'src/entities';

export class MenuItemWithDistanceDto extends MenuItem {
  @ApiProperty({
    description: 'Distance from the search location in kilometers. Null if vendor address coordinates are missing.',
    example: 2.5,
    required: false,
    nullable: true
  })
  distance?: number | null;
}

export class SearchMenuItemsResponseDto {
  @ApiProperty({
    description: 'Array of menu items with distance information when coordinates are provided in search',
    type: [MenuItemWithDistanceDto]
  })
  items: MenuItemWithDistanceDto[];

  @ApiProperty({
    description: 'Total number of menu items matching the search criteria',
    example: 150
  })
  total: number;
} 