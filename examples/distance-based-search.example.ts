/**
 * Example: Distance-Based Menu Item Search
 * 
 * This example demonstrates how to use the distance-based sorting
 * functionality for menu items in the Rambini Food Ordering API.
 */

import { SearchMenuItemsDto, SortBy, SortOrder } from '../src/modules/menu/dto/search-menu-items.dto';

// Example customer locations (Lagos, Nigeria coordinates)
const CUSTOMER_LOCATIONS = {
  LAGOS_ISLAND: { latitude: 6.5244, longitude: 3.3792 },
  VICTORIA_ISLAND: { latitude: 6.4281, longitude: 3.4219 },
  IKEJA: { latitude: 6.6018, longitude: 3.3515 },
  SURULERE: { latitude: 6.4924, longitude: 3.3724 },
  YABA: { latitude: 6.5095, longitude: 3.3711 },
};

// Example search scenarios
export const searchExamples = {
  // Basic distance-based search
  basicSearch: (): SearchMenuItemsDto => ({
    query: 'pizza',
    latitude: CUSTOMER_LOCATIONS.LAGOS_ISLAND.latitude,
    longitude: CUSTOMER_LOCATIONS.LAGOS_ISLAND.longitude,
    max_distance: 5, // 5km radius
    page: 1,
    limit: 20,
  }),

  // Search with secondary sorting (distance first, then price)
  distanceWithPriceSort: (): SearchMenuItemsDto => ({
    query: 'burger',
    latitude: CUSTOMER_LOCATIONS.VICTORIA_ISLAND.latitude,
    longitude: CUSTOMER_LOCATIONS.VICTORIA_ISLAND.longitude,
    max_distance: 10,
    prioritize_distance: true,
    sort_by: SortBy.PRICE,
    sort_order: SortOrder.ASC, // Lowest price first
    page: 1,
    limit: 20,
  }),

  // Search without distance prioritization
  noDistancePriority: (): SearchMenuItemsDto => ({
    query: 'pasta',
    latitude: CUSTOMER_LOCATIONS.IKEJA.latitude,
    longitude: CUSTOMER_LOCATIONS.IKEJA.longitude,
    max_distance: 15,
    prioritize_distance: false,
    sort_by: SortBy.PRICE,
    sort_order: SortOrder.DESC, // Highest price first
    page: 1,
    limit: 20,
  }),

  // Category-specific search with distance
  categorySearch: (): SearchMenuItemsDto => ({
    category_id: 'fast-food',
    latitude: CUSTOMER_LOCATIONS.SURULERE.latitude,
    longitude: CUSTOMER_LOCATIONS.SURULERE.longitude,
    max_distance: 8,
    page: 1,
    limit: 20,
  }),

  // Price range search with distance
  priceRangeSearch: (): SearchMenuItemsDto => ({
    min_price: 500, // NGN 500
    max_price: 2000, // NGN 2000
    latitude: CUSTOMER_LOCATIONS.YABA.latitude,
    longitude: CUSTOMER_LOCATIONS.YABA.longitude,
    max_distance: 12,
    page: 1,
    limit: 20,
  }),

  // Search for available items only within distance
  availableItemsOnly: (): SearchMenuItemsDto => ({
    is_available: true,
    latitude: CUSTOMER_LOCATIONS.LAGOS_ISLAND.latitude,
    longitude: CUSTOMER_LOCATIONS.LAGOS_ISLAND.longitude,
    max_distance: 6,
    page: 1,
    limit: 20,
  }),
};

// Example API usage
export const apiUsageExamples = {
  // Using fetch API
  searchWithFetch: async (searchDto: SearchMenuItemsDto) => {
    const queryParams = new URLSearchParams();
    
    if (searchDto.query) queryParams.append('query', searchDto.query);
    if (searchDto.category_id) queryParams.append('category_id', searchDto.category_id);
    if (searchDto.latitude) queryParams.append('latitude', searchDto.latitude.toString());
    if (searchDto.longitude) queryParams.append('longitude', searchDto.longitude.toString());
    if (searchDto.max_distance) queryParams.append('max_distance', searchDto.max_distance.toString());
    if (searchDto.prioritize_distance !== undefined) {
      queryParams.append('prioritize_distance', searchDto.prioritize_distance.toString());
    }
    if (searchDto.sort_by) queryParams.append('sort_by', searchDto.sort_by);
    if (searchDto.sort_order) queryParams.append('sort_order', searchDto.sort_order);
    if (searchDto.page) queryParams.append('page', searchDto.page.toString());
    if (searchDto.limit) queryParams.append('limit', searchDto.limit.toString());

    const response = await fetch(`/api/menu/items/search?${queryParams.toString()}`);
    return await response.json();
  },

  // Using axios
  searchWithAxios: async (searchDto: SearchMenuItemsDto) => {
    const axios = require('axios');
    
    const response = await axios.get('/api/menu/items/search', {
      params: searchDto,
    });
    
    return response.data;
  },
};

// Example response handling
export const handleSearchResponse = (response: any) => {
  console.log(`Found ${response.total} menu items`);
  
  if (response.items.length > 0) {
    const itemsWithDistance = response.items.filter((item: any) => item.distance !== undefined);
    
    if (itemsWithDistance.length > 0) {
      console.log(`${itemsWithDistance.length} items include distance information`);
      
      const distances = itemsWithDistance.map((item: any) => item.distance);
      const minDistance = Math.min(...distances);
      const maxDistance = Math.max(...distances);
      
      console.log(`Distance range: ${minDistance} km to ${maxDistance} km`);
      
      // Show nearest items
      console.log('Nearest items:');
      itemsWithDistance
        .sort((a: any, b: any) => a.distance - b.distance)
        .slice(0, 3)
        .forEach((item: any, index: number) => {
          console.log(`${index + 1}. ${item.name} - ${item.vendor.business_name} (${item.distance} km)`);
        });
    }
  }
  
  return response;
};

// Example usage
export const runExamples = async () => {
  console.log('=== Distance-Based Search Examples ===\n');
  
  // Example 1: Basic search
  console.log('1. Basic distance-based search:');
  const basicSearch = searchExamples.basicSearch();
  console.log(JSON.stringify(basicSearch, null, 2));
  console.log();
  
  // Example 2: Search with secondary sorting
  console.log('2. Distance with price sorting:');
  const distancePriceSearch = searchExamples.distanceWithPriceSort();
  console.log(JSON.stringify(distancePriceSearch, null, 2));
  console.log();
  
  // Example 3: Category search
  console.log('3. Category-specific search:');
  const categorySearch = searchExamples.categorySearch();
  console.log(JSON.stringify(categorySearch, null, 2));
  console.log();
  
  // Example 4: Price range search
  console.log('4. Price range search:');
  const priceRangeSearch = searchExamples.priceRangeSearch();
  console.log(JSON.stringify(priceRangeSearch, null, 2));
  console.log();
  
  console.log('=== API Usage Examples ===\n');
  
  // Example API call (commented out as it requires a running server)
  /*
  try {
    const result = await apiUsageExamples.searchWithFetch(basicSearch);
    handleSearchResponse(result);
  } catch (error) {
    console.error('API call failed:', error.message);
  }
  */
};

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
} 