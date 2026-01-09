import { Elysia, t } from 'elysia'
import { LibraryService } from './service'
import { AddToLibrarySchema, UpdateProgressSchema } from './model'

// Note: These endpoints require authentication in production
// For MVP, we'll use a userId from headers or query params

export const libraryModule = new Elysia({ prefix: '/library' })
  // Get user's library
  .get('/', async ({ headers, error }) => {
    const userId = headers['x-user-id']
    if (!userId) {
      return error(401, { error: 'User ID required' })
    }

    const items = await LibraryService.getUserLibrary(userId)
    return { items }
  })

  // Get a specific library item
  .get('/:audiobookId', async ({ params, headers, error }) => {
    const userId = headers['x-user-id']
    if (!userId) {
      return error(401, { error: 'User ID required' })
    }

    const item = await LibraryService.getLibraryItem(userId, params.audiobookId)
    if (!item) {
      return error(404, { error: 'Item not in library' })
    }

    return item
  }, {
    params: t.Object({
      audiobookId: t.String(),
    }),
  })

  // Add to library
  .post('/', async ({ body, headers, error }) => {
    const userId = headers['x-user-id']
    if (!userId) {
      return error(401, { error: 'User ID required' })
    }

    await LibraryService.addToLibrary(userId, body.audiobookId)
    return { success: true, audiobookId: body.audiobookId }
  }, {
    body: AddToLibrarySchema,
  })

  // Update progress
  .patch('/:audiobookId/progress', async ({ params, body, headers, error }) => {
    const userId = headers['x-user-id']
    if (!userId) {
      return error(401, { error: 'User ID required' })
    }

    await LibraryService.updateProgress(userId, params.audiobookId, body)
    return { success: true }
  }, {
    params: t.Object({
      audiobookId: t.String(),
    }),
    body: UpdateProgressSchema,
  })

  // Remove from library
  .delete('/:audiobookId', async ({ params, headers, error }) => {
    const userId = headers['x-user-id']
    if (!userId) {
      return error(401, { error: 'User ID required' })
    }

    await LibraryService.removeFromLibrary(userId, params.audiobookId)
    return { success: true }
  }, {
    params: t.Object({
      audiobookId: t.String(),
    }),
  })

  // Get recently played
  .get('/recent', async ({ headers, query, error }) => {
    const userId = headers['x-user-id']
    if (!userId) {
      return error(401, { error: 'User ID required' })
    }

    const limit = query.limit ? parseInt(query.limit, 10) : 10
    const items = await LibraryService.getRecentlyPlayed(userId, limit)
    return { items }
  }, {
    query: t.Object({
      limit: t.Optional(t.String()),
    }),
  })

  // Get in-progress audiobooks
  .get('/in-progress', async ({ headers, error }) => {
    const userId = headers['x-user-id']
    if (!userId) {
      return error(401, { error: 'User ID required' })
    }

    const items = await LibraryService.getInProgress(userId)
    return { items }
  })
