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

interface ArchiveMetadata {
  files: {
    name: string
    format: string
    size: string
    length?: string
  }[]
  metadata: {
    title: string
    creator?: string | string[]
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

        // Fetch metadata to get actual audio files
        let streamUrl = ''
        let totalSize = item.item_size || 0
        let format: 'mp3' | 'm4b' | 'flac' | 'unknown' = 'mp3'

        try {
          const metaResponse = await fetch(
            `https://archive.org/metadata/${item.identifier}`
          )

          if (metaResponse.ok) {
            const metadata = (await metaResponse.json()) as ArchiveMetadata

            // Find audio files
            const audioFiles = metadata.files.filter(
              (f) =>
                f.format === 'VBR MP3' ||
                f.format === '64Kbps MP3' ||
                f.format === '128Kbps MP3' ||
                f.name.endsWith('.mp3') ||
                f.name.endsWith('.m4b') ||
                f.name.endsWith('.flac')
            )

            if (audioFiles.length > 0) {
              // Calculate total size
              totalSize = audioFiles.reduce((sum, f) => sum + (parseInt(f.size) || 0), 0)

              // Prefer m4b (single file with chapters), then first mp3
              const m4bFile = audioFiles.find((f) => f.name.endsWith('.m4b'))
              const flacFile = audioFiles.find((f) => f.name.endsWith('.flac'))

              if (m4bFile) {
                streamUrl = `https://archive.org/download/${item.identifier}/${encodeURIComponent(m4bFile.name)}`
                format = 'm4b'
              } else if (flacFile) {
                streamUrl = `https://archive.org/download/${item.identifier}/${encodeURIComponent(flacFile.name)}`
                format = 'flac'
              } else {
                // For multi-file audiobooks, provide the download page or first file
                const firstMp3 = audioFiles.find((f) => f.name.endsWith('.mp3'))
                if (firstMp3) {
                  streamUrl = `https://archive.org/download/${item.identifier}/${encodeURIComponent(firstMp3.name)}`
                } else {
                  // Fallback to compressed download
                  streamUrl = `https://archive.org/compress/${item.identifier}/formats=VBR%20MP3&file=/${item.identifier}.zip`
                }
                format = 'mp3'
              }
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch metadata for ${item.identifier}:`, err)
        }

        // Fallback to download page if no stream URL
        if (!streamUrl) {
          streamUrl = `https://archive.org/download/${item.identifier}`
        }

        // Parse the title for additional metadata
        const parsed = parseTorrentName(item.title || item.identifier)

        const torrent: AudiobookTorrent = {
          infoHash: streamUrl, // Use URL as "infoHash" - stream handler recognizes HTTP URLs
          title: item.title || item.identifier,
          author: item.creator || parsed.author || 'Unknown',
          format: parsed.format !== 'unknown' ? parsed.format : format,
          size: totalSize,
          seeders: 999, // Archive.org is always available
          source: 'archive-org',
          audiobookId: `ab:archive:${item.identifier}`,
          scrapedAt: new Date(),
        }

        torrents.push(torrent)

        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    } catch (error) {
      console.error('Archive.org scraper error:', error)
      throw error
    }

    return torrents
  },
}
