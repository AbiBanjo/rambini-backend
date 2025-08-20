# Vendor Document Management

This document explains the new vendor document management functionality in the Rambini backend, which allows vendors to upload, manage, and track their verification documents.

## Overview

The system now includes a comprehensive document management system for vendors that:
- Stores document metadata in the vendor entity
- Automatically uploads files to AWS S3
- Tracks document verification status
- Provides admin tools for document review
- Allows vendors to manage their own documents

## Database Changes

### New Column in Vendors Table

A new `documents` column has been added to the `vendors` table:

```sql
ALTER TABLE vendors ADD COLUMN documents JSON;
```

### Migration File

The migration is located at: `src/database/migrations/1700000000010-AddDocumentsToVendorsTable.ts`

## Entity Changes

### Vendor Entity Updates

The `Vendor` entity now includes:

```typescript
@Column({ type: 'json', nullable: true })
@IsOptional()
@IsJSON()
documents?: VendorDocument[];
```

### VendorDocument Interface

```typescript
export interface VendorDocument {
  filename: string;           // Generated filename
  originalName: string;       // Original uploaded filename
  s3Key: string;             // S3 object key
  s3Url: string;             // S3 URL
  fileSize: number;          // File size in bytes
  mimeType: string;          // MIME type
  documentType: string;      // Type of document
  uploadedAt: Date;          // Upload timestamp
  uploadedBy: string;        // User ID who uploaded
  isVerified?: boolean;      // Verification status
  verificationNotes?: string; // Admin verification notes
}
```

## New Methods in Vendor Entity

### Document Management Methods

- **`addDocument(document: VendorDocument)`**: Add a new document
- **`removeDocument(filename: string)`**: Remove a document by filename
- **`getDocument(filename: string)`**: Get a specific document
- **`updateDocumentVerification(filename, isVerified, notes)`**: Update verification status

### Virtual Properties

- **`has_documents`**: Boolean indicating if vendor has documents
- **`document_count`**: Total number of documents
- **`verified_documents`**: Array of verified documents
- **`pending_documents`**: Array of pending documents

### Enhanced Verification Methods

The existing verification methods now also update document status:
- **`approveDocuments()`**: Marks all documents as verified
- **`rejectDocuments()`**: Marks all documents as not verified
- **`resetVerification()`**: Resets all document verification status

## Service Layer Updates

### New Methods in VendorService

```typescript
// Document management
async getVendorDocuments(vendorId: string): Promise<any[]>
async addDocumentToVendor(vendorId: string, document: any): Promise<Vendor>
async removeDocumentFromVendor(vendorId: string, filename: string): Promise<boolean>
async updateDocumentVerification(vendorId: string, filename: string, isVerified: boolean, notes?: string): Promise<boolean>

// Enhanced verification stats
async getVerificationStats(): Promise<{
  total: number;
  pending: number;
  under_review: number;
  approved: number;
  rejected: number;
  total_documents: number;
  verified_documents: number;
  pending_documents: number;
}>
```

### Enhanced handleDocumentUploads Method

The `handleDocumentUploads` method now:
1. Uploads files to S3
2. Creates document metadata
3. Updates the vendor entity with document information
4. Provides comprehensive logging and error handling

## API Endpoints

### New Vendor Endpoints

#### Get Vendor Documents
```
GET /vendor/documents
```
Returns all documents for the current vendor.

#### Upload Additional Documents
```
POST /vendor/documents
Content-Type: multipart/form-data
```
Allows vendors to upload additional documents (up to 5 files).

#### Remove Document
```
DELETE /vendor/documents/:filename
```
Removes a specific document from the vendor profile.

### Enhanced Admin Endpoints

All existing admin endpoints now return document information in the response.

## DTO Updates

### New DTOs

- **`VendorDocumentResponseDto`**: For document information in responses
- **Enhanced `VerificationResponseDto`**: Now includes document information

### Updated Response Structure

```typescript
export class VerificationResponseDto {
  // ... existing fields ...
  
  @ApiPropertyOptional({ description: 'Vendor documents', type: [VendorDocumentResponseDto] })
  documents?: VendorDocumentResponseDto[];

  @ApiProperty({ description: 'Number of documents' })
  document_count: number;

  @ApiProperty({ description: 'Whether vendor has documents' })
  has_documents: boolean;
}
```

## File Upload Flow

### 1. Initial Vendor Creation with Documents

```typescript
// When creating a vendor with documents
const vendor = await this.vendorService.createVendorWithDocuments(
  userId, 
  createVendorDto, 
  documents
);
```

**Process:**
1. Create vendor profile
2. Upload documents to S3
3. Store document metadata in vendor entity
4. Return vendor with document information

### 2. Additional Document Upload

```typescript
// Upload additional documents
POST /vendor/documents
```

**Process:**
1. Validate vendor exists
2. Upload new documents to S3
3. Add document metadata to existing vendor
4. Update vendor entity

### 3. Document Removal

```typescript
// Remove a document
DELETE /vendor/documents/:filename
```

**Process:**
1. Remove document metadata from vendor entity
2. Optionally delete from S3 (future enhancement)

## S3 Integration

### File Organization

Documents are organized in S3 using the structure:
```
bucket-name/
└── vendors/
    └── {vendor-id}/
        └── documents/
            ├── timestamp-random1.pdf
            ├── timestamp-random2.jpg
            └── timestamp-random3.png
```

### File Naming Convention

Files are renamed using: `{timestamp}-{randomString}.{extension}`

Example: `1700000000000-abc12345.pdf`

### Metadata

Each S3 object includes metadata:
- `originalName`: Original filename
- `uploadedAt`: Upload timestamp
- `vendorId`: Vendor ID
- `documentType`: Document type
- `uploadedBy`: User ID

## Admin Verification Process

### 1. Document Review

Admins can now see:
- All vendor documents
- Document verification status
- File metadata
- Upload history

### 2. Verification Actions

When approving/rejecting vendors:
- All documents are automatically marked as verified/not verified
- Verification notes are applied to all documents
- Document status is synchronized with vendor status

### 3. Enhanced Statistics

Admin dashboard now shows:
- Total documents across all vendors
- Verified vs pending documents
- Document upload trends

## Security Features

### File Validation

- **Size Limit**: 10MB per file
- **File Types**: PDF, JPG, JPEG, PNG
- **Content Validation**: MIME type checking

### Access Control

- **Private Files**: Documents are uploaded as private by default
- **Vendor Isolation**: Each vendor can only access their own documents
- **Admin Access**: Admins can view all vendor documents

### S3 Security

- **ACL Control**: Private access by default
- **Metadata Sanitization**: All metadata is validated
- **Error Handling**: Comprehensive error logging

## Error Handling

### Upload Failures

- Individual document failures don't affect other uploads
- Failed uploads are logged with detailed error information
- Vendor creation continues even if some documents fail

### Validation Errors

- File size exceeded
- Invalid file type
- Missing filename
- S3 upload failures

### Recovery Options

- Failed uploads can be retried
- Invalid documents can be replaced
- S3 errors are logged for debugging

## Monitoring and Logging

### Upload Logs

- Successful uploads with S3 URLs
- Failed uploads with error details
- Upload summary statistics

### Document Statistics

- Total documents per vendor
- Verification status tracking
- Upload frequency monitoring

### Error Tracking

- S3 connection issues
- File validation failures
- Database update errors

## Future Enhancements

### Planned Features

1. **Document Categories**: Support for different document types
2. **Version Control**: Track document versions and updates
3. **Bulk Operations**: Upload/remove multiple documents
4. **Document Templates**: Predefined document requirements
5. **Automated Verification**: AI-powered document validation
6. **Document Expiry**: Automatic document expiration handling

### Technical Improvements

1. **Async Processing**: Background document processing
2. **CDN Integration**: CloudFront for document delivery
3. **Compression**: Automatic file compression
4. **Thumbnail Generation**: Image thumbnails for previews
5. **Search**: Full-text document search

## Usage Examples

### Frontend Integration

```typescript
// Get vendor documents
const documents = await api.get('/vendor/documents');

// Upload new documents
const formData = new FormData();
formData.append('documents', file1);
formData.append('documents', file2);

const result = await api.post('/vendor/documents', formData);

// Remove document
await api.delete(`/vendor/documents/${filename}`);
```

### Admin Operations

```typescript
// Get all vendors with documents
const vendors = await api.get('/vendor/admin/all');

// Approve vendor documents
await api.post(`/vendor/admin/${vendorId}/approve`, {
  notes: 'All documents verified successfully'
});

// Get verification statistics
const stats = await api.get('/vendor/admin/stats');
```

## Configuration

### Environment Variables

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=rambini-vendor-documents
```

### Database Configuration

Ensure your PostgreSQL database supports JSON columns and has sufficient storage for document metadata.

## Troubleshooting

### Common Issues

1. **S3 Upload Failures**: Check AWS credentials and bucket permissions
2. **File Validation Errors**: Verify file size and type restrictions
3. **Database Errors**: Ensure JSON column support and sufficient storage
4. **Memory Issues**: Monitor file size limits and concurrent uploads

### Debug Mode

Enable detailed logging by setting:
```bash
NODE_ENV=development
LOG_LEVEL=debug
```

## Performance Considerations

### File Size Limits

- **Individual Files**: 10MB maximum
- **Total Documents**: No strict limit (monitor storage usage)
- **Concurrent Uploads**: Up to 10 files per request

### Database Performance

- **JSON Queries**: Use appropriate indexes for document searches
- **Storage**: Monitor JSON column size growth
- **Backup**: Include document metadata in database backups

### S3 Performance

- **Upload Speed**: Depends on file size and network
- **Retrieval**: Use presigned URLs for private documents
- **Costs**: Monitor S3 storage and transfer costs 