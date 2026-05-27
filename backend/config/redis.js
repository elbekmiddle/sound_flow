import { createClient } from 'redis';

let client;

export async function connectRedis() {
  client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      tls: process.env.REDIS_URL?.startsWith('rediss://'),
      reconnectStrategy: (retries) => {
        if (retries > 20) return new Error('Redis: too many retries');
        return Math.min(retries * 200, 5000);
      },
      connectTimeout: 10000,
      keepAlive: 5000,
    },
    pingInterval: 30000, // Prevent Upstash idle disconnect
  });

  client.on('error', (err) => console.error('Redis error:', err));
  client.on('reconnecting', () => console.log('Redis reconnecting...'));

  await client.connect();
  console.log('✅ Redis connected');
  return client;
}

export function getRedis() {
  if (!client) throw new Error('Redis not initialized. Call connectRedis() first.');
  return client;
}

// ─── Cache Helpers ────────────────────────────────────────
export async function cacheGet(key) {
  try {
    const val = await getRedis().get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds = 300) {
  try {
    await getRedis().setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (e) {
    console.warn('Cache set failed:', e.message);
  }
}

export async function cacheDel(key) {
  try {
    await getRedis().del(key);
  } catch (e) {
    console.warn('Cache del failed:', e.message);
  }
}

export async function cacheDelPattern(pattern) {
  try {
    const redis = getRedis();
    let cursor = 0;
    do {
      const result = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = result.cursor;
      if (result.keys.length > 0) await redis.del(result.keys);
    } while (cursor !== 0);
  } catch (e) {
    console.warn('Cache del pattern failed:', e.message);
  }
}
