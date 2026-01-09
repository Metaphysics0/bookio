import type { AudiobookTorrent, ScraperSource } from '../model'
import { parseTorrentName } from '../parser'

const LIBRIVOX_API = 'https://librivox.org/api/feed/audiobooks'

interface LibrivoxBook {
  id: string
  title: string
  description: string
  url_text_source: string
  language: string
  copyright_year: string
  num_sections: string
  url_rss: string
  url_zip_file: string
  url_project: string
  url_librivox: string
  url_iarchive: string
  totaltime: string
  totaltimesecs: number
  authors: {
    id: string
    first_name: string
    last_name: string
    dob: string
    dod: string
  }[]
}

interface LibrivoxResponse {
  books: LibrivoxBook[]
}

export const librivoxSource: ScraperSource = {
  id: 'librivox',
  name: 'LibriVox',
  enabled: true,

  async scrape(): Promise<AudiobookTorrent[]> {
    const torrents: AudiobookTorrent[] = []

    try {
      // Fetch recent audiobooks from LibriVox API
      const response = await fetch(`${LIBRIVOX_API}?format=json&limit=50`)

      if (!response.ok) {
        throw new Error(`LibriVox API returned ${response.status}`)
      }

      const data = (await response.json()) as LibrivoxResponse

      for (const book of data.books || []) {
        // LibriVox provides direct zip downloads from Internet Archive
        // We can derive torrent info from the archive.org URL
        if (!book.url_iarchive) continue

        // Extract Internet Archive identifier from URL
        const archiveMatch = book.url_iarchive.match(/archive\.org\/details\/([^/?]+)/)
        if (!archiveMatch) continue

        const identifier = archiveMatch[1]
        const author = book.authors?.[0]
          ? `${book.authors[0].first_name} ${book.authors[0].last_name}`.trim()
          : 'Unknown'

        // Internet Archive items have torrent files available
        // The info hash would need to be fetched from the torrent file
        // For now, we store the identifier and can resolve the torrent later
        const torrent: AudiobookTorrent = {
          infoHash: `librivox:${identifier}`, // Placeholder - would need actual hash
          title: book.title,
          author,
          format: 'mp3',
          size: 0, // Would need to be fetched
          seeders: 0, // Archive.org doesn't have seeders in traditional sense
          source: 'librivox',
          audiobookId: `ab:librivox:${book.id}`,
          scrapedAt: new Date(),
        }

        torrents.push(torrent)
      }
    } catch (error) {
      console.error('LibriVox scraper error:', error)
      throw error
    }

    return torrents
  },
}
