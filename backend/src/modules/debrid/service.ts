import { config } from '@/config'
import { cacheGet, cacheSet } from '@/db/redis'
import type { CacheStatus, DebridLink, DebridProvider } from './model'

const CACHE_TTL_SECONDS = config.debrid.cacheTtlHours * 60 * 60

// Real-Debrid API implementation
class RealDebridProvider implements DebridProvider {
  id = 'real-debrid'
  name = 'Real-Debrid'
  private baseUrl = 'https://api.real-debrid.com/rest/1.0'

  private get apiKey(): string {
    return config.debrid.realDebridApiKey
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`Real-Debrid API error: ${response.status}`)
    }

    return response.json() as Promise<T>
  }

  async checkCache(infoHashes: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()

    if (!this.apiKey) {
      return results
    }

    try {
      // Real-Debrid instant availability check
      const hashList = infoHashes.join('/')
      const data = await this.request<Record<string, unknown>>(
        `/torrents/instantAvailability/${hashList}`
      )

      for (const hash of infoHashes) {
        const hashLower = hash.toLowerCase()
        const availability = data[hashLower]
        results.set(hash, availability !== undefined && Object.keys(availability as object).length > 0)
      }
    } catch (error) {
      console.error('Real-Debrid cache check failed:', error)
    }

    return results
  }

  async generateLink(infoHash: string, fileId?: number): Promise<DebridLink | null> {
    if (!this.apiKey) {
      return null
    }

    try {
      // Add magnet to Real-Debrid
      const magnetUri = `magnet:?xt=urn:btih:${infoHash}`
      const addResult = await this.request<{ id: string }>(
        '/torrents/addMagnet',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `magnet=${encodeURIComponent(magnetUri)}`,
        }
      )

      // Select files (or all if no specific file requested)
      await this.request(`/torrents/selectFiles/${addResult.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: fileId !== undefined ? `files=${fileId}` : 'files=all',
      })

      // Get torrent info
      const torrentInfo = await this.request<{
        links: string[]
        filename: string
        bytes: number
      }>(`/torrents/info/${addResult.id}`)

      if (!torrentInfo.links || torrentInfo.links.length === 0) {
        return null
      }

      // Unrestrict the link
      const unrestricted = await this.request<{
        download: string
        filename: string
        filesize: number
        mimeType: string
      }>('/unrestrict/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `link=${encodeURIComponent(torrentInfo.links[0])}`,
      })

      return {
        url: unrestricted.download,
        filename: unrestricted.filename,
        size: unrestricted.filesize,
        mimeType: unrestricted.mimeType,
      }
    } catch (error) {
      console.error('Real-Debrid link generation failed:', error)
      return null
    }
  }
}

// Provider registry
const providers: Map<string, DebridProvider> = new Map([
  ['real-debrid', new RealDebridProvider()],
])

export abstract class DebridService {
  static getProvider(id: string): DebridProvider | undefined {
    return providers.get(id)
  }

  static getAvailableProviders(): string[] {
    const available: string[] = []
    if (config.debrid.realDebridApiKey) available.push('real-debrid')
    if (config.debrid.premiumizeApiKey) available.push('premiumize')
    return available
  }

  static async checkCache(
    infoHashes: string[],
    providerId?: string
  ): Promise<CacheStatus[]> {
    const results: CacheStatus[] = []
    const providerIds = providerId ? [providerId] : this.getAvailableProviders()

    for (const id of providerIds) {
      const provider = providers.get(id)
      if (!provider) continue

      // Check Redis cache first
      const uncachedHashes: string[] = []
      for (const hash of infoHashes) {
        const cacheKey = `cache:debrid:${id}:${hash}`
        const cached = await cacheGet<boolean>(cacheKey)

        if (cached !== null) {
          results.push({
            infoHash: hash,
            cached,
            provider: id,
          })
        } else {
          uncachedHashes.push(hash)
        }
      }

      // Check provider for uncached hashes
      if (uncachedHashes.length > 0) {
        const providerResults = await provider.checkCache(uncachedHashes)

        for (const [hash, isCached] of providerResults) {
          // Cache the result
          const cacheKey = `cache:debrid:${id}:${hash}`
          await cacheSet(cacheKey, isCached, CACHE_TTL_SECONDS)

          results.push({
            infoHash: hash,
            cached: isCached,
            provider: id,
          })
        }
      }
    }

    return results
  }

  static async generateLink(
    infoHash: string,
    providerId: string,
    fileId?: number
  ): Promise<DebridLink | null> {
    const provider = providers.get(providerId)
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`)
    }

    return provider.generateLink(infoHash, fileId)
  }
}
