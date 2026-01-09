import { Elysia, t } from 'elysia'
import { DebridService } from './service'

export const debridModule = new Elysia({ prefix: '/debrid' })
  // List available debrid providers
  .get('/providers', () => {
    const providers = DebridService.getAvailableProviders()
    return { providers }
  })

  // Check cache status for info hashes
  .post('/cache', async ({ body }) => {
    const results = await DebridService.checkCache(
      body.infoHashes,
      body.provider
    )
    return { results }
  }, {
    body: t.Object({
      infoHashes: t.Array(t.String()),
      provider: t.Optional(t.String()),
    }),
  })

  // Generate streaming link
  .post('/link', async ({ body, error }) => {
    try {
      const link = await DebridService.generateLink(
        body.infoHash,
        body.provider,
        body.fileId
      )

      if (!link) {
        return error(404, { error: 'Could not generate link' })
      }

      return link
    } catch (err) {
      return error(500, {
        error: 'Link generation failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }, {
    body: t.Object({
      infoHash: t.String(),
      provider: t.String(),
      fileId: t.Optional(t.Number()),
    }),
  })
