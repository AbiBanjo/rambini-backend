import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

/**
 * Load environment variables based on NODE_ENV
 * This ensures the correct environment file is loaded before the application starts
 */
export function loadEnvironmentVariables(): void {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const envFile = `.env.${nodeEnv}`;
  const envPath = path.resolve(process.cwd(), envFile);
  
  console.log(`🔧 Loading environment: ${nodeEnv}`);
  console.log(`📁 Environment file: ${envFile}`);
  
  // Check if environment-specific file exists
  if (fs.existsSync(envPath)) {
    console.log(`✅ Found environment file: ${envPath}`);
    dotenv.config({ path: envPath });
  } else {
    console.log(`⚠️  Environment file not found: ${envPath}`);
    
    // Fallback to .env file
    const fallbackPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(fallbackPath)) {
      console.log(`📁 Using fallback file: .env`);
      dotenv.config({ path: fallbackPath });
    } else {
      console.log(`❌ No environment file found. Using system environment variables only.`);
    }
  }
  
  // Log loaded environment variables (without sensitive data)
  const loadedEnvVars = [
    'NODE_ENV',
    'PORT',
    'DB_HOST',
    'DB_DATABASE',
    'REDIS_HOST',
    'JWT_SECRET',
    'AWS_REGION',
    'PAYSTACK_PUBLIC_KEY',
    'STRIPE_PUBLIC_KEY',
    'SHIPBUBBLE_API_KEY',
    'UBER_CLIENT_ID'
  ];
  
  console.log('🔍 Loaded environment variables:');
  loadedEnvVars.forEach(key => {
    const value = process.env[key];
    if (value) {
      // Mask sensitive values
      const maskedValue = key.includes('SECRET') || key.includes('KEY') || key.includes('PASSWORD') 
        ? '*'.repeat(Math.min(value.length, 8))
        : value;
      console.log(`   ${key}: ${maskedValue}`);
    } else {
      console.log(`   ${key}: ❌ NOT SET`);
    }
  });
}

/**
 * Validate required environment variables
 * Throws an error if any required variables are missing
 */
export function validateRequiredEnvironmentVariables(): void {
  const requiredVars = [
    'DB_HOST',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
    'JWT_SECRET',
    'SHIPBUBBLE_API_KEY',
  ];
  
  const missingVars: string[] = [];
  
  requiredVars.forEach(key => {
    if (!process.env[key]) {
      missingVars.push(key);
    }
  });
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(key => {
      console.error(`   - ${key}`);
    });
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  console.log('✅ All required environment variables are set');
}
