import Redis from 'ioredis';

// Create a single instance of Redis to reuse across your app
const redis = new Redis(process.env.REDIS_URL);

export default redis;