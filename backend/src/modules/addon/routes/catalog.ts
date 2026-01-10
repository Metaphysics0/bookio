import { Elysia, t } from 'elysia'
import { AddonService } from '../service'

export const catalogRoute = new Elysia()
  .get('/:addonId/catalog/:type/:catalogId', async ({ params, query, set }) => {
    // Handle .json extension
    const catalogId = params.catalogId.replace(/\.json$/, '')
    const manifest = AddonService.getManifest(params.addonId)

    if (!manifest) {
      set.status = 404
      return { error: 'Addon not found' }
    }

    // Check if catalog exists in manifest
    const catalogDef = manifest.catalogs.find(
      (c) => c.type === params.type && c.id === catalogId
    )

    if (!catalogDef) {
      set.status = 404
      return { error: 'Catalog not found' }
    }

    const metas = await AddonService.getCatalog(
      params.addonId,
      params.type,
      catalogId,
      {
        search: query.search,
        genre: query.genre,
        skip: query.skip ? Number(query.skip) : undefined,
      }
    )

    return { metas }
  }, {
    params: t.Object({
      addonId: t.String(),
      type: t.String(),
      catalogId: t.String(),
    }),
    query: t.Object({
      search: t.Optional(t.String()),
      genre: t.Optional(t.String()),
      skip: t.Optional(t.String()),
    }),
  })
