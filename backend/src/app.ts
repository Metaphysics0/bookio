import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { addonModule } from './modules/addon'
import { scraperModule } from './modules/scraper'
import { libraryModule } from './modules/library'
import { debridModule } from './modules/debrid'
import { metadataRoutes } from './modules/metadata'

export const app = new Elysia()
  .use(cors())
  .use(addonModule)
  .use(scraperModule)
  .use(libraryModule)
  .use(debridModule)
  .use(metadataRoutes)
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .get('/', () => ({
    name: 'Bookio API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      addon: {
        manifest: '/addon/:addonId/manifest.json',
        catalog: '/addon/:addonId/catalog/:type/:catalogId.json',
        meta: '/addon/:addonId/meta/:type/:id.json',
        stream: '/addon/:addonId/stream/:type/:id.json',
      },
      scraper: {
        status: '/scraper/status',
        sources: '/scraper/sources',
        run: '/scraper/run/:sourceId',
      },
      library: {
        list: '/library',
        item: '/library/:audiobookId',
        progress: '/library/:audiobookId/progress',
        recent: '/library/recent',
        inProgress: '/library/in-progress',
      },
      debrid: {
        providers: '/debrid/providers',
        cache: '/debrid/cache',
        link: '/debrid/link',
      },
      metadata: {
        search: '/metadata/search?q=<query>',
        work: '/metadata/work/:workId',
        match: '/metadata/match?title=<title>&author=<author>',
      },
    },
  }))
