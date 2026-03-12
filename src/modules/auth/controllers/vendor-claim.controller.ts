import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { VendorClaimService } from '../services/vendor-claim.service';
import { VerifyVendorClaimDto, CompleteVendorClaimDto } from '../dto';

@ApiTags('Auth - Vendor Claim')
@Controller('auth/vendor-claim')
export class VendorClaimController {
  constructor(private readonly vendorClaimService: VendorClaimService) {}

  @Post('verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify vendor claim token' })
  @ApiResponse({ status: 200, description: 'Claim token verified' })
  async verify(@Body() dto: VerifyVendorClaimDto) {
    return await this.vendorClaimService.verifyClaimToken(dto.token);
  }

  @Post('complete')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete vendor claim by setting password' })
  @ApiResponse({ status: 200, description: 'Vendor account claimed' })
  async complete(@Body() dto: CompleteVendorClaimDto) {
    return await this.vendorClaimService.completeClaim(dto.token, dto.password);
  }
}
