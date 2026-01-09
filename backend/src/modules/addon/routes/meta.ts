import { Elysia, t } from 'elysia'
import { AddonService } from '../service'

export const metaRoute = new Elysia()
  .get('/:addonId/meta/:type/:id', ({ params, error }) => {
    // Handle .json extension
    const id = params.id.replace(/\.json$/, '')
    const manifest = AddonService.getManifest(params.addonId)

    if (!manifest) {
      return error(404, { error: 'Addon not found' })
    }

    // Check if addon supports meta resource
    if (!manifest.resources.includes('meta')) {
      return error(404, { error: 'Addon does not support meta resource' })
    }

    // Check if addon supports this type
    if (!manifest.types.includes(params.type)) {
      return error(404, { error: 'Addon does not support this content type' })
    }

    const meta = AddonService.getMeta(params.addonId, params.type, id)

    if (!meta) {
      return error(404, { error: 'Audiobook not found' })
    }

    return { meta }
  }, {
    params: t.Object({
      addonId: t.String(),
      type: t.String(),
      id: t.String(),
    }),
  })
