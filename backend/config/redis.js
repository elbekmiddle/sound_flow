import { createClient } from 'redis';

let client;

export async function connectRedis() {
  client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
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
    const keys = await getRedis().keys(pattern);
    if (keys.length > 0) await getRedis().del(keys);
  } catch (e) {
    console.warn('Cache del pattern failed:', e.message);
  }
}
