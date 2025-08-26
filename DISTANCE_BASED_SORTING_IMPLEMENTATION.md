# Distance-Based Sorting Implementation for Menu Items

## Overview

This document describes the implementation of distance-based sorting for menu items in the Rambini Food Ordering API. The feature allows customers to search for menu items and automatically receive results sorted by proximity to their location, with vendors filtered by maximum delivery distance.

## Features Implemented

### 1. Distance-Based Search & Sorting
- **Automatic Proximity Sorting**: Menu items are automatically sorted by distance from customer location when coordinates are provided
- **Distance Filtering**: Only vendors within a specified maximum distance are included in results
- **Hybrid Sorting**: Combines distance-based sorting with other sort criteria (price, name, etc.)
- **Configurable Priority**: Option to prioritize distance sorting over other criteria

### 2. Enhanced Search Parameters
- `latitude` & `longitude`: Customer location coordinates
- `max_distance`: Maximum delivery distance in kilometers (default: 10km, max: 50km)
- `prioritize_distance`: Whether to prioritize distance-based sorting (default: true)
- Enhanced sorting options with `SortBy` and `SortOrder` enums

### 3. Performance Optimizations
- **PostGIS Spatial Indexing**: Efficient spatial queries using PostGIS extension
- **Spatial Column**: Dedicated geometry column for vendor locations
- **Automatic Triggers**: Location updates automatically maintain spatial data integrity
- **Optimized Queries**: Uses `ST_DWithin` and `ST_Distance` for efficient proximity operations

## Technical Implementation

### Database Changes

#### New Migration: `1700000000013-AddSpatialIndexes.ts`
- Enables PostGIS extension
- Adds `location` geometry column to addresses table
- Creates spatial index using GIST for efficient proximity queries
- Implements automatic trigger for location updates

#### Enhanced Address Entity
- Maintains existing latitude/longitude fields
- Adds spatial geometry column for PostGIS operations
- Automatic coordinate-to-geometry conversion

### Repository Layer

#### MenuItemRepository Updates
- **Enhanced Search Query Builder**: Supports spatial queries and distance-based filtering
- **Proximity Filtering**: Uses `ST_DWithin` for efficient distance-based filtering
- **Distance-Based Sorting**: Prioritizes distance sorting when coordinates provided
- **Secondary Sorting**: Supports additional sort criteria after distance sorting

#### Key Query Features
```typescript
// Proximity filtering
ST_DWithin(vendor_address.location, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326), :maxDistance)

// Distance-based sorting
ST_Distance(vendor_address.location, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326))
```

### Service Layer

#### MenuItemService Enhancements
- **Enhanced Logging**: Detailed logging for distance-based searches
- **Distance Calculation**: Uses Haversine formula for accurate distance calculation
- **Response Enhancement**: Adds distance information to search results
- **Performance Monitoring**: Logs distance ranges and result counts

### DTO Enhancements

#### SearchMenuItemsDto
- **Enum-Based Sorting**: `SortBy` and `SortOrder` enums for type safety
- **Location Parameters**: Latitude, longitude, and max distance fields
- **Priority Control**: `prioritize_distance` flag for sorting behavior
- **Enhanced Validation**: Proper coordinate validation and constraints

#### MenuItemResponseDto
- **Distance Field**: Optional distance information when coordinates provided
- **Enhanced Documentation**: Clear API documentation with examples

## API Usage Examples

### Basic Distance-Based Search
```typescript
GET /api/menu/items/search?query=pizza&latitude=6.5244&longitude=3.3792&max_distance=5
```

### Search with Secondary Sorting
```typescript
GET /api/menu/items/search?query=burger&latitude=6.4281&longitude=3.4219&max_distance=10&sort_by=price&sort_order=ASC
```

### Search Without Distance Priority
```typescript
GET /api/menu/items/search?query=pasta&latitude=6.6018&longitude=3.3515&max_distance=15&prioritize_distance=false&sort_by=price&sort_order=DESC
```

## Response Format

### With Distance Information
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

## Performance Considerations

### Database Optimization
- **Spatial Indexes**: GIST indexes on geometry columns for fast spatial queries
- **Efficient JOINs**: Optimized table joins with vendor and address data
- **Query Optimization**: PostGIS spatial functions for proximity operations

### Caching Strategy
- **Result Caching**: Consider caching search results for frequently requested locations
- **Distance Caching**: Cache calculated distances for vendor-customer pairs

### Scalability
- **Pagination**: Efficient pagination for large result sets
- **Index Strategy**: Composite indexes for common search patterns
- **Query Limits**: Configurable result limits to prevent performance issues

## Error Handling

### Validation
- **Coordinate Validation**: Ensures valid latitude/longitude values
- **Distance Constraints**: Enforces reasonable distance limits (0-50km)
- **Required Fields**: Validates required parameters for distance-based searches

### Graceful Degradation
- **Missing Coordinates**: Falls back to regular sorting when coordinates not provided
- **Invalid Locations**: Handles vendors without location data gracefully
- **Calculation Errors**: Logs distance calculation errors without breaking search

## Testing

### Unit Tests
- **Service Tests**: Comprehensive testing of distance-based search functionality
- **Repository Tests**: Mock testing of spatial query operations
- **DTO Tests**: Validation testing for search parameters

### Integration Tests
- **API Tests**: End-to-end testing of search endpoints
- **Database Tests**: Spatial query performance testing
- **Edge Cases**: Testing boundary conditions and error scenarios

## Future Enhancements

### Advanced Features
- **Delivery Time Estimation**: Include estimated delivery time based on distance
- **Dynamic Pricing**: Adjust prices based on delivery distance
- **Route Optimization**: Consider traffic and route conditions
- **Real-time Location Updates**: Support for real-time customer location updates

### Performance Improvements
- **Geospatial Clustering**: Group nearby vendors for efficient querying
- **Predictive Caching**: Cache results for likely customer locations
- **CDN Integration**: Distribute search results globally for better performance

## Deployment Requirements

### Database Requirements
- **PostgreSQL 12+**: Required for PostGIS support
- **PostGIS Extension**: Must be enabled for spatial operations
- **Spatial Indexes**: Proper indexing for performance

### Application Requirements
- **TypeORM**: With spatial query support
- **Environment Variables**: PostGIS connection configuration
- **Monitoring**: Performance monitoring for spatial queries

## Monitoring & Maintenance

### Performance Metrics
- **Query Response Times**: Monitor spatial query performance
- **Index Usage**: Track spatial index utilization
- **Cache Hit Rates**: Monitor result caching effectiveness

### Maintenance Tasks
- **Index Maintenance**: Regular spatial index optimization
- **Data Validation**: Ensure coordinate data integrity
- **Performance Tuning**: Optimize queries based on usage patterns

## Conclusion

The distance-based sorting implementation provides a robust, performant solution for location-aware menu item searches. The use of PostGIS spatial functions ensures efficient proximity queries, while the flexible sorting system allows for both distance-prioritized and traditional search results. The implementation is designed for scalability and includes comprehensive error handling and monitoring capabilities. 