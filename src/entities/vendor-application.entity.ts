import {
  Entity,
  Column,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IsEnum, IsOptional, IsBoolean, IsString, IsUrl, IsJSON, Length, Matches } from 'class-validator';
import { BaseEntity } from './base.entity';

export enum ApplicationStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ON_HOLD = 'ON_HOLD',
}

export enum BusinessType {
  RESTAURANT = 'RESTAURANT',
  CAFE = 'CAFE',
  FAST_FOOD = 'FAST_FOOD',
  BAKERY = 'BAKERY',
  FOOD_TRUCK = 'FOOD_TRUCK',
  CATERING = 'CATERING',
  GROCERY = 'GROCERY',
  OTHER = 'OTHER',
}

export enum DocumentType {
  BUSINESS_LICENSE = 'BUSINESS_LICENSE',
  FOOD_HANDLER_CERTIFICATE = 'FOOD_HANDLER_CERTIFICATE',
  TAX_CLEARANCE = 'TAX_CLEARANCE',
  IDENTITY_DOCUMENT = 'IDENTITY_DOCUMENT',
  BANK_STATEMENT = 'BANK_STATEMENT',
  MENU_SAMPLES = 'MENU_SAMPLES',
  OTHER = 'OTHER',
}

@Entity('vendor_applications')
@Index(['user_id'])
@Index(['status'])
@Index(['business_type'])
@Index(['created_at'])
export class VendorApplication extends BaseEntity {
  @Column({ type: 'varchar' })
  @IsString()
  user_id: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  business_name: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  business_description?: string;

  @Column({ type: 'enum', enum: BusinessType })
  @IsEnum(BusinessType)
  business_type: BusinessType;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  contact_person_name: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  contact_phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  contact_email?: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  business_address: string;

  @Column({ type: 'varchar', length: 100 })
  @IsString()
  business_city: string;

  @Column({ type: 'varchar', length: 100 })
  @IsString()
  business_state: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  @IsOptional()
  @IsString()
  business_postal_code?: string;

  @Column({ type: 'varchar', length: 2, default: 'NG' })
  @IsString()
  @Length(2, 2, { message: 'Business country must be exactly 2 characters' })
  @Matches(/^[A-Z]{2}$/, { message: 'Business country must be a 2-letter uppercase ISO code (e.g., NG, US, UK)' })
  business_country: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  @IsOptional()
  latitude?: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  @IsOptional()
  longitude?: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsUrl()
  website_url?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  social_media_handles?: string;

  @Column({ type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.PENDING })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  rejection_reason?: string;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @IsJSON()
  documents?: {
    type: DocumentType;
    filename: string;
    url: string;
    uploaded_at: Date;
  }[];

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @IsJSON()
  menu_samples?: {
    filename: string;
    url: string;
    description?: string;
    uploaded_at: Date;
  }[];

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  additional_notes?: string;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  reviewed_at?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  reviewed_by?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  review_notes?: string;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  is_urgent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  estimated_approval_date?: Date;

  // Relationships
  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: any;

  // Virtual properties
  get is_approved(): boolean {
    return this.status === ApplicationStatus.APPROVED;
  }

  get is_rejected(): boolean {
    return this.status === ApplicationStatus.REJECTED;
  }

  get is_pending(): boolean {
    return this.status === ApplicationStatus.PENDING;
  }

  get is_under_review(): boolean {
    return this.status === ApplicationStatus.UNDER_REVIEW;
  }

  get full_business_address(): string {
    const parts = [
      this.business_address,
      this.business_city,
      this.business_state,
      this.business_postal_code,
      this.business_country,
    ].filter(Boolean);
    return parts.join(', ');
  }

  // Methods
  approve(reviewedBy: string, notes?: string): void {
    this.status = ApplicationStatus.APPROVED;
    this.reviewed_at = new Date();
    this.reviewed_by = reviewedBy;
    this.review_notes = notes;
  }

  reject(reviewedBy: string, reason: string, notes?: string): void {
    this.status = ApplicationStatus.REJECTED;
    this.rejection_reason = reason;
    this.reviewed_at = new Date();
    this.reviewed_by = reviewedBy;
    this.review_notes = notes;
  }

  putOnHold(reviewedBy: string, notes?: string): void {
    this.status = ApplicationStatus.ON_HOLD;
    this.reviewed_at = new Date();
    this.reviewed_by = reviewedBy;
    this.review_notes = notes;
  }

  markAsUnderReview(reviewedBy: string, notes?: string): void {
    this.status = ApplicationStatus.UNDER_REVIEW;
    this.reviewed_at = new Date();
    this.reviewed_by = reviewedBy;
    this.review_notes = notes;
  }

  addDocument(type: DocumentType, filename: string, url: string): void {
    if (!this.documents) {
      this.documents = [];
    }
    
    this.documents.push({
      type,
      filename,
      url,
      uploaded_at: new Date(),
    });
  }

  addMenuSample(filename: string, url: string, description?: string): void {
    if (!this.menu_samples) {
      this.menu_samples = [];
    }
    
    this.menu_samples.push({
      filename,
      url,
      description,
      uploaded_at: new Date(),
    });
  }

  removeDocument(filename: string): void {
    if (this.documents) {
      this.documents = this.documents.filter(doc => doc.filename !== filename);
    }
  }

  removeMenuSample(filename: string): void {
    if (this.menu_samples) {
      this.menu_samples = this.menu_samples.filter(menu => menu.filename !== filename);
    }
  }
} 