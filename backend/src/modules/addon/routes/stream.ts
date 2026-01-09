import { Elysia, t } from 'elysia'
import { AddonService } from '../service'

export const streamRoute = new Elysia()
  .get('/:addonId/stream/:type/:id', ({ params, error }) => {
    // Handle .json extension
    const id = params.id.replace(/\.json$/, '')
    const manifest = AddonService.getManifest(params.addonId)

    if (!manifest) {
      return error(404, { error: 'Addon not found' })
    }

    // Check if addon supports stream resource
    if (!manifest.resources.includes('stream')) {
      return error(404, { error: 'Addon does not support stream resource' })
    }

    // Check if addon supports this type
    if (!manifest.types.includes(params.type)) {
      return error(404, { error: 'Addon does not support this content type' })
    }

    const streams = AddonService.getStreams(params.addonId, params.type, id)

    return { streams }
  }, {
    params: t.Object({
      addonId: t.String(),
      type: t.String(),
      id: t.String(),
    }),
  })
