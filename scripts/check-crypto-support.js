#!/usr/bin/env node
/**
 * Crypto Support Diagnostic Script
 * 
 * This script checks crypto availability and compatibility for NestJS Schedule module.
 * Run this on your EC2 instance to diagnose the crypto issue.
 * 
 * Usage: node scripts/check-crypto-support.js
 */

console.log('🔍 Crypto Support Diagnostic Report');
console.log('=====================================\n');

// Environment Information
console.log('📋 Environment Information:');
console.log(`   Node.js Version: ${process.version}`);
console.log(`   Platform: ${process.platform}`);
console.log(`   Architecture: ${process.arch}`);
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);

// Check Node.js crypto module
console.log('🔐 Node.js Crypto Module:');
try {
  const crypto = require('crypto');
  console.log('   ✓ Node.js crypto module available');
  console.log(`   ✓ crypto.randomBytes: ${typeof crypto.randomBytes === 'function'}`);
  console.log(`   ✓ crypto.randomUUID: ${typeof crypto.randomUUID === 'function'}`);
  console.log(`   ✓ crypto.webcrypto: ${typeof crypto.webcrypto !== 'undefined'}`);
  
  // Test crypto functions
  try {
    const testBytes = crypto.randomBytes(16);
    console.log(`   ✓ crypto.randomBytes test: ${testBytes.length} bytes generated`);
  } catch (error) {
    console.log(`   ✗ crypto.randomBytes test failed: ${error.message}`);
  }
  
  try {
    const testUUID = crypto.randomUUID ? crypto.randomUUID() : 'not available';
    console.log(`   ✓ crypto.randomUUID test: ${testUUID}`);
  } catch (error) {
    console.log(`   ✗ crypto.randomUUID test failed: ${error.message}`);
  }
  
} catch (error) {
  console.log(`   ✗ Node.js crypto module not available: ${error.message}`);
}

console.log();

// Check global crypto
console.log('🌐 Global Crypto Object:');
if (typeof globalThis.crypto !== 'undefined') {
  console.log('   ✓ globalThis.crypto is available');
  console.log(`   ✓ getRandomValues: ${typeof globalThis.crypto.getRandomValues === 'function'}`);
  console.log(`   ✓ randomUUID: ${typeof globalThis.crypto.randomUUID === 'function'}`);
  console.log(`   ✓ subtle: ${typeof globalThis.crypto.subtle !== 'undefined'}`);
  
  // Test global crypto functions
  try {
    const testArray = new Uint8Array(16);
    globalThis.crypto.getRandomValues(testArray);
    console.log(`   ✓ getRandomValues test: ${testArray.length} bytes filled`);
  } catch (error) {
    console.log(`   ✗ getRandomValues test failed: ${error.message}`);
  }
  
  try {
    const testUUID = globalThis.crypto.randomUUID();
    console.log(`   ✓ randomUUID test: ${testUUID}`);
  } catch (error) {
    console.log(`   ✗ randomUUID test failed: ${error.message}`);
  }
  
} else {
  console.log('   ✗ globalThis.crypto is not available');
}

console.log();

// Apply polyfill and test
console.log('🔧 Applying Crypto Polyfill:');
try {
  // Apply the same polyfill as in our main.ts
  if (typeof globalThis.crypto === 'undefined') {
    try {
      const crypto = require('crypto');
      globalThis.crypto = {
        getRandomValues(array) {
          const bytes = crypto.randomBytes(array.length);
          for (let i = 0; i < array.length; i++) {
            array[i] = bytes[i];
          }
          return array;
        },
        randomUUID() {
          return crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
        },
      };
      console.log('   ✓ Polyfill applied using Node.js crypto');
    } catch {
      globalThis.crypto = {
        getRandomValues(array) {
          for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
          }
          return array;
        },
        randomUUID() {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
          });
        },
      };
      console.log('   ✓ Polyfill applied using Math.random fallback');
    }
    
    // Test polyfilled functions
    try {
      const testArray = new Uint8Array(16);
      globalThis.crypto.getRandomValues(testArray);
      console.log(`   ✓ Polyfilled getRandomValues test: ${testArray.length} bytes filled`);
    } catch (error) {
      console.log(`   ✗ Polyfilled getRandomValues test failed: ${error.message}`);
    }
    
    try {
      const testUUID = globalThis.crypto.randomUUID();
      console.log(`   ✓ Polyfilled randomUUID test: ${testUUID}`);
    } catch (error) {
      console.log(`   ✗ Polyfilled randomUUID test failed: ${error.message}`);
    }
  } else {
    console.log('   ℹ️ Crypto already available, no polyfill needed');
  }
} catch (error) {
  console.log(`   ✗ Failed to apply polyfill: ${error.message}`);
}

console.log();

// Check NestJS Schedule compatibility
console.log('📅 NestJS Schedule Compatibility:');
try {
  // Try to simulate what @nestjs/schedule does
  if (typeof globalThis.crypto.getRandomValues === 'function' && 
      typeof globalThis.crypto.randomUUID === 'function') {
    console.log('   ✓ All required crypto functions are available');
    console.log('   ✓ Should be compatible with @nestjs/schedule');
  } else {
    console.log('   ✗ Missing required crypto functions');
    console.log('   ✗ May not be compatible with @nestjs/schedule');
  }
} catch (error) {
  console.log(`   ✗ Compatibility check failed: ${error.message}`);
}

console.log();
console.log('🎯 Recommendations:');

if (process.version.startsWith('v14') || process.version.startsWith('v12')) {
  console.log('   ⚠️ Your Node.js version is quite old. Consider upgrading to Node.js 16+ for better crypto support.');
}

if (typeof globalThis.crypto === 'undefined') {
  console.log('   💡 Apply the crypto polyfill in your main.ts file before any NestJS imports.');
}

console.log('   📝 If issues persist, check your EC2 instance Node.js installation and environment variables.');
console.log('   📝 Ensure your application starts with the polyfill applied early in the bootstrap process.');

console.log('\n✅ Diagnostic complete!');
