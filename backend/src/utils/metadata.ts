/**
 * Simple Levenshtein distance for fuzzy matching
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Calculate similarity ratio between two strings (0-1)
 */
export function stringSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase().trim()
  const bLower = b.toLowerCase().trim()

  if (aLower === bLower) return 1

  const distance = levenshteinDistance(aLower, bLower)
  const maxLength = Math.max(aLower.length, bLower.length)

  return 1 - distance / maxLength
}

/**
 * Normalize a title for matching
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Normalize an author name for matching
 */
export function normalizeAuthor(author: string): string {
  return author
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Match a scraped torrent to audiobook metadata
 */
export interface MatchResult {
  audiobookId: string
  confidence: number
  titleMatch: number
  authorMatch: number
}

export function matchAudiobook(
  scrapedTitle: string,
  scrapedAuthor: string,
  candidates: Array<{ id: string; title: string; author: string }>
): MatchResult | null {
  const normalizedScrapedTitle = normalizeTitle(scrapedTitle)
  const normalizedScrapedAuthor = normalizeAuthor(scrapedAuthor)

  let bestMatch: MatchResult | null = null
  let bestConfidence = 0

  for (const candidate of candidates) {
    const normalizedTitle = normalizeTitle(candidate.title)
    const normalizedAuthor = normalizeAuthor(candidate.author)

    const titleMatch = stringSimilarity(normalizedScrapedTitle, normalizedTitle)
    const authorMatch = stringSimilarity(normalizedScrapedAuthor, normalizedAuthor)

    // Weight title more heavily than author
    const confidence = titleMatch * 0.7 + authorMatch * 0.3

    if (confidence > bestConfidence && confidence > 0.7) {
      bestConfidence = confidence
      bestMatch = {
        audiobookId: candidate.id,
        confidence,
        titleMatch,
        authorMatch,
      }
    }
  }

  return bestMatch
}

/**
 * Extract possible series info from title
 */
export interface SeriesInfo {
  seriesName: string
  bookNumber?: number
}

export function extractSeriesInfo(title: string): SeriesInfo | null {
  // Common patterns: "Title (Series Name #1)", "Series Name, Book 1: Title"
  const patterns = [
    /\((.+?)\s*#(\d+)\)/,
    /\((.+?),?\s*Book\s*(\d+)\)/i,
    /(.+?),?\s*Book\s*(\d+):/i,
    /(.+?)\s*#(\d+):/,
  ]

  for (const pattern of patterns) {
    const match = title.match(pattern)
    if (match) {
      return {
        seriesName: match[1].trim(),
        bookNumber: parseInt(match[2], 10),
      }
    }
  }

  return null
}
