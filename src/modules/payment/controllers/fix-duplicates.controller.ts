// File: src/modules/payment/controllers/fix-duplicates.controller.ts

import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { FixDuplicateCreditsService } from '../services/fix-duplicate-credits.service';

@ApiTags('Admin - Fix Duplicates')
@Controller('admin/fix-duplicates')
// @UseGuards(JwtAuthGuard) // Uncomment this if you want auth protection
// @ApiBearerAuth()
export class FixDuplicatesController {
  constructor(
    private readonly fixDuplicateCreditsService: FixDuplicateCreditsService,
  ) {}

  @Get('check/:vendorUserId')
  @ApiOperation({ summary: 'Check for duplicate credits (read-only)' })
  async checkDuplicates(@Param('vendorUserId') vendorUserId: string) {
    const duplicates = await this.fixDuplicateCreditsService.checkForDuplicates(
      vendorUserId,
    );

    return {
      vendorUserId,
      duplicatesFound: duplicates.length,
      duplicates,
      message: duplicates.length > 0 
        ? `Found ${duplicates.length} duplicate payment(s). Use POST /api/v1/admin/fix-duplicates/fix/:vendorUserId to fix.`
        : 'No duplicates found.',
    };
  }

  @Get('verify/:vendorUserId/:referenceId')
  @ApiOperation({ summary: 'Verify detailed transaction history for a specific payment reference' })
  async verifyDuplicate(
    @Param('vendorUserId') vendorUserId: string,
    @Param('referenceId') referenceId: string,
  ) {
    return await this.fixDuplicateCreditsService.verifyDuplicateDetails(
      vendorUserId,
      referenceId,
    );
  }

  @Get('preview/:vendorUserId')
  @ApiOperation({ summary: 'Preview what will be fixed (detailed breakdown)' })
  async previewFix(@Param('vendorUserId') vendorUserId: string) {
    return await this.fixDuplicateCreditsService.previewFix(vendorUserId);
  }

  @Post('fix/:vendorUserId')
  @ApiOperation({ summary: 'Fix duplicate credits for a vendor' })
  async fixDuplicates(@Param('vendorUserId') vendorUserId: string) {
    const result = await this.fixDuplicateCreditsService.fixDuplicateCredits(
      vendorUserId,
    );

    return {
      vendorUserId,
      ...result,
      message: result.duplicatesFound > 0
        ? `Successfully fixed ${result.duplicatesFound} duplicate(s). Deducted ${result.amountToDeduct} from wallet. New balance: ${result.fixedBalance}`
        : 'No duplicates found to fix.',
    };
  }
}