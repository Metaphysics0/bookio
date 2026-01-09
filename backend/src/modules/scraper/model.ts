import { t } from 'elysia'

export const AudiobookTorrentSchema = t.Object({
  infoHash: t.String(),
  title: t.String(),
  author: t.String(),
  narrator: t.Optional(t.String()),
  format: t.Union([
    t.Literal('mp3'),
    t.Literal('m4b'),
    t.Literal('flac'),
    t.Literal('unknown'),
  ]),
  bitrate: t.Optional(t.Number()),
  size: t.Number(),
  seeders: t.Number(),
  source: t.String(),
  audiobookId: t.Optional(t.String()),
  scrapedAt: t.Date(),
})

export type AudiobookTorrent = typeof AudiobookTorrentSchema.static

export interface ScraperSource {
  id: string
  name: string
  enabled: boolean
  scrape(): Promise<AudiobookTorrent[]>
}

export interface ScraperStatus {
  source: string
  lastRun: Date | null
  torrentCount: number
  isRunning: boolean
  lastError?: string
}
