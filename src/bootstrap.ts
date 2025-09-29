/**
 * Bootstrap file for Rambini Backend
 * 
 * This file ensures proper initialization order and crypto polyfill
 * application before starting the NestJS application.
 */

// Apply crypto polyfill first
import './crypto-polyfill';

// Then import and start the main application
import { main } from './main';

// Start the application
main().catch((error) => {
  console.error('💥 Failed to start Rambini Backend:', error);
  process.exit(1);
});
