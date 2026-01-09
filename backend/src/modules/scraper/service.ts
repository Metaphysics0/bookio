import type { AudiobookTorrent, ScraperSource, ScraperStatus } from './model'
import { TorrentCollection } from '@/db/collections/torrents'
import { librivoxSource } from './sources/librivox'
import { archiveOrgSource } from './sources/archive-org'

// Registry of all available scrapers
const sources: Map<string, ScraperSource> = new Map([
  ['librivox', librivoxSource],
  ['archive-org', archiveOrgSource],
])

// Track scraper status
const scraperStatus: Map<string, ScraperStatus> = new Map()

export abstract class ScraperService {
  static getSources(): ScraperSource[] {
    return Array.from(sources.values())
  }

  static getSource(id: string): ScraperSource | undefined {
    return sources.get(id)
  }

  static getStatus(sourceId: string): ScraperStatus {
    return (
      scraperStatus.get(sourceId) || {
        source: sourceId,
        lastRun: null,
        torrentCount: 0,
        isRunning: false,
      }
    )
  }

  static getAllStatus(): ScraperStatus[] {
    return Array.from(sources.keys()).map((id) => this.getStatus(id))
  }

  static async scrapeSource(sourceId: string): Promise<number> {
    const source = sources.get(sourceId)
    if (!source) {
      throw new Error(`Unknown source: ${sourceId}`)
    }

    if (!source.enabled) {
      console.log(`Scraper ${sourceId} is disabled, skipping`)
      return 0
    }

    // Update status to running
    scraperStatus.set(sourceId, {
      ...this.getStatus(sourceId),
      isRunning: true,
      lastError: undefined,
    })

    try {
      console.log(`Starting scrape for ${source.name}...`)
      const startTime = Date.now()

      const torrents = await source.scrape()
      console.log(`Scraped ${torrents.length} torrents from ${source.name}`)

      // Upsert all torrents to the database
      if (torrents.length > 0) {
        await TorrentCollection.upsertMany(
          torrents.map((t) => ({
            ...t,
            scrapedAt: new Date(),
          }))
        )
      }

      const duration = Date.now() - startTime
      console.log(`Scrape for ${source.name} completed in ${duration}ms`)

      // Update status
      const count = await TorrentCollection.countBySource(sourceId)
      scraperStatus.set(sourceId, {
        source: sourceId,
        lastRun: new Date(),
        torrentCount: count,
        isRunning: false,
      })

      return torrents.length
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Scraper error for ${sourceId}:`, errorMessage)

      scraperStatus.set(sourceId, {
        ...this.getStatus(sourceId),
        isRunning: false,
        lastError: errorMessage,
      })

      throw error
    }
  }

  static async scrapeAll(): Promise<Map<string, number>> {
    const results = new Map<string, number>()

    for (const [id, source] of sources) {
      if (!source.enabled) continue

      try {
        const count = await this.scrapeSource(id)
        results.set(id, count)
      } catch {
        results.set(id, -1) // Indicate error
      }

      // Small delay between sources to be nice
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    return results
  }

  static async matchToMetadata(
    torrent: AudiobookTorrent
  ): Promise<string | null> {
    // TODO: Implement fuzzy matching to audiobook metadata
    // This would query OpenLibrary, Audible, or Goodreads APIs
    // and return a canonical audiobook ID if a match is found
    return null
  }
}
