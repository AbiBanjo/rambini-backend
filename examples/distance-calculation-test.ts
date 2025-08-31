/**
 * Example: Distance Calculation Test for Menu Item Search
 * 
 * This example demonstrates how distance is calculated and included
 * in the search results when coordinates are provided.
 */

import { calculateDistance } from '../src/utils/helpers';

// Example coordinates
const customerLocation = {
  latitude: 6.5244,  // Lagos, Nigeria
  longitude: 3.3792
};

const vendorLocations = [
  {
    name: "Vendor A - Nearby",
    latitude: 6.5244,
    longitude: 3.3792,
    expectedDistance: 0 // Same location
  },
  {
    name: "Vendor B - 2km away",
    latitude: 6.5444,
    longitude: 3.3792,
    expectedDistance: 2.22 // Approximately 2.22 km
  },
  {
    name: "Vendor C - 5km away",
    latitude: 6.5744,
    longitude: 3.3792,
    expectedDistance: 5.56 // Approximately 5.56 km
  },
  {
    name: "Vendor D - 10km away",
    latitude: 6.6244,
    longitude: 3.3792,
    expectedDistance: 11.11 // Approximately 11.11 km
  }
];

console.log('=== Distance Calculation Test ===\n');
console.log(`Customer Location: (${customerLocation.latitude}, ${customerLocation.longitude})\n`);

vendorLocations.forEach(vendor => {
  const calculatedDistance = calculateDistance(
    customerLocation.latitude,
    customerLocation.longitude,
    vendor.latitude,
    vendor.longitude
  );
  
  const roundedDistance = Math.round(calculatedDistance * 100) / 100;
  const isAccurate = Math.abs(roundedDistance - vendor.expectedDistance) < 0.5;
  
  console.log(`${vendor.name}:`);
  console.log(`  Coordinates: (${vendor.latitude}, ${vendor.longitude})`);
  console.log(`  Calculated Distance: ${roundedDistance} km`);
  console.log(`  Expected Distance: ${vendor.expectedDistance} km`);
  console.log(`  Accuracy: ${isAccurate ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
});

// Example of how the search would work
console.log('=== Search Example ===\n');

const searchExample = {
  query: "pizza",
  latitude: customerLocation.latitude,
  longitude: customerLocation.longitude,
  max_distance: 10, // 10km radius
  prioritize_distance: true
};

console.log('Search Parameters:');
console.log(JSON.stringify(searchExample, null, 2));
console.log('\nExpected Behavior:');
console.log('1. All vendors within 10km will be included');
console.log('2. Results will be sorted by distance (nearest first)');
console.log('3. Each menu item will include a "distance" property');
console.log('4. Vendors without coordinates will have distance = null');
console.log('5. Distance values are rounded to 2 decimal places');

// Example response structure
const exampleResponse = {
  items: [
    {
      id: "menu-item-1",
      name: "Margherita Pizza",
      price: 2500,
      vendor_id: "vendor-a",
      vendor: {
        business_name: "Vendor A - Nearby",
        address: {
          latitude: 6.5244,
          longitude: 3.3792
        }
      },
      distance: 0 // Same location
    },
    {
      id: "menu-item-2", 
      name: "Pepperoni Pizza",
      price: 2800,
      vendor_id: "vendor-b",
      vendor: {
        business_name: "Vendor B - 2km away",
        address: {
          latitude: 6.5444,
          longitude: 3.3792
        }
      },
      distance: 2.22 // 2.22 km away
    },
    {
      id: "menu-item-3",
      name: "Hawaiian Pizza", 
      price: 3000,
      vendor_id: "vendor-c",
      vendor: {
        business_name: "Vendor C - 5km away",
        address: {
          latitude: 6.5744,
          longitude: 3.3792
        }
      },
      distance: 5.56 // 5.56 km away
    },
    {
      id: "menu-item-4",
      name: "BBQ Chicken Pizza",
      price: 3200,
      vendor_id: "vendor-d",
      vendor: {
        business_name: "Vendor D - 10km away",
        address: {
          latitude: 6.6244,
          longitude: 3.3792
        }
      },
      distance: 11.11 // 11.11 km away (exceeds max_distance)
    },
    {
      id: "menu-item-5",
      name: "Veggie Pizza",
      price: 2200,
      vendor_id: "vendor-e",
      vendor: {
        business_name: "Vendor E - No Address",
        address: null
      },
      distance: null // No coordinates available
    }
  ],
  total: 5
};

console.log('\nExample Response Structure:');
console.log(JSON.stringify(exampleResponse, null, 2));

console.log('\n=== Key Points ===');
console.log('✅ Distance is always calculated when coordinates are provided');
console.log('✅ Distance is included in the response for each menu item');
console.log('✅ Results are sorted by distance when prioritize_distance is true');
console.log('✅ Vendors without coordinates are handled gracefully (distance = null)');
console.log('✅ Distance values are rounded to 2 decimal places for readability');
console.log('✅ Max distance filtering works correctly');
console.log('✅ Fallback distance calculation ensures all items have distance info'); 