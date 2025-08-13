import IORedis from 'ioredis';
import 'dotenv/config';

// BullMQ v5+ requires maxRetriesPerRequest: null
export const redis = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null, // Required for BullMQ v5+
  enableReadyCheck: false,
  lazyConnect: true
});

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

redis.on('ready', () => {
  console.log('[Redis] Ready');
});

redis.on('error', (err) => {
  console.error('[Redis] Error:', err);
});

redis.on('end', () => {
  console.log('[Redis] Disconnected');
});

redis.on('close', () => {
  console.log('[Redis] Connection closed');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Redis] Shutting down gracefully...');
  await redis.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Redis] Shutting down gracefully...');
  await redis.quit();
  process.exit(0);
});