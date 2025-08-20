# Vendor Application File Upload Examples

## Overview
This document provides examples of how to use the vendor application endpoints with file uploads. The endpoints now support both single and bulk file uploads for documents and menu samples.

## Updated Endpoints

### 1. Create Vendor Application with Documents
**Endpoint:** `POST /vendor-applications`
**Content-Type:** `multipart/form-data`

#### Request Body (Form Data):
```
businessName: "Tasty Bites Restaurant"
businessDescription: "A cozy restaurant serving local cuisine"
businessType: "RESTAURANT"
contactPersonName: "John Doe"
contactPhone: "+2348012345678"
contactEmail: "john@tastybites.com"
businessAddress: "123 Main Street"
businessCity: "Lagos"
businessState: "Lagos"
businessPostalCode: "100001"
businessCountry: "NG"
latitude: 6.5244
longitude: 3.3792
websiteUrl: "https://tastybites.com"
socialMediaHandles: "@tastybites_ng"
additionalNotes: "Family-owned business since 2010"
isUrgent: false

# Files
documents: [file1.pdf, file2.jpg, file3.pdf]  # Up to 10 files
documentTypes: '["BUSINESS_LICENSE", "FOOD_HANDLER_CERTIFICATE", "IDENTITY_DOCUMENT"]'
```

#### Example using cURL:
```bash
curl -X POST http://localhost:3000/vendor-applications \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "businessName=Tasty Bites Restaurant" \
  -F "businessDescription=A cozy restaurant serving local cuisine" \
  -F "businessType=RESTAURANT" \
  -F "contactPersonName=John Doe" \
  -F "contactPhone=+2348012345678" \
  -F "contactEmail=john@tastybites.com" \
  -F "businessAddress=123 Main Street" \
  -F "businessCity=Lagos" \
  -F "businessState=Lagos" \
  -F "businessPostalCode=100001" \
  -F "businessCountry=NG" \
  -F "latitude=6.5244" \
  -F "longitude=3.3792" \
  -F "websiteUrl=https://tastybites.com" \
  -F "socialMediaHandles=@tastybites_ng" \
  -F "additionalNotes=Family-owned business since 2010" \
  -F "isUrgent=false" \
  -F "documentTypes=[\"BUSINESS_LICENSE\", \"FOOD_HANDLER_CERTIFICATE\", \"IDENTITY_DOCUMENT\"]" \
  -F "documents=@business_license.pdf" \
  -F "documents=@food_handler_cert.jpg" \
  -F "documents=@identity_doc.pdf"
```

#### Example using JavaScript/Fetch:
```javascript
const formData = new FormData();

// Business information
formData.append('businessName', 'Tasty Bites Restaurant');
formData.append('businessDescription', 'A cozy restaurant serving local cuisine');
formData.append('businessType', 'RESTAURANT');
formData.append('contactPersonName', 'John Doe');
formData.append('contactPhone', '+2348012345678');
formData.append('contactEmail', 'john@tastybites.com');
formData.append('businessAddress', '123 Main Street');
formData.append('businessCity', 'Lagos');
formData.append('businessState', 'Lagos');
formData.append('businessPostalCode', '100001');
formData.append('businessCountry', 'NG');
formData.append('latitude', '6.5244');
formData.append('longitude', '3.3792');
formData.append('websiteUrl', 'https://tastybites.com');
formData.append('socialMediaHandles', '@tastybites_ng');
formData.append('additionalNotes', 'Family-owned business since 2010');
formData.append('isUrgent', 'false');

// Document types (JSON string)
formData.append('documentTypes', JSON.stringify([
  'BUSINESS_LICENSE',
  'FOOD_HANDLER_CERTIFICATE',
  'IDENTITY_DOCUMENT'
]));

// Document files
formData.append('documents', businessLicenseFile);
formData.append('documents', foodHandlerCertFile);
formData.append('documents', identityDocFile);

const response = await fetch('http://localhost:3000/vendor-applications', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: formData
});

const application = await response.json();
```

### 2. Add Single Document to Application
**Endpoint:** `POST /vendor-applications/:id/documents`
**Content-Type:** `multipart/form-data`

#### Request Body (Form Data):
```
documentType: "TAX_CLEARANCE"
description: "Tax clearance certificate for 2023"

# File
document: tax_clearance.pdf
```

#### Example using cURL:
```bash
curl -X POST http://localhost:3000/vendor-applications/APP_ID/documents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "documentType=TAX_CLEARANCE" \
  -F "description=Tax clearance certificate for 2023" \
  -F "document=@tax_clearance.pdf"
```

### 3. Add Multiple Documents to Application (Bulk)
**Endpoint:** `POST /vendor-applications/:id/documents/bulk`
**Content-Type:** `multipart/form-data`

#### Request Body (Form Data):
```
documentTypes: '["BANK_STATEMENT", "OTHER", "OTHER"]'
description: "Additional supporting documents"

# Files
documents: [bank_statement.pdf, business_plan.pdf, financial_projections.pdf]
```

#### Example using cURL:
```bash
curl -X POST http://localhost:3000/vendor-applications/APP_ID/documents/bulk \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "documentTypes=[\"BANK_STATEMENT\", \"OTHER\", \"OTHER\"]" \
  -F "documents=@bank_statement.pdf" \
  -F "documents=@business_plan.pdf" \
  -F "documents=@financial_projections.pdf"
```

### 4. Add Single Menu Sample
**Endpoint:** `POST /vendor-applications/:id/menu-samples`
**Content-Type:** `multipart/form-data`

#### Request Body (Form Data):
```
description: "Our signature jollof rice with grilled chicken"

# File
menuSample: jollof_rice.jpg
```

#### Example using cURL:
```bash
curl -X POST http://localhost:3000/vendor-applications/APP_ID/menu-samples \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "description=Our signature jollof rice with grilled chicken" \
  -F "menuSample=@jollof_rice.jpg"
```

### 5. Add Multiple Menu Samples (Bulk)
**Endpoint:** `POST /vendor-applications/:id/menu-samples/bulk`
**Content-Type:** `multipart/form-data`

#### Request Body (Form Data):
```
descriptions: '["Signature jollof rice", "Grilled fish", "Pounded yam with egusi"]'

# Files
menuSamples: [jollof_rice.jpg, grilled_fish.jpg, pounded_yam.jpg]
```

#### Example using cURL:
```bash
curl -X POST http://localhost:3000/vendor-applications/APP_ID/menu-samples/bulk \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "descriptions=[\"Signature jollof rice\", \"Grilled fish\", \"Pounded yam with egusi\"]" \
  -F "menuSamples=@jollof_rice.jpg" \
  -F "menuSamples=@grilled_fish.jpg" \
  -F "menuSamples=@pounded_yam.jpg"
```

## File Upload Requirements

### Supported File Types
- **Documents**: PDF, DOC, DOCX, JPG, PNG
- **Images**: JPG, PNG, WebP
- **Maximum File Size**: 10MB per file
- **Maximum Files per Request**: 10 files

### File Naming Convention
Files are automatically renamed using UUIDs to prevent conflicts:
- Original: `business_license.pdf`
- Stored: `550e8400-e29b-41d4-a716-446655440000.pdf`

### Storage Structure
```
uploads/
└── vendor-documents/
    └── {user_id}/
        └── {application_id}/
            ├── {document_type}.pdf
            ├── {document_type}.jpg
            └── menu-samples/
                ├── sample1.jpg
                └── sample2.jpg
```

## Document Types

### Required Documents
- `BUSINESS_LICENSE` - Business registration/license
- `FOOD_HANDLER_CERTIFICATE` - Food safety certification
- `IDENTITY_DOCUMENT` - Government-issued ID

### Optional Documents
- `TAX_CLEARANCE` - Tax compliance certificate
- `BANK_STATEMENT` - Financial capability proof
- `MENU_SAMPLES` - Sample menu items
- `OTHER` - Any other supporting documents

## Error Handling

### Common Errors
1. **Missing File**: "Document file is required"
2. **Invalid File Type**: File type not allowed
3. **File Too Large**: File size exceeds maximum limit
4. **Upload Failure**: "Failed to upload documents: [error message]"

### Response Format
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "businessName": "Tasty Bites Restaurant",
  "status": "PENDING",
  "documents": [
    {
      "type": "BUSINESS_LICENSE",
      "filename": "550e8400-e29b-41d4-a716-446655440000.pdf",
      "url": "/files/vendor-documents/user123/app456/550e8400-e29b-41d4-a716-446655440000.pdf",
      "uploaded_at": "2024-01-15T10:30:00Z"
    }
  ],
  "created_at": "2024-01-15T10:30:00Z"
}
```

## Best Practices

### 1. File Preparation
- Ensure files are in supported formats
- Compress large images before upload
- Use descriptive filenames for easier management

### 2. Document Organization
- Upload required documents first
- Use appropriate document types
- Provide clear descriptions for menu samples

### 3. Error Handling
- Always check file upload success
- Handle network errors gracefully
- Provide user feedback for upload progress

### 4. Security
- Validate file types on client side
- Check file sizes before upload
- Use secure file storage paths

## Testing

### Using Postman
1. Set request type to `POST`
2. Set URL to endpoint
3. Set Authorization header with JWT token
4. Use `form-data` in Body tab
5. Add text fields for business information
6. Add file fields for documents
7. Send request

### Using Insomnia
1. Create new request
2. Set method to `POST`
3. Set URL to endpoint
4. Add Authorization header
5. Use `Multipart` body type
6. Add fields and files
7. Send request

## Integration Notes

### Frontend Integration
- Use `FormData` for multipart requests
- Handle file selection with file input elements
- Show upload progress indicators
- Validate file types and sizes before upload

### Mobile App Integration
- Use appropriate file picker components
- Handle camera capture for documents
- Compress images before upload
- Show upload status and progress

### Web App Integration
- Drag and drop file upload support
- Preview uploaded files
- Allow file removal before submission
- Validate required documents 