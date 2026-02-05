import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MenuLikeService } from '../services/menu-like.service';
import { VendorLikesSummaryDto } from '../dto/menu-like.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { VendorService } from 'src/modules/vendor/services/vendor.service';
import { User } from 'src/entities';

@ApiTags('Vendor Menu Likes')
@Controller('vendor/menu-likes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VendorMenuLikeController {
  constructor(
    private readonly menuLikeService: MenuLikeService,
    private readonly vendorService: VendorService,
  ) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get like statistics for vendor menu items',
    description:
      'Returns comprehensive like statistics including total likes, likes per menu item, and most liked items. Only accessible by the vendor.',
  })
  @ApiResponse({
    status: 200,
    description: 'Vendor like statistics',
    type: VendorLikesSummaryDto,
  })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async getVendorLikeStats(@Req() req: { user: User }): Promise<VendorLikesSummaryDto> {
    const userId = req.user.id; // ✅ Changed from req.user.userId to req.user.id

    // Get vendor profile from userId
    const vendor = await this.vendorService.getVendorByUserId(userId);

    return await this.menuLikeService.getVendorLikeStats(vendor.id);
  }
}