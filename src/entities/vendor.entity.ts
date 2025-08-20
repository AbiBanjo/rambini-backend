import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { IsString, IsOptional, IsBoolean, IsNumber, Min, Max, IsEnum, IsArray, IsJSON } from 'class-validator';
import { BaseEntity } from './base.entity';
import { Address } from './address.entity';

export enum DocumentVerificationStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface VendorDocument {
  filename: string;
  originalName: string;
  s3Key: string;
  s3Url: string;
  fileSize: number;
  mimeType: string;
  documentType: string;
  uploadedAt: Date;
  uploadedBy: string;
  isVerified?: boolean;
  verificationNotes?: string;
}

@Entity('vendors')
export class Vendor extends BaseEntity {
  @Column({ type: 'varchar' })
  @IsString()
  user_id: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  business_name: string;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  address_id?: string;

  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  is_accepting_orders: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  commission_rate: number;

  @Column({ type: 'enum', enum: DocumentVerificationStatus, default: DocumentVerificationStatus.PENDING })
  @IsEnum(DocumentVerificationStatus)
  document_verification_status: DocumentVerificationStatus;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  verification_notes?: string;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  verified_at?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  verified_by?: string;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @IsJSON()
  documents?: VendorDocument[];

  // Relationships
  @OneToOne('User')
  @JoinColumn({ name: 'user_id' })
  user: any;

  @ManyToOne(() => Address, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'address_id' })
  address?: Address;

  // Virtual properties
  get is_verified(): boolean {
    return this.document_verification_status === DocumentVerificationStatus.APPROVED;
  }

  get can_accept_orders(): boolean {
    return this.is_active && this.is_accepting_orders && this.is_verified;
  }

  get is_pending_verification(): boolean {
    return this.document_verification_status === DocumentVerificationStatus.PENDING;
  }

  get is_under_review(): boolean {
    return this.document_verification_status === DocumentVerificationStatus.UNDER_REVIEW;
  }

  get is_rejected(): boolean {
    return this.document_verification_status === DocumentVerificationStatus.REJECTED;
  }

  get has_documents(): boolean {
    return this.documents && this.documents.length > 0;
  }

  get document_count(): number {
    return this.documents ? this.documents.length : 0;
  }

  get verified_documents(): VendorDocument[] {
    return this.documents ? this.documents.filter(doc => doc.isVerified) : [];
  }

  get pending_documents(): VendorDocument[] {
    return this.documents ? this.documents.filter(doc => !doc.isVerified) : [];
  }

  // Methods
  approve(): void {
    this.is_active = true;
  }

  reject(): void {
    this.is_active = false;
  }

  suspend(): void {
    this.is_active = false;
    this.is_accepting_orders = false;
  }

  activate(): void {
    this.is_active = true;
  }

  deactivate(): void {
    this.is_active = false;
    this.is_accepting_orders = false;
  }

  updateCommissionRate(rate: number): void {
    if (rate >= 0 && rate <= 100) {
      this.commission_rate = rate;
    }
  }

  // Document management methods
  addDocument(document: VendorDocument): void {
    if (!this.documents) {
      this.documents = [];
    }
    this.documents.push(document);
  }

  removeDocument(filename: string): boolean {
    if (!this.documents) return false;
    
    const initialLength = this.documents.length;
    this.documents = this.documents.filter(doc => doc.filename !== filename);
    return this.documents.length < initialLength;
  }

  getDocument(filename: string): VendorDocument | undefined {
    return this.documents?.find(doc => doc.filename === filename);
  }

  updateDocumentVerification(filename: string, isVerified: boolean, notes?: string): boolean {
    const document = this.getDocument(filename);
    if (document) {
      document.isVerified = isVerified;
      document.verificationNotes = notes;
      return true;
    }
    return false;
  }

  // Document verification methods
  markAsUnderReview(notes?: string): void {
    this.document_verification_status = DocumentVerificationStatus.UNDER_REVIEW;
    this.verification_notes = notes;
  }

  approveDocuments(verifiedBy: string, notes?: string): void {
    this.document_verification_status = DocumentVerificationStatus.APPROVED;
    this.verified_at = new Date();
    this.verified_by = verifiedBy;
    this.verification_notes = notes;
    this.is_active = true;
    
    // Mark all documents as verified
    if (this.documents) {
      this.documents.forEach(doc => {
        doc.isVerified = true;
        doc.verificationNotes = notes;
      });
    }
  }

  rejectDocuments(verifiedBy: string, reason: string, notes?: string): void {
    this.document_verification_status = DocumentVerificationStatus.REJECTED;
    this.verified_at = new Date();
    this.verified_by = verifiedBy;
    this.verification_notes = `${reason}${notes ? ` - ${notes}` : ''}`;
    this.is_active = false;
    this.is_accepting_orders = false;
    
    // Mark all documents as not verified
    if (this.documents) {
      this.documents.forEach(doc => {
        doc.isVerified = false;
        doc.verificationNotes = `${reason}${notes ? ` - ${notes}` : ''}`;
      });
    }
  }

  resetVerification(): void {
    this.document_verification_status = DocumentVerificationStatus.PENDING;
    this.verified_at = null;
    this.verified_by = null;
    this.verification_notes = null;
    
    // Reset document verification status
    if (this.documents) {
      this.documents.forEach(doc => {
        doc.isVerified = false;
        doc.verificationNotes = null;
      });
    }
  }
} 