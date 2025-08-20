import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty, IsBoolean, IsNumber, IsDateString } from 'class-validator';

export class MarkUnderReviewDto {
  @ApiPropertyOptional({ description: 'Notes for marking vendor under review' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveDocumentsDto {
  @ApiPropertyOptional({ description: 'Approval notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectDocumentsDto {
  @ApiProperty({ description: 'Reason for rejection' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: 'Additional rejection notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class VendorDocumentResponseDto {
  @ApiProperty({ description: 'Document filename' })
  filename: string;

  @ApiProperty({ description: 'Original document name' })
  originalName: string;

  @ApiProperty({ description: 'S3 object key' })
  s3Key: string;

  @ApiProperty({ description: 'S3 URL' })
  s3Url: string;

  @ApiProperty({ description: 'File size in bytes' })
  fileSize: number;

  @ApiProperty({ description: 'MIME type' })
  mimeType: string;

  @ApiProperty({ description: 'Document type' })
  documentType: string;

  @ApiProperty({ description: 'When uploaded' })
  uploadedAt: Date;

  @ApiProperty({ description: 'Who uploaded' })
  uploadedBy: string;

  @ApiProperty({ description: 'Whether document is verified' })
  isVerified: boolean;

  @ApiPropertyOptional({ description: 'Verification notes' })
  verificationNotes?: string;
}

export class AddressResponseDto {
  @ApiProperty({ description: 'Address ID' })
  id: string;

  @ApiProperty({ description: 'Address line 1' })
  address_line_1: string;

  @ApiPropertyOptional({ description: 'Address line 2' })
  address_line_2?: string;

  @ApiProperty({ description: 'City' })
  city: string;

  @ApiProperty({ description: 'State' })
  state: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  postal_code?: string;

  @ApiProperty({ description: 'Country' })
  country: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  longitude?: number;

  @ApiPropertyOptional({ description: 'Landmark' })
  landmark?: string;
}

export class VerificationResponseDto {
  @ApiProperty({ description: 'Vendor ID' })
  id: string;

  @ApiProperty({ description: 'Business name' })
  business_name: string;

  @ApiProperty({ description: 'Document verification status' })
  document_verification_status: string;

  @ApiPropertyOptional({ description: 'Verification notes' })
  verification_notes?: string;

  @ApiPropertyOptional({ description: 'When verified' })
  verified_at?: Date;

  @ApiPropertyOptional({ description: 'Who verified' })
  verified_by?: string;

  @ApiProperty({ description: 'Whether vendor is active' })
  is_active: boolean;

  @ApiProperty({ description: 'Whether vendor can accept orders' })
  is_accepting_orders: boolean;

  @ApiProperty({ description: 'When created' })
  created_at: Date;

  @ApiProperty({ description: 'Vendor address', type: AddressResponseDto })
  address: AddressResponseDto;

  @ApiPropertyOptional({ description: 'Vendor documents', type: [VendorDocumentResponseDto] })
  documents?: VendorDocumentResponseDto[];

  @ApiProperty({ description: 'Number of documents' })
  document_count: number;

  @ApiProperty({ description: 'Whether vendor has documents' })
  has_documents: boolean;
} 