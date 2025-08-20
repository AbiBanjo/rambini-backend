# File Storage & Image Upload System + Vendor Application System

## Overview
This document covers the implementation of:
- **T057-T066**: File Storage & Image Upload System
- **T086-T096**: Vendor Application System

## File Storage & Image Upload System (T057-T066)

### Components Implemented

#### 1. File Storage Service (`src/modules/file-storage/services/file-storage.service.ts`)
- **Image Processing**: Resize, optimize, and convert image formats (JPEG, PNG, WebP)
- **Thumbnail Generation**: Automatic thumbnail creation with configurable sizes
- **Document Upload**: Support for PDF, Word documents, and images
- **File Validation**: MIME type and size validation
- **Storage Management**: Local file system with CDN support
- **Metadata Extraction**: Image dimensions, format, and file information

#### 2. File Upload Controller (`src/modules/file-storage/controllers/file-upload.controller.ts`)
- **Image Upload**: `/files/upload/image` with processing options
- **Document Upload**: `/files/upload/document` with category support
- **Vendor Document Upload**: `/files/upload/vendor-document` for vendor applications
- **Menu Item Image Upload**: `/files/upload/menu-item-image` with optimization
- **File Management**: Get info, delete, optimize, and resize operations

#### 3. File Storage Module (`src/modules/file-storage/file-storage.module.ts`)
- **Multer Configuration**: File size limits and type filtering
- **Memory Storage**: For processing before saving to disk
- **Service Export**: Available for other modules

### Key Features

#### Image Processing Options
```typescript
interface ImageProcessingOptions {
  quality?: number;           // JPEG quality (1-100)
  width?: number;            // Target width
  height?: number;           // Target height
  format?: 'jpeg' | 'png' | 'webp';
  createThumbnail?: boolean; // Auto-generate thumbnail
  thumbnailSize?: number;    // Thumbnail dimensions
}
```

#### Supported File Types
- **Images**: JPEG, PNG, WebP
- **Documents**: PDF, DOC, DOCX
- **Max Size**: 10MB (configurable)

#### Storage Structure
```
uploads/
├── images/           # Processed images
├── thumbnails/       # Generated thumbnails
├── documents/        # Uploaded documents
└── vendor-documents/ # Vendor application files
```

## Vendor Application System (T086-T096)

### Components Implemented

#### 1. Vendor Application Entity (`src/entities/vendor-application.entity.ts`)
- **Business Information**: Name, description, type, contact details
- **Address & Location**: Business address with geocoding support
- **Application Status**: PENDING, UNDER_REVIEW, APPROVED, REJECTED, ON_HOLD
- **Document Management**: Required documents and menu samples
- **Review System**: Admin review with notes and approval dates

#### 2. Vendor Application Service (`src/modules/vendor/services/vendor-application.service.ts`)
- **Application Lifecycle**: Create, update, submit, review, approve/reject
- **Document Management**: Add/remove documents and menu samples
- **Validation**: Required document checks before submission
- **Admin Functions**: Review applications, manage status, generate statistics

#### 3. Vendor Application Controller (`src/modules/vendor/controllers/vendor-application.controller.ts`)
- **User Endpoints**: Create, update, submit, manage applications
- **Document Management**: Upload and manage application documents
- **Admin Endpoints**: Review, approve, reject, and manage applications
- **Statistics**: Application overview and status counts

#### 4. Vendor Module (`src/modules/vendor/vendor.module.ts`)
- **TypeORM Integration**: Database entity management
- **File Storage Integration**: Document upload capabilities
- **Service Export**: Available for other modules

### Key Features

#### Business Types Supported
- RESTAURANT, CAFE, FAST_FOOD, BAKERY
- FOOD_TRUCK, CATERING, GROCERY, OTHER

#### Required Documents
- Business License
- Food Handler Certificate
- Identity Document
- Tax Clearance (optional)
- Bank Statement (optional)
- Menu Samples (optional)

#### Application Workflow
1. **Create Application**: User fills business details
2. **Upload Documents**: Required documents and menu samples
3. **Submit Application**: Validation and status change to UNDER_REVIEW
4. **Admin Review**: Review, approve, reject, or put on hold
5. **Approval Process**: Final decision with notes and dates

## Database Schema

### Vendor Applications Table
```sql
CREATE TABLE vendor_applications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  business_description TEXT,
  business_type ENUM(...) NOT NULL,
  contact_person_name VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  business_address VARCHAR(255) NOT NULL,
  business_city VARCHAR(100) NOT NULL,
  business_state VARCHAR(100) NOT NULL,
  business_postal_code VARCHAR(20),
  business_country VARCHAR(2) DEFAULT 'NG',
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  website_url VARCHAR(255),
  social_media_handles VARCHAR(255),
  status ENUM(...) DEFAULT 'PENDING',
  rejection_reason TEXT,
  documents JSON,
  menu_samples JSON,
  additional_notes TEXT,
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR(255),
  review_notes TEXT,
  is_urgent BOOLEAN DEFAULT FALSE,
  estimated_approval_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_business_type (business_type),
  INDEX idx_created_at (created_at)
);
```

## API Endpoints

### File Storage Endpoints
```
POST /files/upload/image          # Upload and process images
POST /files/upload/document       # Upload documents
POST /files/upload/vendor-document # Upload vendor documents
POST /files/upload/menu-item-image # Upload menu item images
GET  /files/:filename             # Get file information
DELETE /files/:filename           # Delete files
POST /files/optimize              # Optimize images
POST /files/resize                # Resize images
```

### Vendor Application Endpoints
```
POST   /vendor-applications                    # Create application
GET    /vendor-applications/my-application     # Get user's application
GET    /vendor-applications/:id                # Get application by ID
PUT    /vendor-applications/:id                # Update application
POST   /vendor-applications/:id/submit         # Submit application
POST   /vendor-applications/:id/documents      # Add document
POST   /vendor-applications/:id/menu-samples   # Add menu sample
DELETE /vendor-applications/:id/documents/:filename    # Remove document
DELETE /vendor-applications/:id/menu-samples/:filename # Remove menu sample
DELETE /vendor-applications/:id                # Delete application

# Admin endpoints
GET    /vendor-applications                     # Get all applications
GET    /vendor-applications/status/:status      # Get by status
GET    /vendor-applications/urgent/list         # Get urgent applications
GET    /vendor-applications/stats/overview      # Get statistics
POST   /vendor-applications/:id/review          # Review application
```

## Configuration

### Environment Variables
```env
# File Storage
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760  # 10MB in bytes
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,application/pdf,application/msword
CDN_URL=https://cdn.example.com

# Geocoding (for vendor applications)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
```

## Dependencies Added
```json
{
  "sharp": "^0.32.0",           // Image processing
  "uuid": "^9.0.0",             // Unique file naming
  "@types/uuid": "^9.0.0",      // TypeScript types
  "@types/multer": "^1.4.7"     // File upload types
}
```

## Integration Points

### With Authentication System
- JWT authentication required for all endpoints
- User ownership validation for file and application operations

### With User Management
- Vendor applications linked to user accounts
- Address management integration for business locations

### With Notification System
- Application status change notifications
- Document upload confirmations

## Security Features

### File Upload Security
- File type validation
- Size limits enforcement
- Secure file naming (UUID-based)
- Path traversal prevention

### Application Security
- User ownership validation
- Status transition validation
- Document requirement enforcement
- Admin-only review operations

## Performance Considerations

### Image Processing
- Asynchronous processing for large images
- Thumbnail generation on-demand
- Format optimization for web delivery

### File Storage
- Configurable CDN integration
- Efficient file organization by category
- Cleanup of orphaned files

## Future Enhancements

### File Storage
- Cloud storage integration (AWS S3, Google Cloud)
- Image compression algorithms
- Video file support
- File versioning

### Vendor Applications
- Automated document verification
- Integration with external verification services
- Application templates by business type
- Bulk application processing

## Testing

### Unit Tests
- File processing validation
- Application workflow testing
- Document requirement validation

### Integration Tests
- File upload and retrieval
- Application creation and review
- Database operations

### E2E Tests
- Complete application workflow
- File upload and management
- Admin review process

## Deployment Notes

### File Storage
- Ensure upload directory permissions
- Configure CDN for production
- Set appropriate file size limits
- Monitor disk space usage

### Database
- Run vendor applications migration
- Set up proper indexes for performance
- Configure backup for application data

## Conclusion

The File Storage & Image Upload System and Vendor Application System provide a robust foundation for:
- Managing food service business registrations
- Handling document uploads and verification
- Processing and optimizing images for the platform
- Streamlining vendor onboarding workflows

Both systems are designed with scalability, security, and maintainability in mind, following NestJS best practices and TypeORM patterns. 