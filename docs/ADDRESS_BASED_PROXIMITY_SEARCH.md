# Address-Based Proximity Search

This document describes the enhanced proximity search functionality for menu items that supports both direct coordinates and saved address IDs.

## Overview

The `searchMenuItems` endpoint now supports two methods for location-based search:
1. **Direct Coordinates**: Provide `latitude` and `longitude` directly
2. **Address ID**: Provide `address_id` to use coordinates from a saved address

## New Features

### Address ID Support
- **Field**: `address_id` (optional string)
- **Purpose**: Use coordinates from a saved address instead of providing coordinates directly
- **Benefits**: 
  - Reuse saved addresses for consistent search locations
  - Avoid coordinate input errors
  - Better user experience for returning customers

### Enhanced Default Distance Handling
- **Default max_distance**: 10km when not specified
- **Configurable range**: 0.5km to 50km
- **Smart fallback**: Uses 15km for delivery-only filtering when max_distance not specified

## API Usage

### Search with Direct Coordinates
```http
GET /api/menu-items/search?query=pizza&latitude=6.5244&longitude=3.3792&max_distance=5
```

### Search with Address ID
```http
GET /api/menu-items/search?query=burger&address_id=user-address-123&max_distance=8
```

### Search with Address ID (Default Distance)
```http
GET /api/menu-items/search?query=pasta&address_id=user-address-456
```

## Request Parameters

### Location Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `latitude` | number | No* | Customer latitude coordinate |
| `longitude` | number | No* | Customer longitude coordinate |
| `address_id` | string | No* | Address ID to use for coordinates |
| `max_distance` | number | No | Maximum delivery distance in km (default: 10) |

*Either provide `latitude` + `longitude` OR `address_id`, but not both

### Search Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | No | Search query for menu item name/description |
| `category_id` | string | No | Filter by category |
| `vendor_id` | string | No | Filter by vendor |
| `min_price` | number | No | Minimum price filter |
| `max_price` | number | No | Maximum price filter |
| `is_available` | boolean | No | Filter by availability |

### Sorting Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort_by` | enum | No | Sort field (name, price, created_at, distance) |
| `sort_order` | enum | No | Sort order (ASC, DESC) |
| `prioritize_distance` | boolean | No | Prioritize distance sorting (default: true) |

### Pagination Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |

## Response Format

### With Location Information
When coordinates or address_id is provided, each menu item includes distance information:

```json
{
  "items": [
    {
      "id": "menu-item-1",
      "name": "Margherita Pizza",
      "price": 2500,
      "description": "Classic tomato and mozzarella pizza",
      "vendor": {
        "id": "vendor-1",
        "business_name": "Pizza Palace",
        "address": {
          "latitude": 6.5244,
          "longitude": 3.3792
        }
      },
      "distance": 2.5
    }
  ],
  "total": 1
}
```

### Without Location Information
When no coordinates or address_id is provided, distance field is not included:

```json
{
  "items": [
    {
      "id": "menu-item-1",
      "name": "Margherita Pizza",
      "price": 2500,
      "description": "Classic tomato and mozzarella pizza",
      "vendor": {
        "id": "vendor-1",
        "business_name": "Pizza Palace"
      }
    }
  ],
  "total": 1
}
```

## Implementation Details

### Coordinate Resolution
1. **Address ID Processing**: If `address_id` is provided, fetch the address and extract coordinates
2. **Validation**: Ensure both latitude and longitude are present and within valid ranges
3. **Fallback**: Use default max_distance (10km) if not specified

### Distance Calculation
- Uses Haversine formula for accurate distance calculation
- Distances are calculated in kilometers
- Results are automatically sorted by distance (nearest first) when coordinates provided

### Error Handling
- **Invalid Address ID**: Returns 400 Bad Request if address not found
- **Missing Coordinates**: Returns 400 Bad Request if address has no coordinates
- **Invalid Coordinates**: Returns 400 Bad Request if coordinates are out of range

## Examples

### Basic Proximity Search
```typescript
const searchParams: SearchMenuItemsDto = {
  query: 'pizza',
  latitude: 6.5244,
  longitude: 3.3792,
  max_distance: 5,
  prioritize_distance: true
};
```

### Address-Based Search
```typescript
const searchParams: SearchMenuItemsDto = {
  query: 'burger',
  address_id: 'user-address-123',
  max_distance: 8,
  sort_by: SortBy.PRICE,
  sort_order: SortOrder.ASC
};
```

### Search Without Location
```typescript
const searchParams: SearchMenuItemsDto = {
  query: 'dessert',
  category_id: 'desserts-category-id',
  sort_by: SortBy.NAME,
  sort_order: SortOrder.ASC
};
```

## Benefits

1. **Flexibility**: Support both direct coordinates and saved addresses
2. **User Experience**: Better UX for returning customers with saved addresses
3. **Accuracy**: Consistent location data from saved addresses
4. **Performance**: Efficient distance-based filtering and sorting
5. **Default Values**: Sensible defaults for common use cases

## Testing

Run the test suite to verify functionality:

```bash
npm run test:menu
```

The tests cover:
- Direct coordinate search
- Address ID-based search
- Default max_distance handling
- Error cases for invalid addresses
- Search without location information

## Migration Notes

This enhancement is backward compatible. Existing API calls using `latitude` and `longitude` will continue to work unchanged. The new `address_id` parameter provides an alternative method for location-based search. 