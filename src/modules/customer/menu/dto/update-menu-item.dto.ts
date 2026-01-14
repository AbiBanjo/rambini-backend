import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUrl } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { CreateMenuItemDto } from './create-menu-item.dto';

export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) {
  @ApiPropertyOptional({ description: 'Image URL for the menu item' })
  @IsOptional()
  @IsUrl()
  image_url?: string;
} 