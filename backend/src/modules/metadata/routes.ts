import { Elysia, t } from 'elysia'
import { MetadataService } from './service'

export const metadataRoutes = new Elysia({ prefix: '/metadata' })
  .get(
    '/search',
    async ({ query }) => {
      const results = await MetadataService.searchBooks(
        query.q,
        query.limit ? parseInt(query.limit) : 20
      )
      return { results }
    },
    {
      query: t.Object({
        q: t.String(),
        limit: t.Optional(t.String()),
      }),
    }
  )
  .get(
    '/work/:workId',
    async ({ params }) => {
      const metadata = await MetadataService.getWorkById(params.workId)
      if (!metadata) {
        return { error: 'Work not found' }
      }
      return { metadata }
    },
    {
      params: t.Object({
        workId: t.String(),
      }),
    }
  )
  .get(
    '/match',
    async ({ query }) => {
      const match = await MetadataService.matchBook(query.title, query.author)
      if (!match) {
        return { error: 'No match found' }
      }
      return { match }
    },
    {
      query: t.Object({
        title: t.String(),
        author: t.Optional(t.String()),
      }),
    }
  )
