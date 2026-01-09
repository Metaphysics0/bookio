import { t } from 'elysia'

export const DebridLinkSchema = t.Object({
  url: t.String(),
  filename: t.String(),
  size: t.Number(),
  mimeType: t.Optional(t.String()),
})

export type DebridLink = typeof DebridLinkSchema.static

export const CacheStatusSchema = t.Object({
  infoHash: t.String(),
  cached: t.Boolean(),
  provider: t.String(),
  files: t.Optional(t.Array(t.Object({
    id: t.Number(),
    name: t.String(),
    size: t.Number(),
  }))),
})

export type CacheStatus = typeof CacheStatusSchema.static

export interface DebridProvider {
  id: string
  name: string
  checkCache(infoHashes: string[]): Promise<Map<string, boolean>>
  generateLink(infoHash: string, fileId?: number): Promise<DebridLink | null>
}
