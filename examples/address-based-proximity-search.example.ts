/**
 * Example: Address-based Proximity Search for Menu Items
 * 
 * This example demonstrates how to use the enhanced searchMenuItems functionality
 * that supports both direct coordinates and address_id for proximity-based search.
 */

import { SearchMenuItemsDto, SortBy, SortOrder } from '../src/modules/menu/dto';

// Example 1: Search using direct coordinates
const searchWithCoordinates: SearchMenuItemsDto = {
  query: 'pizza',
  latitude: 6.5244,        // Lagos, Nigeria coordinates
  longitude: 3.3792,
  max_distance: 5,         // 5km radius
  prioritize_distance: true,
  page: 1,
  limit: 20
};

// Example 2: Search using saved address ID
const searchWithAddressId: SearchMenuItemsDto = {
  query: 'burger',
  address_id: 'user-address-123',  // Use saved address instead of coordinates
  max_distance: 8,                 // 8km radius
  prioritize_distance: true,
  sort_by: SortBy.PRICE,           // Secondary sort by price
  sort_order: SortOrder.ASC,       // Lowest price first
  page: 1,
  limit: 20
};

// Example 3: Search using address ID with default max_distance
const searchWithAddressIdDefault: SearchMenuItemsDto = {
  query: 'pasta',
  address_id: 'user-address-456',  // Will use default 10km max_distance
  prioritize_distance: false,       // Disable distance prioritization
  sort_by: SortBy.NAME,            // Sort by name instead
  sort_order: SortOrder.ASC,       // Alphabetical order
  page: 1,
  limit: 20
};

// Example 4: Search without location (no proximity sorting)
const searchWithoutLocation: SearchMenuItemsDto = {
  query: 'dessert',
  category_id: 'desserts-category-id',
  sort_by: SortBy.PRICE,
  sort_order: SortOrder.ASC,
  page: 1,
  limit: 20
};

// Example 5: Search with coordinates and custom filters
const searchWithCustomFilters: SearchMenuItemsDto = {
  query: 'chicken',
  latitude: 6.4281,        // Different location in Lagos
  longitude: 3.4219,
  max_distance: 12,        // 12km radius
  min_price: 500,          // Minimum price in Naira
  max_price: 5000,         // Maximum price in Naira
  delivery_only: true,     // Only vendors that deliver
  prioritize_distance: true,
  page: 1,
  limit: 20
};

/**
 * API Usage Examples:
 * 
 * 1. Search with coordinates:
 * GET /api/menu-items/search?query=pizza&latitude=6.5244&longitude=3.3792&max_distance=5
 * 
 * 2. Search with address ID:
 * GET /api/menu-items/search?query=burger&address_id=user-address-123&max_distance=8
 * 
 * 3. Search with address ID (default distance):
 * GET /api/menu-items/search?query=pasta&address_id=user-address-456
 * 
 * 4. Search without location:
 * GET /api/menu-items/search?query=dessert&category_id=desserts-category-id
 * 
 * 5. Search with custom filters:
 * GET /api/menu-items/search?query=chicken&latitude=6.4281&longitude=3.4219&max_distance=12&min_price=500&max_price=5000&delivery_only=true
 */

/**
 * Response Structure:
 * 
 * When coordinates or address_id is provided, each menu item includes distance information:
 * 
 * {
 *   "items": [
 *     {
 *       "id": "menu-item-1",
 *       "name": "Margherita Pizza",
 *       "price": 2500,
 *       "description": "Classic tomato and mozzarella pizza",
 *       "vendor": {
 *         "id": "vendor-1",
 *         "business_name": "Pizza Palace",
 *         "address": {
 *           "latitude": 6.5244,
 *           "longitude": 3.3792
 *         }
 *       },
 *       "distance": 2.5  // Distance in kilometers from search location
 *     }
 *   ],
 *   "total": 1
 * }
 * 
 * When no coordinates are provided, the distance field is not included.
 */

export {
  searchWithCoordinates,
  searchWithAddressId,
  searchWithAddressIdDefault,
  searchWithoutLocation,
  searchWithCustomFilters
}; 