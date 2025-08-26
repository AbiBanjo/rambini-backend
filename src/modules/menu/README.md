# Menu Module - Distance-Based Sorting

This module provides distance-based sorting and filtering for menu items based on customer location and vendor business location.

## Features

### Distance-Based Search
- **Proximity Sorting**: Menu items are automatically sorted by distance from customer location when coordinates are provided
- **Distance Filtering**: Only vendors within a specified maximum distance are included in results
- **Hybrid Sorting**: Combines distance-based sorting with other sort criteria (price, name, etc.)

### Search Parameters

#### Location Parameters
- `latitude` (number): Customer's latitude coordinate
- `longitude` (number): Customer's longitude coordinate
- `max_distance` (number): Maximum delivery distance in kilometers (default: 10km, max: 50km)

#### Sorting Parameters
- `prioritize_distance` (boolean): Whether to prioritize distance-based sorting over other criteria (default: true)
- `sort_by`: Field to sort by (name, price, created_at, distance)
- `sort_order`: Sort order (ASC, DESC)

## Usage Examples

### Basic Distance-Based Search
```typescript
// Search for pizza within 5km of customer location
const searchDto: SearchMenuItemsDto = {
  query: 'pizza',
  latitude: 6.5244,
  longitude: 3.3792,
  max_distance: 5,
  page: 1,
  limit: 20
};

const result = await menuItemService.searchMenuItems(searchDto);
```

### Distance-Based Search with Secondary Sorting
```typescript
// Sort by distance first, then by price (lowest first)
const searchDto: SearchMenuItemsDto = {
  query: 'burger',
  latitude: 6.5244,
  longitude: 3.3792,
  max_distance: 10,
  prioritize_distance: true,
  sort_by: 'price',
  sort_order: 'ASC',
  page: 1,
  limit: 20
};
```

### Search Without Distance Prioritization
```typescript
// Use regular sorting even when coordinates are provided
const searchDto: SearchMenuItemsDto = {
  query: 'pasta',
  latitude: 6.5244,
  longitude: 3.3792,
  max_distance: 15,
  prioritize_distance: false,
  sort_by: 'price',
  sort_order: 'DESC',
  page: 1,
  limit: 20
};
```

## Response Format

When coordinates are provided, each menu item includes a `distance` field:

```json
{
  "items": [
    {
      "id": "1",
      "name": "Margherita Pizza",
      "price": 15.99,
      "vendor": {
        "id": "vendor1",
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

## Technical Implementation

### Database Queries
- Uses PostGIS spatial functions for efficient proximity filtering
- `ST_DWithin` for distance-based filtering
- `ST_Distance` for distance-based sorting

### Distance Calculation
- Haversine formula for accurate distance calculation
- Distances are calculated in kilometers and rounded to 2 decimal places
- Results are automatically sorted by distance (nearest first)

### Performance Considerations
- Spatial indexes on vendor address coordinates
- Efficient JOIN operations with vendor and address tables
- Pagination support for large result sets

## Requirements

### Database
- PostgreSQL with PostGIS extension
- Spatial indexes on address coordinates

### Dependencies
- TypeORM with spatial query support
- PostGIS spatial functions

## Error Handling

- Invalid coordinates are validated at the DTO level
- Missing vendor addresses are handled gracefully
- Distance calculation errors are logged but don't break the search

## Testing

Run the test suite to verify distance-based functionality:

```bash
npm run test:menu
```

## API Endpoints

### Search Menu Items
```
GET /api/menu/items/search
```

**Query Parameters:**
- All standard search parameters
- `latitude`, `longitude` for location-based search
- `max_distance` for proximity filtering
- `prioritize_distance` for sorting priority control

## Future Enhancements

- **Delivery Time Estimation**: Include estimated delivery time based on distance
- **Dynamic Pricing**: Adjust prices based on delivery distance
- **Route Optimization**: Consider traffic and route conditions
- **Real-time Location Updates**: Support for real-time customer location updates 