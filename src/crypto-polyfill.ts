/**
 * Crypto Polyfill for NestJS Schedule Module
 * 
 * This file ensures that the global crypto object is available before
 * any NestJS modules are initialized, particularly @nestjs/schedule which
 * requires crypto.getRandomValues() and crypto.randomUUID() to be available.
 * 
 * This is needed for server environments (like EC2) where the Web Crypto API
 * might not be available globally, even though Node.js crypto module exists.
 */

// Extend global interface to include crypto
declare global {
  var crypto: {
    getRandomValues<T extends ArrayBufferView>(array: T): T;
    randomUUID(): `${string}-${string}-${string}-${string}-${string}`;
    subtle?: any;
  };
}

/**
 * Initialize crypto polyfill
 * Must be called before any NestJS module imports
 */
export function initializeCryptoPolyfill(): void {
  if (typeof globalThis.crypto !== 'undefined') {
    console.log('✓ Global crypto already available');
    return;
  }

  try {
    // Try to use Node.js crypto module
    const nodeCrypto = require('crypto');
    
    globalThis.crypto = {
      getRandomValues<T extends ArrayBufferView>(array: T): T {
        if (!array || typeof array.length !== 'number') {
          throw new TypeError('Expected ArrayBufferView');
        }
        
        const bytes = nodeCrypto.randomBytes(array.length);
        const uint8Array = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
        for (let i = 0; i < uint8Array.length; i++) {
          uint8Array[i] = bytes[i];
        }
        return array;
      },
      
      randomUUID(): `${string}-${string}-${string}-${string}-${string}` {
        if (nodeCrypto.randomUUID) {
          return nodeCrypto.randomUUID();
        }
        
        // Fallback: Generate UUID v4 manually
        const bytes = nodeCrypto.randomBytes(16);
        
        // Set version (4) and variant bits
        bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
        
        const hex = bytes.toString('hex');
        return [
          hex.substring(0, 8),
          hex.substring(8, 12),
          hex.substring(12, 16),
          hex.substring(16, 20),
          hex.substring(20, 32)
        ].join('-');
      },
      
      subtle: nodeCrypto.webcrypto?.subtle
    };
    
    console.log('✓ Crypto polyfill initialized with Node.js crypto module');
    
  } catch (error) {
    console.warn('⚠️ Node.js crypto module not available, using Math.random fallback');
    
    // Fallback implementation using Math.random
    globalThis.crypto = {
      getRandomValues<T extends ArrayBufferView>(array: T): T {
        if (!array || typeof array.length !== 'number') {
          throw new TypeError('Expected ArrayBufferView');
        }
        
        const uint8Array = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
        for (let i = 0; i < uint8Array.length; i++) {
          uint8Array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      },
      
      randomUUID(): `${string}-${string}-${string}-${string}-${string}` {
        // Generate UUID v4 using Math.random
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        }) as `${string}-${string}-${string}-${string}-${string}`;
      }
    };
    
    console.log('✓ Crypto polyfill initialized with Math.random fallback');
  }
}

// Auto-initialize when this module is imported
initializeCryptoPolyfill();
