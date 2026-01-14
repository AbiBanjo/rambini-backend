import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { CreateMenuItemDto } from './create-menu-item.dto';

export class CreateMenuItemWithFileDto extends CreateMenuItemDto {
  @ApiPropertyOptional({ 
    description: 'Image file for the menu item',
    type: 'string',
    format: 'binary'
  })
  @IsOptional()
  image?: Express.Multer.File;
} 