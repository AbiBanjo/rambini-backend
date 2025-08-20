import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Param,
  Query,
  Delete,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { VendorService } from '../services/vendor.service';
import { CreateVendorDto } from '../dto/create-vendor.dto';
import { 
  MarkUnderReviewDto, 
  ApproveDocumentsDto, 
  RejectDocumentsDto,
  VerificationResponseDto 
} from '../dto/admin-verification.dto';
import { Vendor, DocumentVerificationStatus, User } from '../../../entities';
import { GetUser } from '@/common/decorators/get-user.decorator';

@ApiTags('vendor')
@Controller('vendor')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('documents', 10)) // Allow up to 10 documents
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create vendor profile with documents' })
  @ApiResponse({ status: 201, description: 'Vendor profile created successfully' })
  @ApiResponse({ status: 409, description: 'User already has a vendor profile' })
  async createVendor(
    @GetUser() user: User,
    @Body() createVendorDto: CreateVendorDto,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB per file
          new FileTypeValidator({ fileType: '.(pdf|jpg|jpeg|png)' }),
        ],
        fileIsRequired: true, // Documents are optional
      }),
    )
    documents?: Express.Multer.File[],
  ): Promise<Vendor> {
    return await this.vendorService.createVendorWithDocuments(
      user.id, 
      createVendorDto, 
      documents || []
    );
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user vendor profile' })
  @ApiResponse({ status: 200, description: 'Vendor profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Vendor profile not found' })
  async getVendorProfile(@Request() req): Promise<Vendor> {
    const vendor = await this.vendorService.getVendorByUserId(req.user.id);
    if (!vendor) {
      throw new Error('Vendor profile not found');
    }
    return vendor;
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update vendor profile' })
  @ApiResponse({ status: 200, description: 'Vendor profile updated successfully' })
  @ApiResponse({ status: 404, description: 'Vendor profile not found' })
  async updateVendorProfile(
    @Request() req,
    @Body() updateData: Partial<CreateVendorDto>,
  ): Promise<Vendor> {
    return await this.vendorService.updateVendor(req.user.id, updateData);
  }

  @Post('activate')
  @ApiOperation({ summary: 'Activate vendor profile' })
  @ApiResponse({ status: 200, description: 'Vendor profile activated successfully' })
  async activateVendor(@Request() req): Promise<Vendor> {
    return await this.vendorService.activateVendor(req.user.id);
  }

  @Post('deactivate')
  @ApiOperation({ summary: 'Deactivate vendor profile' })
  @ApiResponse({ status: 200, description: 'Vendor profile deactivated successfully' })
  async deactivateVendor(@Request() req): Promise<Vendor> {
    return await this.vendorService.deactivateVendor(req.user.id);
  }

  @Get('documents')
  @ApiOperation({ summary: 'Get current vendor documents' })
  @ApiResponse({ status: 200, description: 'Vendor documents retrieved successfully' })
  async getVendorDocuments(@Request() req): Promise<any[]> {
    const vendor = await this.vendorService.getVendorByUserId(req.user.id);
    if (!vendor) {
      throw new Error('Vendor profile not found');
    }
    return await this.vendorService.getVendorDocuments(vendor.id);
  }

  @Post('documents')
  @UseInterceptors(FilesInterceptor('documents', 5)) // Allow up to 5 additional documents
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload additional documents to vendor profile' })
  @ApiResponse({ status: 200, description: 'Documents uploaded successfully' })
  async uploadAdditionalDocuments(
    @Request() req,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB per file
          new FileTypeValidator({ fileType: '.(pdf|jpg|jpeg|png)' }),
        ],
        fileIsRequired: true,
      }),
    )
    documents: Express.Multer.File[],
  ): Promise<{ message: string; uploadedCount: number }> {
    const vendor = await this.vendorService.getVendorByUserId(req.user.id);
    if (!vendor) {
      throw new Error('Vendor profile not found');
    }

    // Handle document uploads
    await this.vendorService['handleDocumentUploads'](vendor.id, documents);
    
    return {
      message: 'Additional documents uploaded successfully',
      uploadedCount: documents.length,
    };
  }

  @Delete('documents/:filename')
  @ApiParam({ name: 'filename', description: 'Document filename to remove' })
  @ApiOperation({ summary: 'Remove a document from vendor profile' })
  @ApiResponse({ status: 200, description: 'Document removed successfully' })
  async removeDocument(
    @Request() req,
    @Param('filename') filename: string,
  ): Promise<{ message: string; removed: boolean }> {
    const vendor = await this.vendorService.getVendorByUserId(req.user.id);
    if (!vendor) {
      throw new Error('Vendor profile not found');
    }

    const removed = await this.vendorService.removeDocumentFromVendor(vendor.id, filename);
    
    return {
      message: removed ? 'Document removed successfully' : 'Document not found',
      removed,
    };
  }

  // Admin endpoints for document verification
  @Get('admin/all')
  @ApiOperation({ summary: 'Get all vendors (Admin only)' })
  @ApiResponse({ status: 200, description: 'All vendors retrieved successfully', type: [VerificationResponseDto] })
  async getAllVendors(): Promise<Vendor[]> {
    // TODO: Add admin role check
    return await this.vendorService.getAllVendors();
  }

  @Get('admin/pending')
  @ApiOperation({ summary: 'Get vendors pending verification (Admin only)' })
  @ApiResponse({ status: 200, description: 'Pending vendors retrieved successfully', type: [VerificationResponseDto] })
  async getPendingVerifications(): Promise<Vendor[]> {
    // TODO: Add admin role check
    return await this.vendorService.getPendingVerifications();
  }

  @Get('admin/under-review')
  @ApiOperation({ summary: 'Get vendors under review (Admin only)' })
  @ApiResponse({ status: 200, description: 'Under review vendors retrieved successfully', type: [VerificationResponseDto] })
  async getUnderReviewVendors(): Promise<Vendor[]> {
    // TODO: Add admin role check
    return await this.vendorService.getUnderReviewVendors();
  }

  @Get('admin/stats')
  @ApiOperation({ summary: 'Get verification statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Verification stats retrieved successfully' })
  async getVerificationStats() {
    // TODO: Add admin role check
    return await this.vendorService.getVerificationStats();
  }

  @Post('admin/:id/under-review')
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiOperation({ summary: 'Mark vendor as under review (Admin only)' })
  @ApiResponse({ status: 200, description: 'Vendor marked as under review', type: VerificationResponseDto })
  async markVendorUnderReview(
    @Param('id') vendorId: string,
    @Request() req,
    @Body() body: MarkUnderReviewDto,
  ): Promise<Vendor> {
    // TODO: Add admin role check
    return await this.vendorService.markVendorUnderReview(vendorId, req.user.id, body.notes);
  }

  @Post('admin/:id/approve')
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiOperation({ summary: 'Approve vendor documents (Admin only)' })
  @ApiResponse({ status: 200, description: 'Vendor documents approved', type: VerificationResponseDto })
  async approveVendorDocuments(
    @Param('id') vendorId: string,
    @Request() req,
    @Body() body: ApproveDocumentsDto,
  ): Promise<Vendor> {
    // TODO: Add admin role check
    return await this.vendorService.approveVendorDocuments(vendorId, req.user.id, body.notes);
  }

  @Post('admin/:id/reject')
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiOperation({ summary: 'Reject vendor documents (Admin only)' })
  @ApiResponse({ status: 200, description: 'Vendor documents rejected', type: VerificationResponseDto })
  async rejectVendorDocuments(
    @Param('id') vendorId: string,
    @Request() req,
    @Body() body: RejectDocumentsDto,
  ): Promise<Vendor> {
    // TODO: Add admin role check
    return await this.vendorService.rejectVendorDocuments(vendorId, req.user.id, body.reason, body.notes);
  }

  @Post('admin/:id/reset-verification')
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiOperation({ summary: 'Reset vendor verification status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Vendor verification reset', type: VerificationResponseDto })
  async resetVendorVerification(@Param('id') vendorId: string): Promise<Vendor> {
    // TODO: Add admin role check
    return await this.vendorService.resetVendorVerification(vendorId);
  }
} 