import { Elysia } from 'elysia'
import { manifestRoute } from './routes/manifest'
import { catalogRoute } from './routes/catalog'
import { metaRoute } from './routes/meta'
import { streamRoute } from './routes/stream'

export const addonModule = new Elysia({ prefix: '/addon' })
  .use(manifestRoute)
  .use(catalogRoute)
  .use(metaRoute)
  .use(streamRoute)
