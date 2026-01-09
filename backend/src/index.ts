import { app } from './app'
import { config } from './config'

// Optional: Connect to databases if configured
async function initializeDatabases() {
  // MongoDB connection (optional for MVP)
  if (config.mongo.uri && config.mongo.uri !== 'mongodb://localhost:27017') {
    try {
      const { connectMongo } = await import('./db/mongo')
      await connectMongo()
    } catch (error) {
      console.warn('MongoDB connection failed, running without database:', error)
    }
  } else {
    console.log('MongoDB not configured, using in-memory data')
  }

  // Redis connection (optional for MVP)
  if (config.redis.url && config.redis.url !== 'redis://localhost:6379') {
    try {
      const { connectRedis } = await import('./db/redis')
      await connectRedis()
    } catch (error) {
      console.warn('Redis connection failed, running without cache:', error)
    }
  } else {
    console.log('Redis not configured, caching disabled')
  }
}

// Start the server
async function start() {
  await initializeDatabases()

  // Start scraper scheduler in production
  if (!config.isDev) {
    try {
      const { startScraperScheduler } = await import('./modules/scraper/scheduler')
      startScraperScheduler()
    } catch (error) {
      console.warn('Scraper scheduler failed to start:', error)
    }
  }

  app.listen(config.port)

  console.log(`
  Bookio API is running!

  Local:    http://${config.host}:${config.port}
  Health:   http://${config.host}:${config.port}/health

  Addon endpoints:
    Manifest: http://${config.host}:${config.port}/addon/community/manifest.json
    Catalog:  http://${config.host}:${config.port}/addon/community/catalog/audiobook/popular.json
  `)
}

start().catch(console.error)
