const redis = require('redis');

// Tạo Redis client
// Support REDIS_URL (Upstash/Cloud) hoặc separate config (Local)
console.log('\n🔧 Redis Configuration:');
if (process.env.REDIS_URL) {
  console.log('   Mode: Cloud (REDIS_URL detected)');
  console.log('   URL:', process.env.REDIS_URL.substring(0, 30) + '...');
} else {
  console.log('   Mode: Local');
  console.log('   Host:', process.env.REDIS_HOST || 'localhost');
  console.log('   Port:', process.env.REDIS_PORT || 6379);
}

const client = redis.createClient(
  process.env.REDIS_URL
    ? {
        url: process.env.REDIS_URL,
        socket: {
          tls: true,
          rejectUnauthorized: true
        }
      }
    : {
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379
        },
        password: process.env.REDIS_PASSWORD || undefined,
        database: process.env.REDIS_DB || 0
      }
);

// Handle errors
client.on('error', (err) => {
  console.error('❌ Redis Client Error:', err.message);
  console.error('   Details:', err);
});

client.on('connect', () => {
  console.log('🔄 Connecting to Redis...');
});

client.on('ready', () => {
  console.log('✅ Redis Connected Successfully!');
  console.log('   Status: Ready to handle OTP requests');
});

// Connect to Redis
(async () => {
  try {
    console.log('🚀 Initiating Redis connection...');
    await client.connect();
  } catch (error) {
    console.error('❌ Redis connection failed!');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    console.log('⚠️  Falling back to in-memory storage\n');
  }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
  await client.quit();
  process.exit(0);
});

module.exports = client;
