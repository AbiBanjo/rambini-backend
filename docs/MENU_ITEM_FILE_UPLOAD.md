# Menu Item Creation with File Upload

## Overview

The menu item creation API has been enhanced to support direct file uploads during creation, eliminating the need to pre-upload images and provide URLs. The system now automatically handles file processing, optimization, and storage when creating menu items.

## Changes Made

### 1. DTO Updates

- **`CreateMenuItemDto`**: Removed `image_url` field since files are now handled directly
- **`CreateMenuItemWithFileDto`**: New DTO that extends the base DTO and adds file upload support
- **`UpdateMenuItemDto`**: Maintains `image_url` field for updates (since files can be updated separately)

### 2. Service Updates

- **`MenuItemService.createMenuItemWithFile()`**: New method that handles file uploads during creation
- **File processing**: Automatically processes images with quality optimization and thumbnail generation
- **Storage integration**: Seamlessly integrates with the existing file storage system

### 3. Controller Updates

- **`POST /menu-items`**: Now supports multipart/form-data with optional image upload
- **File validation**: Includes file size (5MB max) and type validation (jpg, jpeg, png, webp)
- **Backward compatibility**: Still supports creation without images

## API Usage

### Creating a Menu Item with Image

```http
POST /menu-items
Content-Type: multipart/form-data
Authorization: Bearer <jwt-token>

Form Data:
- category_id: string (required)
- name: string (required)
- description: string (optional)
- price: number (required)
- preparation_time_minutes: number (optional)
- is_available: boolean (optional)
- image: file (optional)
```

### Creating a Menu Item without Image

```http
POST /menu-items
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "category_id": "uuid",
  "name": "Item Name",
  "description": "Item description",
  "price": 12.99,
  "preparation_time_minutes": 20,
  "is_available": true
}
```

## File Processing Features

- **Automatic optimization**: Images are processed with 85% quality for optimal file size
- **Thumbnail generation**: 300px thumbnails are automatically created
- **Format support**: JPEG, PNG, and WebP formats are supported
- **Size validation**: Maximum file size is 5MB
- **Cloud storage**: Files are automatically uploaded to configured storage backend

## Example Implementation

See `examples/menu-item-creation-with-file.example.ts` for complete usage examples.

### Node.js Example

```typescript
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

async function createMenuItemWithImage(apiUrl: string, authToken: string, menuItemData: any, imagePath: string) {
  const formData = new FormData();
  
  // Add menu item data
  formData.append('category_id', menuItemData.category_id);
  formData.append('name', menuItemData.name);
  formData.append('price', menuItemData.price.toString());
  
  // Add image file
  formData.append('image', fs.createReadStream(imagePath));
  
  const response = await axios.post(`${apiUrl}/menu-items`, formData, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      ...formData.getHeaders(),
    },
  });
  
  return response.data;
}
```

### cURL Example

```bash
curl -X POST http://localhost:3000/menu-items \
  -H "Authorization: Bearer <jwt-token>" \
  -F "category_id=uuid-here" \
  -F "name=Margherita Pizza" \
  -F "price=12.99" \
  -F "image=@./pizza-image.jpg"
```

## Benefits

1. **Simplified workflow**: No need to pre-upload images before creating menu items
2. **Better UX**: Vendors can create complete menu items in a single request
3. **Automatic optimization**: Images are automatically processed for optimal performance
4. **Consistent storage**: All images use the same storage and processing pipeline
5. **Backward compatibility**: Existing functionality remains unchanged

## Migration Notes

- Existing code that creates menu items without images will continue to work
- The `image_url` field is still available for updates and existing items
- File uploads during creation are optional - items can still be created without images
- The existing image upload endpoint (`POST /menu-items/:id/image`) remains available for updating images

## Error Handling

- **File size exceeded**: Returns 400 error if file is larger than 5MB
- **Invalid file type**: Returns 400 error for unsupported image formats
- **Missing required fields**: Returns 400 error for missing category_id, name, or price
- **Authentication**: Returns 401 error for missing or invalid JWT token
- **Authorization**: Returns 403 error if user is not a vendor

## Configuration

The file processing behavior can be configured through environment variables:

- `UPLOAD_DIR`: Directory for file uploads (default: 'uploads')
- `MAX_FILE_SIZE`: Maximum file size in bytes (default: 10MB)
- `ALLOWED_MIME_TYPES`: Comma-separated list of allowed MIME types
- `CDN_URL`: CDN URL for serving uploaded files 