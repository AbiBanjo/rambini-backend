import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export enum BulkOperationType {
  TOGGLE_AVAILABILITY = 'TOGGLE_AVAILABILITY',
  TOGGLE_FEATURED = 'TOGGLE_FEATURED',
  UPDATE_CATEGORY = 'UPDATE_CATEGORY',
  DELETE_ITEMS = 'DELETE_ITEMS',
}

export class BulkMenuOperationDto {
  @ApiProperty({ description: 'Type of bulk operation to perform', enum: BulkOperationType })
  @IsEnum(BulkOperationType)
  operation_type: BulkOperationType;

  @ApiProperty({ description: 'Array of menu item IDs to operate on' })
  @IsArray()
  @IsString({ each: true })
  menu_item_ids: string[];

  @ApiPropertyOptional({ description: 'New value for boolean operations (availability, featured)' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  boolean_value?: boolean;

  @ApiPropertyOptional({ description: 'New category ID for category update operations' })
  @IsOptional()
  @IsString()
  new_category_id?: string;
} 