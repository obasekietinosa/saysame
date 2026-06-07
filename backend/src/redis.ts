import Redis from 'ioredis';

// Allow overriding the Redis URL via environment variable
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Initialize a single Redis client instance
export const redis = new Redis(REDIS_URL);
