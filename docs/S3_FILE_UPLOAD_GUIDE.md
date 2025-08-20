# S3 File Upload Guide

This guide explains how to use the AWS S3 file upload functionality in the Rambini backend.

## Overview

The backend now supports uploading files directly to AWS S3 buckets using the helper functions in `src/utils/helpers.ts`. This is particularly useful for vendor document uploads and other file storage needs.

## Prerequisites

1. **AWS Account**: You need an AWS account with S3 access
2. **S3 Bucket**: Create an S3 bucket for storing files
3. **IAM User**: Create an IAM user with S3 permissions
4. **Environment Variables**: Configure the required environment variables

## Environment Variables

Add the following variables to your `.env` file:

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=rambini-vendor-documents
```

## Available Functions

### 1. `uploadFileToS3(file, bucketName, folder, options)`

Uploads a file to S3 and returns the result.

**Parameters:**
- `file`: Express.Multer.File object
- `bucketName`: S3 bucket name
- `folder`: Folder path within the bucket (default: 'uploads')
- `options`: Optional configuration
  - `acl`: Access control level ('private', 'public-read', etc.)
  - `contentType`: Custom content type
  - `metadata`: Additional metadata

**Returns:**
```typescript
{
  success: boolean;
  url?: string;        // Public URL (if public)
  key?: string;        // S3 object key
  error?: string;      // Error message if failed
  metadata?: {         // File metadata
    filename: string;
    size: number;
    mimetype: string;
    uploadedAt: Date;
  };
}
```

**Example:**
```typescript
import { uploadFileToS3 } from '../utils/helpers';

const result = await uploadFileToS3(
  file,
  'my-bucket',
  'vendors/documents',
  {
    acl: 'private',
    metadata: {
      vendorId: '123',
      documentType: 'verification'
    }
  }
);

if (result.success) {
  console.log('File uploaded:', result.url);
} else {
  console.error('Upload failed:', result.error);
}
```

### 2. `deleteFileFromS3(bucketName, key)`

Deletes a file from S3.

**Parameters:**
- `bucketName`: S3 bucket name
- `key`: S3 object key

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
}
```

### 3. `getPresignedUrl(bucketName, key, expiresIn)`

Generates a presigned URL for private S3 objects.

**Parameters:**
- `bucketName`: S3 bucket name
- `key`: S3 object key
- `expiresIn`: URL expiration time in seconds (default: 3600)

**Returns:**
```typescript
{
  success: boolean;
  url?: string;
  error?: string;
}
```

### 4. `validateFileForS3(file)`

Validates a file before S3 upload.

**Parameters:**
- `file`: Express.Multer.File object

**Returns:**
```typescript
{
  isValid: boolean;
  errors: string[];
}
```

## Usage in Vendor Service

The vendor service now automatically uploads documents to S3 when creating a vendor with documents:

```typescript
// In VendorService.handleDocumentUploads()
const result = await uploadFileToS3(document, bucketName, `vendors/${vendorId}/documents`, {
  acl: 'private',
  metadata: {
    vendorId,
    documentType: 'vendor_verification',
    uploadedBy: vendorId,
  },
});
```

## File Organization

Files are organized in S3 using the following structure:

```
bucket-name/
├── vendors/
│   ├── vendor-id-1/
│   │   └── documents/
│   │       ├── timestamp-random1.pdf
│   │       └── timestamp-random2.jpg
│   └── vendor-id-2/
│       └── documents/
│           └── timestamp-random3.png
└── uploads/
    └── general-files/
```

## Security Considerations

1. **Private by Default**: Files are uploaded as private by default
2. **ACL Control**: Use appropriate ACL settings based on your needs
3. **IAM Permissions**: Limit IAM user permissions to only necessary S3 operations
4. **Bucket Policies**: Configure bucket policies to restrict access
5. **Presigned URLs**: Use presigned URLs for temporary access to private files

## Error Handling

The functions include comprehensive error handling:

- Network errors
- Authentication failures
- Permission issues
- Invalid file types
- File size limits

## File Validation

Files are automatically validated for:
- File size (max 10MB)
- File type (PDF, images, Word documents)
- File name validity

## Best Practices

1. **Use Environment Variables**: Never hardcode AWS credentials
2. **Handle Errors Gracefully**: Always check the success flag
3. **Log Operations**: Log successful and failed uploads
4. **Clean Up**: Delete unused files to save costs
5. **Monitor Usage**: Track S3 usage and costs
6. **Backup Strategy**: Consider cross-region replication for critical files

## Troubleshooting

### Common Issues

1. **Access Denied**: Check IAM permissions and bucket policies
2. **Invalid Credentials**: Verify environment variables
3. **Bucket Not Found**: Ensure bucket name is correct
4. **File Too Large**: Check file size limits
5. **Invalid File Type**: Verify file MIME type

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
DEBUG=aws-s3:*
```

## Cost Optimization

1. **Lifecycle Policies**: Set up S3 lifecycle policies for automatic cleanup
2. **Storage Classes**: Use appropriate storage classes (Standard, IA, Glacier)
3. **Compression**: Compress files before upload when possible
4. **CDN**: Use CloudFront for frequently accessed files

## Monitoring

Monitor S3 usage through:
- AWS CloudWatch metrics
- S3 access logs
- Cost and usage reports
- Application logs 