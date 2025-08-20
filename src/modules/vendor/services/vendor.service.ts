import { Injectable, Logger, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor, DocumentVerificationStatus } from '../../../entities';
import { CreateVendorDto } from '../dto/create-vendor.dto';
import { AddressService } from '../../user/services/address.service';
import { AddressType } from '../../../entities/address.entity';
import { uploadFileToS3, validateFileForS3 } from '../../../utils/helpers';
import { ErrorHandlerService } from '../../../common/services';

@Injectable()
export class VendorService {
  private readonly logger = new Logger(VendorService.name);

  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    private readonly addressService: AddressService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  async createVendor(userId: string, createVendorDto: CreateVendorDto): Promise<Vendor> {
    // Check if user already has a vendor profile
    const existingVendor = await this.vendorRepository.findOne({
      where: { user_id: userId }
    });

    if (existingVendor) {
      throw new ConflictException('User already has a vendor profile');
    }

    // Create vendor address using address service
    const address = await this.addressService.createAddress(userId, {
      address_line_1: createVendorDto.address_line_1,
      address_line_2: createVendorDto.address_line_2,
      city: createVendorDto.city,
      state: createVendorDto.state,
      postal_code: createVendorDto.postal_code,
      country: createVendorDto.country || 'NG',
      latitude: createVendorDto.latitude,
      longitude: createVendorDto.longitude,
      address_type: AddressType.VENDOR,
      is_default: false, // Vendor address is not default
    });

    // Create vendor profile
    const vendor = this.vendorRepository.create({
      user_id: userId,
      business_name: createVendorDto.business_name,
      address_id: address.id,
      is_active: true,
      is_accepting_orders: false, // Start with orders disabled until approved
      document_verification_status: DocumentVerificationStatus.PENDING,
    });

    return await this.vendorRepository.save(vendor);
  }

  async createVendorWithDocuments(
    userId: string, 
    createVendorDto: CreateVendorDto, 
    documents: Express.Multer.File[]
  ): Promise<Vendor> {
    try {
      // Check if user already has a vendor profile
      const existingVendor = await this.vendorRepository.findOne({
        where: { user_id: userId }
      });

      if (existingVendor) {
        throw new ConflictException('User already has a vendor profile');
      }

      // Create vendor address using address service
      const address = await this.addressService.createAddress(userId, {
        address_line_1: createVendorDto.address_line_1,
        address_line_2: createVendorDto.address_line_2,
        city: createVendorDto.city,
        state: createVendorDto.state,
        postal_code: createVendorDto.postal_code,
        country: createVendorDto.country || 'NG',
        latitude: createVendorDto.latitude,
        longitude: createVendorDto.longitude,
        address_type: AddressType.VENDOR,
        is_default: false, // Vendor address is not default
      });

      // Create vendor profile
      const vendor = this.vendorRepository.create({
        user_id: userId,
        business_name: createVendorDto.business_name,
        address_id: address.id,
        is_active: true,
        is_accepting_orders: false, // Start with orders disabled until approved
        document_verification_status: DocumentVerificationStatus.PENDING,
      });

      // Save vendor first
      const savedVendor = await this.vendorRepository.save(vendor);

      // Handle document uploads if any
      if (documents && documents.length > 0) {
        await this.handleDocumentUploads(savedVendor.id, documents);
        this.logger.log(`Vendor ${savedVendor.id} created with ${documents.length} documents`);
      } else {
        this.logger.log(`Vendor ${savedVendor.id} created without documents`);
      }

      return savedVendor;
    } catch (error) {
      // Use the error handler service for database errors
      if (this.errorHandler.isDatabaseError(error)) {
        this.errorHandler.logError(error, { userId, createVendorDto });
        throw this.errorHandler.createDatabaseException(error);
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  private async handleDocumentUploads(vendorId: string, documents: Express.Multer.File[]): Promise<void> {
    const bucketName = process.env.AWS_S3_BUCKET_NAME || 'rambini-vendor-documents';
    const uploadResults: Array<{ success: boolean; filename: string; url?: string; error?: string }> = [];
    const uploadedDocuments: any[] = [];

    for (const document of documents) {
      try {
        // Validate file before upload
        const validation = validateFileForS3(document);
        if (!validation.isValid) {
          this.logger.warn(`Document validation failed for vendor ${vendorId}: ${validation.errors.join(', ')}`);
          uploadResults.push({
            success: false,
            filename: document.originalname,
            error: validation.errors.join(', '),
          });
          continue;
        }

        // Upload to S3
        const result = await uploadFileToS3(document, bucketName, `vendors/${vendorId}/documents`, {
          acl: 'private', // Keep documents private
          metadata: {
            vendorId,
            documentType: 'vendor_verification',
            uploadedBy: vendorId,
          },
        });

        if (result.success) {
          this.logger.log(`Document uploaded successfully for vendor ${vendorId}: ${document.originalname} -> ${result.url}`);
          uploadResults.push({
            success: true,
            filename: document.originalname,
            url: result.url,
          });

          // Store document metadata for vendor entity
          uploadedDocuments.push({
            filename: result.key?.split('/').pop() || document.originalname,
            originalName: document.originalname,
            s3Key: result.key || '',
            s3Url: result.url || '',
            fileSize: document.size,
            mimeType: document.mimetype,
            documentType: 'vendor_verification',
            uploadedAt: new Date(),
            uploadedBy: vendorId,
            isVerified: false,
          });
        } else {
          this.logger.error(`Failed to upload document for vendor ${vendorId}: ${document.originalname} - ${result.error}`);
          uploadResults.push({
            success: false,
            filename: document.originalname,
            error: result.error,
          });
        }
      } catch (error) {
        this.logger.error(`Error processing document upload for vendor ${vendorId}: ${document.originalname}`, error);
        uploadResults.push({
          success: false,
          filename: document.originalname,
          error: error.message || 'Unknown error occurred',
        });
      }
    }

    // Update vendor entity with uploaded documents if any
    if (uploadedDocuments.length > 0) {
      try {
        const vendor = await this.vendorRepository.findOne({ where: { id: vendorId } });
        if (vendor) {
          // Initialize documents array if it doesn't exist
          if (!vendor.documents) {
            vendor.documents = [];
          }
          
          // Add new documents
          vendor.documents.push(...uploadedDocuments);
          
          // Save updated vendor
          await this.vendorRepository.save(vendor);
          this.logger.log(`Updated vendor ${vendorId} with ${uploadedDocuments.length} new documents`);
        }
      } catch (error) {
        this.logger.error(`Failed to update vendor ${vendorId} with document metadata:`, error);
      }
    }

    // Log summary of upload results
    const successfulUploads = uploadResults.filter(r => r.success).length;
    const failedUploads = uploadResults.filter(r => !r.success).length;
    
    this.logger.log(`Document upload summary for vendor ${vendorId}: ${successfulUploads} successful, ${failedUploads} failed`);
    
    if (failedUploads > 0) {
      this.logger.warn(`Failed uploads for vendor ${vendorId}:`, 
        uploadResults.filter(r => !r.success).map(r => `${r.filename}: ${r.error}`)
      );
    }
  }

  async getVendorByUserId(userId: string): Promise<Vendor | null> {
    return await this.vendorRepository.findOne({
      where: { user_id: userId },
      relations: ['address'], // Include address details
    });
  }

  async updateVendor(userId: string, updateData: Partial<CreateVendorDto>): Promise<Vendor> {
    const vendor = await this.getVendorByUserId(userId);
    
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // Update vendor business name if provided
    if (updateData.business_name) {
      vendor.business_name = updateData.business_name;
    }

    // Update address if any address fields are provided
    if (updateData.address_line_1 || updateData.city || updateData.state) {
      const addressUpdateData = {
        address_line_1: updateData.address_line_1,
        address_line_2: updateData.address_line_2,
        city: updateData.city,
        state: updateData.state,
        postal_code: updateData.postal_code,
        country: updateData.country,
        latitude: updateData.latitude,
        longitude: updateData.longitude,
        landmark: updateData.landmark,
      };

      // Remove undefined values
      Object.keys(addressUpdateData).forEach(key => {
        if (addressUpdateData[key] === undefined) {
          delete addressUpdateData[key];
        }
      });

      if (Object.keys(addressUpdateData).length > 0) {
        await this.addressService.updateAddress(userId, vendor.address_id, addressUpdateData);
      }
    }

    return await this.vendorRepository.save(vendor);
  }

  async activateVendor(userId: string): Promise<Vendor> {
    const vendor = await this.getVendorByUserId(userId);
    
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    vendor.activate();
    return await this.vendorRepository.save(vendor);
  }

  async deactivateVendor(userId: string): Promise<Vendor> {
    const vendor = await this.getVendorByUserId(userId);
    
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    vendor.deactivate();
    return await this.vendorRepository.save(vendor);
  }

  // Admin methods for document verification
  async getAllVendors(): Promise<Vendor[]> {
    return await this.vendorRepository.find({
      relations: ['address'], // Include address details
      order: { created_at: 'DESC' }
    });
  }

  async getVendorsByVerificationStatus(status: DocumentVerificationStatus): Promise<Vendor[]> {
    return await this.vendorRepository.find({
      where: { document_verification_status: status },
      relations: ['address'], // Include address details
      order: { created_at: 'DESC' }
    });
  }

  async getPendingVerifications(): Promise<Vendor[]> {
    return await this.getVendorsByVerificationStatus(DocumentVerificationStatus.PENDING);
  }

  async getUnderReviewVendors(): Promise<Vendor[]> {
    return await this.getVendorsByVerificationStatus(DocumentVerificationStatus.UNDER_REVIEW);
  }

  // Document management methods
  async getVendorDocuments(vendorId: string): Promise<any[]> {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId }
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return vendor.documents || [];
  }

  async addDocumentToVendor(vendorId: string, document: any): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId }
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    vendor.addDocument(document);
    return await this.vendorRepository.save(vendor);
  }

  async removeDocumentFromVendor(vendorId: string, filename: string): Promise<boolean> {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId }
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const removed = vendor.removeDocument(filename);
    if (removed) {
      await this.vendorRepository.save(vendor);
    }
    return removed;
  }

  async updateDocumentVerification(vendorId: string, filename: string, isVerified: boolean, notes?: string): Promise<boolean> {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId }
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const updated = vendor.updateDocumentVerification(filename, isVerified, notes);
    if (updated) {
      await this.vendorRepository.save(vendor);
    }
    return updated;
  }

  async markVendorUnderReview(vendorId: string, adminId: string, notes?: string): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId }
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    vendor.markAsUnderReview(notes);
    return await this.vendorRepository.save(vendor);
  }

  async approveVendorDocuments(vendorId: string, adminId: string, notes?: string): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId }
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    vendor.approveDocuments(adminId, notes);
    return await this.vendorRepository.save(vendor);
  }

  async rejectVendorDocuments(vendorId: string, adminId: string, reason: string, notes?: string): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId }
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    vendor.rejectDocuments(adminId, reason, notes);
    return await this.vendorRepository.save(vendor);
  }

  async resetVendorVerification(vendorId: string): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId }
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    vendor.resetVerification();
    return await this.vendorRepository.save(vendor);
  }

  async getVerificationStats(): Promise<{
    total: number;
    pending: number;
    under_review: number;
    approved: number;
    rejected: number;
    total_documents: number;
    verified_documents: number;
    pending_documents: number;
  }> {
    const [total, pending, underReview, approved, rejected] = await Promise.all([
      this.vendorRepository.count(),
      this.vendorRepository.count({ where: { document_verification_status: DocumentVerificationStatus.PENDING } }),
      this.vendorRepository.count({ where: { document_verification_status: DocumentVerificationStatus.UNDER_REVIEW } }),
      this.vendorRepository.count({ where: { document_verification_status: DocumentVerificationStatus.APPROVED } }),
      this.vendorRepository.count({ where: { document_verification_status: DocumentVerificationStatus.REJECTED } }),
    ]);

    // Get document statistics
    const vendors = await this.vendorRepository.find();
    let totalDocuments = 0;
    let verifiedDocuments = 0;
    let pendingDocuments = 0;

    vendors.forEach(vendor => {
      if (vendor.documents) {
        totalDocuments += vendor.documents.length;
        vendor.documents.forEach(doc => {
          if (doc.isVerified) {
            verifiedDocuments++;
          } else {
            pendingDocuments++;
          }
        });
      }
    });

    return {
      total,
      pending,
      under_review: underReview,
      approved,
      rejected,
      total_documents: totalDocuments,
      verified_documents: verifiedDocuments,
      pending_documents: pendingDocuments,
    };
  }
} 