export interface ParsedTorrentInfo {
  title: string
  author?: string
  narrator?: string
  year?: number
  format: 'mp3' | 'm4b' | 'flac' | 'unknown'
  bitrate?: number
  isAbridged: boolean
}

// Common patterns in audiobook torrent names
const YEAR_PATTERN = /\b(19|20)\d{2}\b/
const BITRATE_PATTERN = /(\d{2,3})\s*kbps/i
const FORMAT_PATTERNS = {
  mp3: /\.mp3|mp3|MP3/,
  m4b: /\.m4b|m4b|M4B/,
  flac: /\.flac|flac|FLAC/,
}
const ABRIDGED_PATTERN = /\babridged\b/i
const UNABRIDGED_PATTERN = /\bunabridged\b/i

// Common separators in torrent names
const SEPARATORS = /[.\-_\[\]()]/g

// Common words to filter out
const NOISE_WORDS = new Set([
  'audiobook',
  'audio',
  'book',
  'unabridged',
  'abridged',
  'complete',
  'series',
  'mp3',
  'm4b',
  'flac',
  'kbps',
  'vbr',
  'cbr',
  'retail',
])

// Try to extract author from common patterns like "Author - Title" or "Title by Author"
const AUTHOR_PATTERNS = [
  /^(.+?)\s*-\s*(.+)$/, // Author - Title
  /^(.+?)\s+by\s+(.+)$/i, // Title by Author
  /^(.+?)\s*\((.+?)\)/, // Title (Author)
]

export function parseTorrentName(filename: string): ParsedTorrentInfo {
  // Clean up the filename
  let cleaned = filename
    .replace(/\.[^/.]+$/, '') // Remove file extension
    .replace(SEPARATORS, ' ') // Replace separators with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()

  // Extract format
  let format: ParsedTorrentInfo['format'] = 'unknown'
  if (FORMAT_PATTERNS.mp3.test(filename)) format = 'mp3'
  else if (FORMAT_PATTERNS.m4b.test(filename)) format = 'm4b'
  else if (FORMAT_PATTERNS.flac.test(filename)) format = 'flac'

  // Extract bitrate
  const bitrateMatch = filename.match(BITRATE_PATTERN)
  const bitrate = bitrateMatch ? parseInt(bitrateMatch[1], 10) : undefined

  // Extract year
  const yearMatch = cleaned.match(YEAR_PATTERN)
  const year = yearMatch ? parseInt(yearMatch[0], 10) : undefined

  // Check if abridged
  const isAbridged = ABRIDGED_PATTERN.test(cleaned) && !UNABRIDGED_PATTERN.test(cleaned)

  // Remove noise words and technical info for title extraction
  let titlePart = cleaned
    .replace(YEAR_PATTERN, '')
    .replace(BITRATE_PATTERN, '')
    .replace(/\d+\s*gb|\d+\s*mb/gi, '')

  // Filter noise words
  const words = titlePart.split(' ').filter((word) => {
    const lower = word.toLowerCase()
    return word.length > 1 && !NOISE_WORDS.has(lower) && !/^\d+$/.test(word)
  })

  titlePart = words.join(' ').trim()

  // Try to extract author and title
  let title = titlePart
  let author: string | undefined

  for (const pattern of AUTHOR_PATTERNS) {
    const match = titlePart.match(pattern)
    if (match) {
      // Determine which group is author vs title based on common conventions
      const [, first, second] = match
      // Usually the shorter one before the dash is the author
      if (first.split(' ').length <= 3) {
        author = first.trim()
        title = second.trim()
      } else {
        title = first.trim()
        author = second.trim()
      }
      break
    }
  }

  return {
    title,
    author,
    year,
    format,
    bitrate,
    isAbridged,
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
  }
  return `${(bytes / 1024).toFixed(0)} KB`
}

export function formatStreamTitle(
  filename: string,
  size: number,
  seeders: number,
  source: string
): string {
  return `${filename}\n${formatFileSize(size)} | ${seeders} seeders | ${source}`
}
