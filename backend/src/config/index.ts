export const config = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || 'localhost',

  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017',
    database: process.env.MONGO_DATABASE || 'bookio',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  scraper: {
    intervalHours: Number(process.env.SCRAPER_INTERVAL_HOURS) || 6,
  },

  debrid: {
    realDebridApiKey: process.env.REAL_DEBRID_API_KEY || '',
    premiumizeApiKey: process.env.PREMIUMIZE_API_KEY || '',
    cacheTtlHours: 8,
  },

  isDev: process.env.NODE_ENV !== 'production',
} as const

export type Config = typeof config
