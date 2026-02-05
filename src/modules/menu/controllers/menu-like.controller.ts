import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { MenuLikeService } from '../services/menu-like.service';
import {
  ToggleLikeResponseDto,
  LikedMenuItemsResponseDto,
  LikedMenuItemsQueryDto,
} from '../dto/menu-like.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { User } from 'src/entities';

@ApiTags('Menu Likes')
@Controller('menu-likes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MenuLikeController {
  private readonly logger = new Logger(MenuLikeController.name);

  constructor(private readonly menuLikeService: MenuLikeService) {}

  @Post(':menuItemId/toggle')
  @ApiOperation({
    summary: 'Toggle like on a menu item',
    description:
      'Like a menu item if not already liked, unlike if already liked. This is the recommended endpoint for most use cases.',
  })
  @ApiParam({
    name: 'menuItemId',
    description: 'ID of the menu item to toggle like',
  })
  @ApiResponse({
    status: 200,
    description: 'Like toggled successfully',
    type: ToggleLikeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async toggleLike(
    @Param('menuItemId') menuItemId: string,
    @Req() req: { user: User },
  ): Promise<ToggleLikeResponseDto> {
    const userId = req.user.id; // ✅ Changed from req.user.userId to req.user.id
    return await this.menuLikeService.toggleLike(userId, menuItemId);
  }

  @Post(':menuItemId')
  @ApiOperation({
    summary: 'Like a menu item',
    description:
      'Add a like to a menu item. Returns error if already liked. Use toggle endpoint for better UX.',
  })
  @ApiParam({ name: 'menuItemId', description: 'ID of the menu item to like' })
  @ApiResponse({
    status: 201,
    description: 'Menu item liked successfully',
    type: ToggleLikeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  @ApiResponse({ status: 409, description: 'Already liked' })
  async likeMenuItem(
    @Param('menuItemId') menuItemId: string,
    @Req() req: { user: User },
  ): Promise<ToggleLikeResponseDto> {
    const userId = req.user.id; // ✅ Changed from req.user.userId to req.user.id
    return await this.menuLikeService.likeMenuItem(userId, menuItemId);
  }

  @Delete(':menuItemId')
  @ApiOperation({
    summary: 'Unlike a menu item',
    description:
      'Remove a like from a menu item. Returns error if not liked. Use toggle endpoint for better UX.',
  })
  @ApiParam({
    name: 'menuItemId',
    description: 'ID of the menu item to unlike',
  })
  @ApiResponse({
    status: 200,
    description: 'Menu item unliked successfully',
    type: ToggleLikeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  @ApiResponse({ status: 400, description: 'Not liked' })
  async unlikeMenuItem(
    @Param('menuItemId') menuItemId: string,
    @Req() req: { user: User },
  ): Promise<ToggleLikeResponseDto> {
    const userId = req.user.id; // ✅ Changed from req.user.userId to req.user.id
    return await this.menuLikeService.unlikeMenuItem(userId, menuItemId);
  }

  @Get('my-likes')
  @ApiOperation({
    summary: 'Get all menu items liked by current user',
    description:
      'Returns paginated list of menu items that the current user has liked, ordered by most recently liked.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of liked menu items',
    type: LikedMenuItemsResponseDto,
  })
  async getMyLikedMenuItems(
    @Query() query: LikedMenuItemsQueryDto,
    @Req() req: { user: User },
  ): Promise<LikedMenuItemsResponseDto> {
    const userId = req.user.id; // ✅ Changed from req.user.userId to req.user.id
    return await this.menuLikeService.getUserLikedMenuItems(userId, query);
  }

  @Get(':menuItemId/status')
  @ApiOperation({
    summary: 'Check if current user has liked a menu item',
    description: 'Returns boolean indicating if user has liked the menu item.',
  })
  @ApiParam({
    name: 'menuItemId',
    description: 'ID of the menu item to check',
  })
  @ApiResponse({
    status: 200,
    description: 'Like status',
    schema: {
      type: 'object',
      properties: {
        is_liked: { type: 'boolean', example: true },
        like_count: { type: 'number', example: 42 },
      },
    },
  })
  async getLikeStatus(
    @Param('menuItemId') menuItemId: string,
    @Req() req: { user: User },
  ): Promise<{ is_liked: boolean; like_count: number }> {
    const userId = req.user.id; // ✅ Changed from req.user.userId to req.user.id
    const isLiked = await this.menuLikeService.hasUserLiked(userId, menuItemId);
    const likeCount = await this.menuLikeService.getMenuItemLikeCount(
      menuItemId,
    );

    return {
      is_liked: isLiked,
      like_count: likeCount,
    };
  }
}