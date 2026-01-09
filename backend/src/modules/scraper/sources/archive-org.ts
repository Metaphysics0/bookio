import type { AudiobookTorrent, ScraperSource } from '../model'
import { parseTorrentName } from '../parser'

const ARCHIVE_API = 'https://archive.org/advancedsearch.php'

interface ArchiveItem {
  identifier: string
  title: string
  creator?: string
  description?: string
  mediatype: string
  item_size?: number
}

interface ArchiveResponse {
  response: {
    numFound: number
    docs: ArchiveItem[]
  }
}

export const archiveOrgSource: ScraperSource = {
  id: 'archive-org',
  name: 'Internet Archive',
  enabled: true,

  async scrape(): Promise<AudiobookTorrent[]> {
    const torrents: AudiobookTorrent[] = []

    try {
      // Search for audiobooks in the Internet Archive
      const query = encodeURIComponent('mediatype:audio AND collection:audio_bookspoetry')
      const fields = 'identifier,title,creator,description,item_size'
      const url = `${ARCHIVE_API}?q=${query}&fl[]=${fields}&sort[]=addeddate+desc&rows=50&output=json`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Archive.org API returned ${response.status}`)
      }

      const data = (await response.json()) as ArchiveResponse

      for (const item of data.response?.docs || []) {
        if (!item.identifier) continue

        // Parse the title for additional metadata
        const parsed = parseTorrentName(item.title || item.identifier)

        const torrent: AudiobookTorrent = {
          infoHash: `archive:${item.identifier}`, // Placeholder - actual hash from torrent file
          title: item.title || item.identifier,
          author: item.creator || parsed.author || 'Unknown',
          format: parsed.format,
          size: item.item_size || 0,
          seeders: 0, // Archive.org uses web seeding
          source: 'archive-org',
          audiobookId: `ab:archive:${item.identifier}`,
          scrapedAt: new Date(),
        }

        torrents.push(torrent)
      }
    } catch (error) {
      console.error('Archive.org scraper error:', error)
      throw error
    }

    return torrents
  },
}
