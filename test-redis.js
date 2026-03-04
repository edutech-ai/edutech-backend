require('dotenv').config();
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 10000,
});

redis.on('connect', () => {
  console.log('✅ Redis connected successfully!');
});

redis.on('ready', async () => {
  console.log('✅ Redis is ready!');
  
  // Test basic operations
  try {
    await redis.set('test_key', 'hello');
    const value = await redis.get('test_key');
    console.log('✅ Test operation success:', value);
    await redis.del('test_key');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test operation failed:', error.message);
    process.exit(1);
  }
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error.message);
  process.exit(1);
});

redis.on('close', () => {
  console.log('⚠️  Redis connection closed');
});

setTimeout(() => {
  console.error('❌ Connection timeout after 10 seconds');
  process.exit(1);
}, 10000);
