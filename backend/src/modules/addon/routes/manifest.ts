import { Elysia, t } from 'elysia'
import { AddonService } from '../service'

export const manifestRoute = new Elysia()
  .get('/:addonId/manifest.json', ({ params, set }) => {
    // Handle .json in addonId if present
    const addonId = params.addonId.replace(/\.json$/, '')
    const manifest = AddonService.getManifest(addonId)

    if (!manifest) {
      set.status = 404
      return { error: 'Addon not found' }
    }

    return manifest
  }, {
    params: t.Object({
      addonId: t.String(),
    }),
  })
