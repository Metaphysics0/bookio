import { createClient, type RedisClientType } from 'redis'
import { config } from '@/config'

let client: RedisClientType | null = null

export async function connectRedis(): Promise<RedisClientType> {
  if (client) return client

  client = createClient({ url: config.redis.url })

  client.on('error', (err) => console.error('Redis Client Error:', err))

  await client.connect()
  console.log('Connected to Redis')

  return client
}

export function getRedis(): RedisClientType {
  if (!client) {
    throw new Error('Redis not connected. Call connectRedis() first.')
  }
  return client
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit()
    client = null
    console.log('Disconnected from Redis')
  }
}

// Cache helper functions
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis()
  const value = await redis.get(key)
  return value ? JSON.parse(value) : null
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getRedis()
  await redis.setEx(key, ttlSeconds, JSON.stringify(value))
}

export async function cacheDelete(key: string): Promise<void> {
  const redis = getRedis()
  await redis.del(key)
}
