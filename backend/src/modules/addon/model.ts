import { t } from 'elysia'

// Resource types supported by addons
export const ResourceType = t.Union([
  t.Literal('catalog'),
  t.Literal('meta'),
  t.Literal('stream'),
  t.Literal('subtitles'),
])

// Content types
export const ContentType = t.Union([
  t.Literal('audiobook'),
  t.Literal('ebook'),
  t.Literal('podcast'),
])

// Catalog extra options (search, genre filters, etc.)
export const CatalogExtraSchema = t.Object({
  name: t.String(),
  options: t.Optional(t.Array(t.String())),
  isRequired: t.Optional(t.Boolean()),
})

// Catalog definition in manifest
export const CatalogSchema = t.Object({
  type: t.String(),
  id: t.String(),
  name: t.String(),
  extra: t.Optional(t.Array(CatalogExtraSchema)),
})

// Behavior hints for addon capabilities
export const BehaviorHintsSchema = t.Object({
  configurable: t.Optional(t.Boolean()),
  p2p: t.Optional(t.Boolean()),
  adult: t.Optional(t.Boolean()),
})

// Full addon manifest
export const ManifestSchema = t.Object({
  id: t.String(),
  version: t.String(),
  name: t.String(),
  description: t.Optional(t.String()),
  resources: t.Array(ResourceType),
  types: t.Array(t.String()),
  catalogs: t.Array(CatalogSchema),
  idPrefixes: t.Optional(t.Array(t.String())),
  behaviorHints: t.Optional(BehaviorHintsSchema),
  logo: t.Optional(t.String()),
  background: t.Optional(t.String()),
  contactEmail: t.Optional(t.String()),
})

export type Manifest = typeof ManifestSchema.static

// Chapter in an audiobook
export const ChapterSchema = t.Object({
  id: t.String(),
  title: t.String(),
  duration: t.String(),
  startTime: t.Number(),
})

export type Chapter = typeof ChapterSchema.static

// Catalog item (preview in list)
export const CatalogItemSchema = t.Object({
  id: t.String(),
  type: t.String(),
  name: t.String(),
  poster: t.Optional(t.String()),
  posterShape: t.Optional(t.Union([t.Literal('square'), t.Literal('poster'), t.Literal('landscape')])),
  narrator: t.Optional(t.String()),
  author: t.Optional(t.String()),
  duration: t.Optional(t.String()),
  releaseInfo: t.Optional(t.String()),
  genres: t.Optional(t.Array(t.String())),
  description: t.Optional(t.String()),
})

export type CatalogItem = typeof CatalogItemSchema.static

// Catalog response
export const CatalogResponseSchema = t.Object({
  metas: t.Array(CatalogItemSchema),
})

export type CatalogResponse = typeof CatalogResponseSchema.static

// Full metadata for an audiobook
export const MetaSchema = t.Object({
  id: t.String(),
  type: t.String(),
  name: t.String(),
  description: t.Optional(t.String()),
  poster: t.Optional(t.String()),
  posterShape: t.Optional(t.Union([t.Literal('square'), t.Literal('poster'), t.Literal('landscape')])),
  background: t.Optional(t.String()),
  runtime: t.Optional(t.String()),
  chapters: t.Optional(t.Array(ChapterSchema)),
  narrator: t.Optional(t.Array(t.String())),
  author: t.Optional(t.Array(t.String())),
  publisher: t.Optional(t.String()),
  releaseInfo: t.Optional(t.String()),
  genres: t.Optional(t.Array(t.String())),
  links: t.Optional(t.Array(t.Object({
    name: t.String(),
    category: t.String(),
    url: t.String(),
  }))),
})

export type Meta = typeof MetaSchema.static

// Meta response
export const MetaResponseSchema = t.Object({
  meta: MetaSchema,
})

export type MetaResponse = typeof MetaResponseSchema.static

// Stream behavior hints
export const StreamBehaviorHintsSchema = t.Object({
  bingeGroup: t.Optional(t.String()),
  notWebReady: t.Optional(t.Boolean()),
  filename: t.Optional(t.String()),
  videoSize: t.Optional(t.Number()),
})

// Individual stream source
export const StreamSchema = t.Object({
  name: t.Optional(t.String()),
  title: t.Optional(t.String()),
  url: t.Optional(t.String()),
  infoHash: t.Optional(t.String()),
  fileIdx: t.Optional(t.Number()),
  externalUrl: t.Optional(t.String()),
  ytId: t.Optional(t.String()),
  behaviorHints: t.Optional(StreamBehaviorHintsSchema),
})

export type Stream = typeof StreamSchema.static

// Stream response
export const StreamResponseSchema = t.Object({
  streams: t.Array(StreamSchema),
})

export type StreamResponse = typeof StreamResponseSchema.static
