import { Elysia, t } from 'elysia'
import { AddonService } from '../service'

export const streamRoute = new Elysia()
  .get('/:addonId/stream/:type/:id', async ({ params, set }) => {
    // Handle .json extension
    const id = params.id.replace(/\.json$/, '')
    const manifest = AddonService.getManifest(params.addonId)

    if (!manifest) {
      set.status = 404
      return { error: 'Addon not found' }
    }

    // Check if addon supports stream resource
    if (!manifest.resources.includes('stream')) {
      set.status = 404
      return { error: 'Addon does not support stream resource' }
    }

    // Check if addon supports this type
    if (!manifest.types.includes(params.type)) {
      set.status = 404
      return { error: 'Addon does not support this content type' }
    }

    const streams = await AddonService.getStreams(params.addonId, params.type, id)

    return { streams }
  }, {
    params: t.Object({
      addonId: t.String(),
      type: t.String(),
      id: t.String(),
    }),
  })
