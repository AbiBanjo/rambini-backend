const redis = require('redis');

async function testRedisConnection() {
  const client = redis.createClient({
    host: 'localhost',
    port: 6379,
  });

  try {
    console.log('🔌 Testing Redis connection...');
    
    client.on('error', (err) => {
      console.error('❌ Redis connection error:', err);
      process.exit(1);
    });

    client.on('connect', () => {
      console.log('✅ Successfully connected to Redis!');
    });

    client.on('ready', async () => {
      try {
        // Test basic operations
        await client.set('test_key', 'test_value');
        const value = await client.get('test_key');
        console.log('📊 Redis Test Operations:');
        console.log(`   Set/Get Test: ${value === 'test_value' ? '✅ PASSED' : '❌ FAILED'}`);
        
        // Test Redis info
        const info = await client.info('server');
        const version = info.split('\n').find(line => line.startsWith('redis_version'));
        console.log(`   Redis Version: ${version ? version.split(':')[1] : 'Unknown'}`);
        
        // Clean up test key
        await client.del('test_key');
        
        console.log('\n🎉 Redis connection test completed successfully!');
        await client.quit();
      } catch (error) {
        console.error('❌ Redis operation test failed:', error.message);
        await client.quit();
        process.exit(1);
      }
    });

    await client.connect();
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    process.exit(1);
  }
}

testRedisConnection(); 