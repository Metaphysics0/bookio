/**
 * Open Library Metadata Service
 * Fetches book metadata from Open Library API (openlibrary.org)
 */

export interface BookMetadata {
  id: string
  title: string
  author: string[]
  description?: string
  cover?: string
  publishYear?: number
  subjects?: string[]
  isbn?: string[]
  openLibraryId: string
  openLibraryWorkId?: string
}

export interface OpenLibrarySearchResult {
  numFound: number
  docs: OpenLibraryDoc[]
}

interface OpenLibraryDoc {
  key: string // "/works/OL123W"
  title: string
  author_name?: string[]
  first_publish_year?: number
  cover_i?: number
  subject?: string[]
  isbn?: string[]
  number_of_pages_median?: number
}

interface OpenLibraryWork {
  title: string
  description?: string | { value: string }
  subjects?: string[]
  covers?: number[]
  authors?: { author: { key: string } }[]
}

const OPEN_LIBRARY_API = 'https://openlibrary.org'
const COVER_BASE_URL = 'https://covers.openlibrary.org/b'

// Simple in-memory cache with TTL
const cache = new Map<string, { data: unknown; expires: number }>()
const CACHE_TTL = 1000 * 60 * 60 // 1 hour

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL })
}

export abstract class MetadataService {
  /**
   * Search for books by title, author, or general query
   */
  static async searchBooks(query: string, limit = 20): Promise<BookMetadata[]> {
    const cacheKey = `search:${query}:${limit}`
    const cached = getCached<BookMetadata[]>(cacheKey)
    if (cached) return cached

    try {
      const url = `${OPEN_LIBRARY_API}/search.json?q=${encodeURIComponent(query)}&limit=${limit}&fields=key,title,author_name,first_publish_year,cover_i,subject,isbn`
      const response = await fetch(url)

      if (!response.ok) {
        console.error(`Open Library search failed: ${response.status}`)
        return []
      }

      const data = (await response.json()) as OpenLibrarySearchResult
      const results = data.docs.map((doc) => this.docToMetadata(doc))

      setCache(cacheKey, results)
      return results
    } catch (error) {
      console.error('Open Library search error:', error)
      return []
    }
  }

  /**
   * Get detailed metadata for a specific work by Open Library ID
   */
  static async getWorkById(workId: string): Promise<BookMetadata | null> {
    const cacheKey = `work:${workId}`
    const cached = getCached<BookMetadata>(cacheKey)
    if (cached) return cached

    try {
      // Ensure workId is in correct format
      const id = workId.startsWith('/works/') ? workId : `/works/${workId}`
      const url = `${OPEN_LIBRARY_API}${id}.json`
      const response = await fetch(url)

      if (!response.ok) {
        console.error(`Open Library work fetch failed: ${response.status}`)
        return null
      }

      const work = (await response.json()) as OpenLibraryWork

      // Fetch author names
      const authorNames: string[] = []
      if (work.authors?.length) {
        for (const authorRef of work.authors.slice(0, 3)) {
          const authorUrl = `${OPEN_LIBRARY_API}${authorRef.author.key}.json`
          try {
            const authorRes = await fetch(authorUrl)
            if (authorRes.ok) {
              const authorData = (await authorRes.json()) as { name: string }
              authorNames.push(authorData.name)
            }
          } catch {
            // Skip failed author fetches
          }
        }
      }

      const metadata: BookMetadata = {
        id: `ol:${workId.replace('/works/', '')}`,
        title: work.title,
        author: authorNames.length ? authorNames : ['Unknown Author'],
        description:
          typeof work.description === 'string'
            ? work.description
            : work.description?.value,
        cover: work.covers?.[0]
          ? `${COVER_BASE_URL}/id/${work.covers[0]}-L.jpg`
          : undefined,
        subjects: work.subjects?.slice(0, 10),
        openLibraryId: id,
        openLibraryWorkId: workId,
      }

      setCache(cacheKey, metadata)
      return metadata
    } catch (error) {
      console.error('Open Library work fetch error:', error)
      return null
    }
  }

  /**
   * Search specifically for audiobook-related content
   */
  static async searchAudiobooks(query: string, limit = 20): Promise<BookMetadata[]> {
    // Open Library doesn't have an audiobook-specific filter,
    // so we search normally. The scraper will match these to actual audiobook sources.
    return this.searchBooks(query, limit)
  }

  /**
   * Get cover image URL for a book
   */
  static getCoverUrl(
    coverId: number | undefined,
    size: 'S' | 'M' | 'L' = 'L'
  ): string | undefined {
    if (!coverId) return undefined
    return `${COVER_BASE_URL}/id/${coverId}-${size}.jpg`
  }

  /**
   * Get cover by ISBN
   */
  static getCoverByIsbn(isbn: string, size: 'S' | 'M' | 'L' = 'L'): string {
    return `${COVER_BASE_URL}/isbn/${isbn}-${size}.jpg`
  }

  /**
   * Convert Open Library search doc to our metadata format
   */
  private static docToMetadata(doc: OpenLibraryDoc): BookMetadata {
    const workId = doc.key.replace('/works/', '')
    return {
      id: `ol:${workId}`,
      title: doc.title,
      author: doc.author_name || ['Unknown Author'],
      cover: doc.cover_i
        ? `${COVER_BASE_URL}/id/${doc.cover_i}-L.jpg`
        : undefined,
      publishYear: doc.first_publish_year,
      subjects: doc.subject?.slice(0, 10),
      isbn: doc.isbn?.slice(0, 5),
      openLibraryId: doc.key,
      openLibraryWorkId: workId,
    }
  }

  /**
   * Fuzzy match a title/author to find the best matching book
   */
  static async matchBook(
    title: string,
    author?: string
  ): Promise<BookMetadata | null> {
    const query = author ? `${title} ${author}` : title
    const results = await this.searchBooks(query, 5)

    if (results.length === 0) return null

    // Simple scoring: prefer exact title matches
    const titleLower = title.toLowerCase()
    const scored = results.map((book) => {
      let score = 0
      const bookTitleLower = book.title.toLowerCase()

      // Exact title match
      if (bookTitleLower === titleLower) score += 100

      // Title contains search
      if (bookTitleLower.includes(titleLower)) score += 50

      // Author match
      if (author && book.author.some((a) =>
        a.toLowerCase().includes(author.toLowerCase())
      )) {
        score += 30
      }

      return { book, score }
    })

    scored.sort((a, b) => b.score - a.score)
    return scored[0]?.book || results[0]
  }
}
