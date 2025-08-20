# Error Handling System - Rambini Backend

## Overview

The Rambini backend now includes a comprehensive error handling system that provides detailed, user-friendly error messages instead of generic "Internal Server Error" responses. This system is particularly focused on handling database errors and providing actionable feedback to API consumers.

## Features

- **Database Error Handling**: Catches and translates database errors into user-friendly messages
- **Validation Error Handling**: Provides detailed validation error information
- **Consistent Error Format**: All errors follow the same response structure
- **Development Mode**: Includes additional debugging information in development
- **Comprehensive Logging**: Logs all errors with context for debugging

## Error Response Format

All errors follow this consistent format:

```json
{
  "success": false,
  "error": {
    "message": "User-friendly error message",
    "type": "error_type",
    "statusCode": 400,
    "timestamp": "2025-08-19T04:30:00.000Z",
    "path": "/api/v1/vendors",
    "method": "POST",
    "details": [
      {
        "field": "country",
        "value": "Nigeria",
        "message": "Country must be exactly 2 characters",
        "constraint": "Length"
      }
    ],
    "code": "22001",
    "field": "country",
    "maxLength": 2
  }
}
```

## Database Error Codes

The system handles common PostgreSQL error codes:

| Code | Type | Message | Example |
|------|------|---------|---------|
| `23505` | Unique Violation | Data already exists with the same unique identifier | Duplicate email/phone |
| `23503` | Foreign Key Violation | Referenced data does not exist | Invalid user_id reference |
| `23502` | Not Null Violation | Required field is missing | Missing required field |
| `22P02` | Invalid Text Representation | Invalid data format provided | Invalid UUID format |
| `42703` | Undefined Column | Invalid field specified | Field doesn't exist |
| `42P01` | Undefined Table | Invalid table specified | Table doesn't exist |
| `42824` | Wrong Object Type | Invalid data type for field | Wrong data type |
| `22001` | String Data Right Truncation | Data too long for field | Country "Nigeria" in 2-char field |
| `23514` | Check Violation | Data doesn't meet validation requirements | Invalid enum value |

## Implementation

### 1. Global Exception Filters

The system uses three global exception filters (in order of specificity):

1. **DatabaseExceptionFilter**: Catches database-related errors
2. **ValidationExceptionFilter**: Catches validation errors
3. **HttpExceptionFilter**: Catches HTTP exceptions

### 2. Error Handler Service

The `ErrorHandlerService` provides utilities for handling errors throughout the application:

```typescript
import { ErrorHandlerService } from '../common/services';

@Injectable()
export class YourService {
  constructor(private readonly errorHandler: ErrorHandlerService) {}

  async someMethod() {
    try {
      // Your database operations
    } catch (error) {
      if (this.errorHandler.isDatabaseError(error)) {
        this.errorHandler.logError(error, { context: 'someMethod' });
        throw this.errorHandler.createDatabaseException(error);
      }
      throw error;
    }
  }
}
```

### 3. Usage in Services

Example of using error handling in a service:

```typescript
async createVendor(userId: string, createVendorDto: CreateVendorDto): Promise<Vendor> {
  try {
    // Database operations
    const vendor = await this.vendorRepository.save(vendorData);
    return vendor;
  } catch (error) {
    // Handle database errors specifically
    if (this.errorHandler.isDatabaseError(error)) {
      this.errorHandler.logError(error, { userId, createVendorDto });
      throw this.errorHandler.createDatabaseException(error);
    }
    
    // Re-throw other errors
    throw error;
  }
}
```

## Configuration

### Environment Variables

```bash
# Enable development mode for detailed error information
NODE_ENV=development

# Logging configuration
LOG_LEVEL=error
LOG_FILE_PATH=logs/app.log
```

### Main Application Setup

The filters are automatically applied in `main.ts`:

```typescript
// Global exception filters (order matters - most specific first)
app.useGlobalFilters(
  new DatabaseExceptionFilter(),
  new ValidationExceptionFilter(),
  new HttpExceptionFilter(),
);
```

## Example Error Responses

### 1. Database Constraint Violation

**Request**: POST `/api/v1/vendors` with country "Nigeria"
**Response**:
```json
{
  "success": false,
  "error": {
    "message": "Data too long for field",
    "type": "database_error",
    "statusCode": 400,
    "timestamp": "2025-08-19T04:30:00.000Z",
    "path": "/api/v1/vendors",
    "method": "POST",
    "code": "22001",
    "field": "country",
    "maxLength": 2
  }
}
```

### 2. Validation Error

**Request**: POST `/api/v1/vendors` with invalid data
**Response**:
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "type": "validation_error",
    "statusCode": 400,
    "timestamp": "2025-08-19T04:30:00.000Z",
    "path": "/api/v1/vendors",
    "method": "POST",
    "details": [
      {
        "field": "country",
        "value": "Nigeria",
        "message": "Country must be exactly 2 characters",
        "constraint": "Length"
      }
    ]
  }
}
```

### 3. Entity Not Found

**Request**: GET `/api/v1/vendors/999999`
**Response**:
```json
{
  "success": false,
  "error": {
    "message": "Requested data not found",
    "type": "entity_not_found",
    "statusCode": 404,
    "timestamp": "2025-08-19T04:30:00.000Z",
    "path": "/api/v1/vendors/999999",
    "method": "GET"
  }
}
```

## Development vs Production

### Development Mode (`NODE_ENV=development`)

Includes additional debugging information:
- Full error stack traces
- Original error details
- Additional context information

### Production Mode (`NODE_ENV=production`)

Provides clean, user-friendly responses:
- No stack traces
- Sanitized error messages
- Focus on actionable information

## Best Practices

### 1. Always Use Try-Catch

Wrap database operations in try-catch blocks:

```typescript
try {
  const result = await this.repository.save(data);
  return result;
} catch (error) {
  if (this.errorHandler.isDatabaseError(error)) {
    throw this.errorHandler.createDatabaseException(error);
  }
  throw error;
}
```

### 2. Log Errors with Context

Always log errors with relevant context:

```typescript
this.errorHandler.logError(error, {
  userId: user.id,
  operation: 'createVendor',
  data: createVendorDto
});
```

### 3. Use Specific Error Types

Leverage the error type information for client-side handling:

```typescript
if (error.error.type === 'validation_error') {
  // Handle validation errors
} else if (error.error.type === 'database_error') {
  // Handle database errors
}
```

### 4. Test Error Scenarios

Test your API with invalid data to ensure proper error handling:

```bash
# Test with invalid country
curl -X POST http://localhost:3000/api/v1/vendors \
  -H "Content-Type: application/json" \
  -d '{"country": "Nigeria"}'

# Should return detailed error about country field length
```

## Troubleshooting

### Common Issues

1. **Errors Still Return Generic Messages**
   - Check that exception filters are properly registered in `main.ts`
   - Verify the order of filters (most specific first)

2. **Validation Errors Not Caught**
   - Ensure `ValidationPipe` is configured with `exceptionFactory`
   - Check that `ValidationExceptionFilter` is registered

3. **Database Errors Not Translated**
   - Verify that `DatabaseExceptionFilter` is registered first
   - Check that errors are being caught by the filter

### Debug Mode

Enable debug logging to see what's happening:

```bash
LOG_LEVEL=debug npm run start:dev
```

## Migration Guide

### From Old Error Handling

**Before**:
```typescript
// Generic error handling
} catch (error) {
  throw new InternalServerErrorException('Something went wrong');
}
```

**After**:
```typescript
// Specific error handling
} catch (error) {
  if (this.errorHandler.isDatabaseError(error)) {
    throw this.errorHandler.createDatabaseException(error);
  }
  throw error;
}
```

### Benefits

- **Better User Experience**: Clear, actionable error messages
- **Easier Debugging**: Detailed error information in development
- **Consistent API**: All errors follow the same format
- **Better Logging**: Comprehensive error logging with context
- **Client Integration**: Easier to handle errors on the frontend

## Support

For issues or questions about the error handling system:

1. Check the logs for detailed error information
2. Verify filter registration in `main.ts`
3. Test with the provided examples
4. Review the error response format documentation 