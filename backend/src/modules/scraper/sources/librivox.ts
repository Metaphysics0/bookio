import type { AudiobookTorrent, ScraperSource } from '../model'

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

interface ArchiveMetadata {
  files: {
    name: string
    format: string
    size: string
    length?: string
  }[]
  metadata: {
    title: string
    creator?: string[]
  }
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
        // Try to get Internet Archive identifier from url_iarchive or url_zip_file
        let identifier: string | null = null

        if (book.url_iarchive) {
          const archiveMatch = book.url_iarchive.match(/archive\.org\/details\/([^/?]+)/)
          if (archiveMatch) identifier = archiveMatch[1]
        }

        // Fallback: extract from url_zip_file (format: archive.org/compress/IDENTIFIER/...)
        if (!identifier && book.url_zip_file) {
          const zipMatch = book.url_zip_file.match(/archive\.org\/(?:compress|download)\/([^/?]+)/)
          if (zipMatch) identifier = zipMatch[1]
        }

        if (!identifier) continue
        const author = book.authors?.[0]
          ? `${book.authors[0].first_name} ${book.authors[0].last_name}`.trim()
          : 'Unknown'

        // Try to get file metadata from Internet Archive
        let totalSize = 0
        let streamUrl = ''

        try {
          // Fetch metadata from Internet Archive to get file info
          const metaResponse = await fetch(
            `https://archive.org/metadata/${identifier}`
          )

          if (metaResponse.ok) {
            const metadata = (await metaResponse.json()) as ArchiveMetadata

            // Find the best audio file (prefer 64kb MP3 for streaming, or m4b)
            const audioFiles = metadata.files.filter(
              (f) =>
                f.format === 'VBR MP3' ||
                f.format === '64Kbps MP3' ||
                f.format === '128Kbps MP3' ||
                f.name.endsWith('.mp3') ||
                f.name.endsWith('.m4b')
            )

            // Calculate total size from audio files
            for (const file of audioFiles) {
              totalSize += parseInt(file.size) || 0
            }

            // For single-file audiobooks or m4b, use direct URL
            const m4bFile = metadata.files.find((f) => f.name.endsWith('.m4b'))
            if (m4bFile) {
              streamUrl = `https://archive.org/download/${identifier}/${encodeURIComponent(m4bFile.name)}`
            } else {
              // Use zip file URL for multi-file audiobooks
              streamUrl = book.url_zip_file || `https://archive.org/compress/${identifier}/formats=VBR%20MP3&file=/${identifier}.zip`
            }
          }
        } catch (err) {
          // If metadata fetch fails, fall back to zip URL
          console.warn(`Failed to fetch metadata for ${identifier}:`, err)
          streamUrl = book.url_zip_file || `https://archive.org/download/${identifier}`
        }

        // If we still don't have a stream URL, use the zip file
        if (!streamUrl) {
          streamUrl = book.url_zip_file || `https://archive.org/download/${identifier}`
        }

        const torrent: AudiobookTorrent = {
          // Use the direct URL as the "infoHash" - our stream handler will recognize HTTP URLs
          infoHash: streamUrl,
          title: book.title,
          author,
          format: streamUrl.endsWith('.m4b') ? 'm4b' : 'mp3',
          size: totalSize,
          seeders: 999, // Internet Archive is always available
          source: 'librivox',
          audiobookId: `ab:librivox:${book.id}`,
          scrapedAt: new Date(),
        }

        torrents.push(torrent)

        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    } catch (error) {
      console.error('LibriVox scraper error:', error)
      throw error
    }

    return torrents
  },
}
