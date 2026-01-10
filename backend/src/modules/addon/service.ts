import type { Manifest, CatalogItem, Meta, Stream } from './model'
import { TorrentCollection, type TorrentDocument } from '../../db/collections/torrents'
import { MetadataService } from '../metadata/service'
import { isMongoConnected } from '../../db/mongo'

// Built-in community addon manifest
const communityManifest: Manifest = {
  id: 'org.bookio.community',
  version: '1.0.0',
  name: 'Community Audiobooks',
  description: 'Community-sourced audiobooks from LibriVox and Internet Archive',
  resources: ['catalog', 'meta', 'stream'],
  types: ['audiobook'],
  catalogs: [
    {
      type: 'audiobook',
      id: 'popular',
      name: 'Popular Audiobooks',
      extra: [
        { name: 'search' },
        { name: 'genre', options: ['Fiction', 'Non-Fiction', 'Science Fiction', 'Fantasy', 'Mystery', 'Romance', 'Biography', 'Self-Help'] },
      ],
    },
    {
      type: 'audiobook',
      id: 'recent',
      name: 'Recently Added',
    },
    {
      type: 'audiobook',
      id: 'librivox',
      name: 'LibriVox Public Domain',
    },
    {
      type: 'audiobook',
      id: 'archive',
      name: 'Internet Archive',
    },
  ],
  idPrefixes: ['ab:'],
  behaviorHints: {
    configurable: true,
    p2p: true,
  },
}

// Addon registry - maps addon IDs to manifests
const addonRegistry: Map<string, Manifest> = new Map([
  ['community', communityManifest],
])

export abstract class AddonService {
  static getManifest(addonId: string): Manifest | null {
    return addonRegistry.get(addonId) ?? null
  }

  static getAllAddons(): Manifest[] {
    return Array.from(addonRegistry.values())
  }

  static registerAddon(manifest: Manifest): void {
    addonRegistry.set(manifest.id, manifest)
  }

  /**
   * Get catalog items from MongoDB or Open Library
   */
  static async getCatalog(
    addonId: string,
    type: string,
    catalogId: string,
    extra?: { search?: string; genre?: string; skip?: number }
  ): Promise<CatalogItem[]> {
    const skip = extra?.skip ?? 0
    const limit = 20

    // If there's a search query, search both MongoDB (scraped) and Open Library
    if (extra?.search) {
      return this.searchCatalog(extra.search, skip, limit)
    }

    // For specific catalog IDs, filter by source
    if (catalogId === 'librivox') {
      return this.getCatalogBySource('librivox', skip, limit)
    }

    if (catalogId === 'archive') {
      return this.getCatalogBySource('archive-org', skip, limit)
    }

    // For 'recent' catalog, get recently scraped torrents
    if (catalogId === 'recent') {
      return this.getRecentCatalog(skip, limit)
    }

    // Default 'popular' catalog - mix of sources
    return this.getPopularCatalog(skip, limit)
  }

  /**
   * Search for audiobooks across MongoDB and Open Library
   */
  private static async searchCatalog(
    query: string,
    skip: number,
    limit: number
  ): Promise<CatalogItem[]> {
    // Search MongoDB for scraped content (if connected)
    let torrents: TorrentDocument[] = []
    if (isMongoConnected()) {
      try {
        torrents = await TorrentCollection.search(query, limit)
      } catch (err) {
        console.warn('MongoDB search failed:', err)
      }
    }

    // Also search Open Library for metadata (to enrich results)
    const olResults = await MetadataService.searchBooks(query, limit)

    // Convert torrents to catalog items
    const items: CatalogItem[] = torrents.map((t) => this.torrentToCatalogItem(t))

    // If we don't have enough results from torrents, add Open Library results
    if (items.length < limit && olResults.length > 0) {
      for (const book of olResults) {
        // Skip if we already have this title
        if (items.some((i) =>
          i.name.toLowerCase() === book.title.toLowerCase()
        )) {
          continue
        }

        items.push({
          id: book.id,
          type: 'audiobook',
          name: book.title,
          poster: book.cover,
          author: book.author.join(', '),
          releaseInfo: book.publishYear?.toString(),
          genres: book.subjects?.slice(0, 3),
          description: book.description?.slice(0, 200),
        })

        if (items.length >= limit) break
      }
    }

    return items.slice(skip, skip + limit)
  }

  /**
   * Get catalog items from a specific source
   */
  private static async getCatalogBySource(
    source: string,
    skip: number,
    limit: number
  ): Promise<CatalogItem[]> {
    if (!isMongoConnected()) {
      // Fall back to Open Library search for the source
      const query = source === 'librivox' ? 'librivox audiobook' : 'public domain audiobook'
      const books = await MetadataService.searchBooks(query, skip + limit)
      return books.slice(skip, skip + limit).map((book) => ({
        id: book.id,
        type: 'audiobook',
        name: book.title,
        poster: book.cover,
        author: book.author.join(', '),
        releaseInfo: book.publishYear?.toString(),
        genres: book.subjects?.slice(0, 3),
      }))
    }

    const torrents = await TorrentCollection.getRecentlyScraped(source, skip + limit)
    return torrents.slice(skip, skip + limit).map((t) => this.torrentToCatalogItem(t))
  }

  /**
   * Get recently scraped audiobooks
   */
  private static async getRecentCatalog(
    skip: number,
    limit: number
  ): Promise<CatalogItem[]> {
    if (!isMongoConnected()) {
      // Fall back to Open Library
      const books = await MetadataService.searchBooks('new audiobook fiction', skip + limit)
      return books.slice(skip, skip + limit).map((book) => ({
        id: book.id,
        type: 'audiobook',
        name: book.title,
        poster: book.cover,
        author: book.author.join(', '),
        releaseInfo: book.publishYear?.toString(),
        genres: book.subjects?.slice(0, 3),
      }))
    }

    // Get from both sources
    const [librivox, archive] = await Promise.all([
      TorrentCollection.getRecentlyScraped('librivox', (skip + limit) / 2),
      TorrentCollection.getRecentlyScraped('archive-org', (skip + limit) / 2),
    ])

    // Merge and sort by scraped date
    const all = [...librivox, ...archive].sort(
      (a, b) => new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime()
    )

    return all.slice(skip, skip + limit).map((t) => this.torrentToCatalogItem(t))
  }

  /**
   * Get popular audiobooks (most seeders or just a mix)
   */
  private static async getPopularCatalog(
    skip: number,
    limit: number
  ): Promise<CatalogItem[]> {
    let all: TorrentDocument[] = []

    if (isMongoConnected()) {
      try {
        // Get from both sources
        const [librivox, archive] = await Promise.all([
          TorrentCollection.getRecentlyScraped('librivox', 50),
          TorrentCollection.getRecentlyScraped('archive-org', 50),
        ])
        all = [...librivox, ...archive]
      } catch (err) {
        console.warn('MongoDB query failed:', err)
      }
    }

    // If no scraped content, fall back to Open Library search for popular books
    if (all.length === 0) {
      const popularBooks = await MetadataService.searchBooks('audiobook fiction', limit * 2)
      return popularBooks.slice(skip, skip + limit).map((book) => ({
        id: book.id,
        type: 'audiobook',
        name: book.title,
        poster: book.cover,
        author: book.author.join(', '),
        releaseInfo: book.publishYear?.toString(),
        genres: book.subjects?.slice(0, 3),
        description: book.description?.slice(0, 200),
      }))
    }

    return all.slice(skip, skip + limit).map((t) => this.torrentToCatalogItem(t))
  }

  /**
   * Get full metadata for an audiobook
   */
  static async getMeta(addonId: string, type: string, id: string): Promise<Meta | null> {
    // If it's an Open Library ID (ol:XXXXX), fetch from Open Library
    if (id.startsWith('ol:')) {
      const workId = id.replace('ol:', '')
      const book = await MetadataService.getWorkById(workId)

      if (!book) return null

      // Check if we have any streams for this book
      const torrents = await this.findTorrentsForBook(book.title, book.author[0])

      return {
        id,
        type: 'audiobook',
        name: book.title,
        description: book.description,
        poster: book.cover,
        author: book.author,
        releaseInfo: book.publishYear?.toString(),
        genres: book.subjects,
        // If we found matching torrents, we have streams available
        links: torrents.length > 0
          ? [{ name: `${torrents.length} streams available`, category: 'streams', url: '#' }]
          : undefined,
      }
    }

    // For scraped content IDs (ab:librivox:XXX or ab:archive:XXX)
    const torrent = await this.findTorrentById(id)

    if (torrent) {
      // Try to enrich with Open Library metadata
      const olMeta = await MetadataService.matchBook(torrent.title, torrent.author)

      return {
        id,
        type: 'audiobook',
        name: torrent.title,
        description: olMeta?.description,
        poster: olMeta?.cover,
        author: [torrent.author],
        narrator: torrent.narrator ? [torrent.narrator] : undefined,
        genres: olMeta?.subjects,
        releaseInfo: olMeta?.publishYear?.toString(),
      }
    }

    return null
  }

  /**
   * Get available streams for an audiobook
   */
  static async getStreams(addonId: string, type: string, id: string): Promise<Stream[]> {
    // If it's an Open Library ID, find matching torrents by title/author
    if (id.startsWith('ol:')) {
      const workId = id.replace('ol:', '')
      const book = await MetadataService.getWorkById(workId)

      if (!book) return []

      const torrents = await this.findTorrentsForBook(book.title, book.author[0])
      return torrents.map((t) => this.torrentToStream(t))
    }

    // For scraped content IDs, get directly
    const torrent = await this.findTorrentById(id)

    if (torrent) {
      return [this.torrentToStream(torrent)]
    }

    // Also try to find by audiobookId
    if (isMongoConnected()) {
      try {
        const torrents = await TorrentCollection.findByAudiobookId(id)
        return torrents.map((t) => this.torrentToStream(t))
      } catch (err) {
        console.warn('MongoDB query failed:', err)
      }
    }

    return []
  }

  /**
   * Find torrents that match a book title and author
   */
  private static async findTorrentsForBook(
    title: string,
    author?: string
  ): Promise<TorrentDocument[]> {
    if (!isMongoConnected()) return []

    try {
      const query = author ? `${title} ${author}` : title
      return TorrentCollection.search(query, 10)
    } catch (err) {
      console.warn('MongoDB search failed:', err)
      return []
    }
  }

  /**
   * Find a torrent by its audiobook ID
   */
  private static async findTorrentById(id: string): Promise<TorrentDocument | null> {
    if (!isMongoConnected()) return null

    try {
      // The ID format is like "ab:librivox:12345" or "ab:archive:identifier"
      const match = id.match(/^ab:(librivox|archive):(.+)$/)

      if (match) {
        const source = match[1] === 'archive' ? 'archive-org' : match[1]
        const identifier = match[2]
        const infoHash = `${source === 'archive-org' ? 'archive' : source}:${identifier}`
        return TorrentCollection.findByInfoHash(infoHash)
      }

      // Try searching by audiobookId
      const results = await TorrentCollection.findByAudiobookId(id)
      return results[0] ?? null
    } catch (err) {
      console.warn('MongoDB query failed:', err)
      return null
    }
  }

  /**
   * Convert a torrent document to a catalog item
   */
  private static torrentToCatalogItem(torrent: TorrentDocument): CatalogItem {
    return {
      id: torrent.audiobookId || `ab:${torrent.source}:${torrent.infoHash.split(':')[1] || torrent.infoHash}`,
      type: 'audiobook',
      name: torrent.title,
      author: torrent.author,
      narrator: torrent.narrator,
      description: `${torrent.format.toUpperCase()} | ${this.formatSize(torrent.size)}`,
    }
  }

  /**
   * Convert a torrent document to a stream
   */
  private static torrentToStream(torrent: TorrentDocument): Stream {
    const isDirectUrl = torrent.infoHash.startsWith('http')
    const isLibrivox = torrent.source === 'librivox'
    const isArchive = torrent.source === 'archive-org'

    // For LibriVox and Archive.org, we have direct URLs
    if (isDirectUrl) {
      return {
        name: `${torrent.source === 'librivox' ? 'LibriVox' : 'Archive.org'}\n${torrent.format.toUpperCase()}`,
        title: `${torrent.title}\n${this.formatSize(torrent.size)} | Direct Stream`,
        url: torrent.infoHash,
        behaviorHints: {
          filename: `${torrent.title}.${torrent.format}`,
        },
      }
    }

    // For actual torrents (future)
    return {
      name: `${isLibrivox ? 'LibriVox' : isArchive ? 'Archive.org' : 'Community'}\n${torrent.format.toUpperCase()}`,
      title: `${torrent.title}\n${this.formatSize(torrent.size)} | ${torrent.seeders} seeders`,
      infoHash: torrent.infoHash,
      fileIdx: 0,
      behaviorHints: {
        bingeGroup: `${torrent.source}-${torrent.format}`,
        filename: `${torrent.title}.${torrent.format}`,
      },
    }
  }

  /**
   * Format file size for display
   */
  private static formatSize(bytes: number): string {
    if (bytes === 0) return 'Unknown size'
    const units = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
  }
}
