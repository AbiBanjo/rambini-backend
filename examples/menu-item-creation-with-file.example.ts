/**
 * Example: Creating a Menu Item with File Upload
 * 
 * This example demonstrates how to use the new menu item creation API
 * that handles file uploads directly instead of requiring a pre-uploaded image URL.
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

// Example function to create a menu item with image upload
async function createMenuItemWithImage(
  apiUrl: string,
  authToken: string,
  menuItemData: {
    category_id: string;
    name: string;
    description?: string;
    price: number;
    preparation_time_minutes?: number;
    is_available?: boolean;
  },
  imageFilePath: string
) {
  try {
    // Create form data
    const formData = new FormData();
    
    // Add menu item data
    formData.append('category_id', menuItemData.category_id);
    formData.append('name', menuItemData.name);
    if (menuItemData.description) {
      formData.append('description', menuItemData.description);
    }
    formData.append('price', menuItemData.price.toString());
    if (menuItemData.preparation_time_minutes) {
      formData.append('preparation_time_minutes', menuItemData.preparation_time_minutes.toString());
    }
    if (menuItemData.is_available !== undefined) {
      formData.append('is_available', menuItemData.is_available.toString());
    }
    
    // Add image file
    formData.append('image', fs.createReadStream(imageFilePath));
    
    // Make API request
    const response = await axios.post(`${apiUrl}/menu-items`, formData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...formData.getHeaders(),
      },
    });
    
    console.log('Menu item created successfully:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('Error creating menu item:', error.response?.data || error.message);
    throw error;
  }
}

// Example function to create a menu item without image
async function createMenuItemWithoutImage(
  apiUrl: string,
  authToken: string,
  menuItemData: {
    category_id: string;
    name: string;
    description?: string;
    price: number;
    preparation_time_minutes?: number;
    is_available?: boolean;
  }
) {
  try {
    // Make API request with JSON data
    const response = await axios.post(`${apiUrl}/menu-items`, menuItemData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Menu item created successfully:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('Error creating menu item:', error.response?.data || error.message);
    throw error;
  }
}

// Usage examples
async function main() {
  const apiUrl = 'http://localhost:3000';
  const authToken = 'your-jwt-token-here';
  
  // Example 1: Create menu item with image
  console.log('Creating menu item with image...');
  await createMenuItemWithImage(
    apiUrl,
    authToken,
    {
      category_id: 'category-uuid-here',
      name: 'Margherita Pizza',
      description: 'Classic tomato sauce with mozzarella cheese',
      price: 12.99,
      preparation_time_minutes: 20,
      is_available: true,
    },
    './images/margherita-pizza.jpg'
  );
  
  // Example 2: Create menu item without image
  console.log('Creating menu item without image...');
  await createMenuItemWithoutImage(
    apiUrl,
    authToken,
    {
      category_id: 'category-uuid-here',
      name: 'Caesar Salad',
      description: 'Fresh romaine lettuce with caesar dressing',
      price: 8.99,
      preparation_time_minutes: 10,
      is_available: true,
    }
  );
}

// Run examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  createMenuItemWithImage,
  createMenuItemWithoutImage,
}; 