import type { Collection, WithId } from 'mongodb'
import { getDb } from '../mongo'

export interface AudiobookTorrent {
  infoHash: string
  title: string
  author: string
  narrator?: string
  format: 'mp3' | 'm4b' | 'flac' | 'unknown'
  bitrate?: number
  size: number
  seeders: number
  source: string
  audiobookId?: string
  scrapedAt: Date
  files?: {
    name: string
    size: number
    idx: number
  }[]
}

export type TorrentDocument = WithId<AudiobookTorrent>

function getTorrentsCollection(): Collection<AudiobookTorrent> {
  return getDb().collection<AudiobookTorrent>('torrents')
}

export abstract class TorrentCollection {
  static async findByInfoHash(infoHash: string): Promise<TorrentDocument | null> {
    return getTorrentsCollection().findOne({ infoHash })
  }

  static async findByAudiobookId(audiobookId: string): Promise<TorrentDocument[]> {
    return getTorrentsCollection()
      .find({ audiobookId })
      .sort({ seeders: -1 })
      .toArray()
  }

  static async upsertTorrent(torrent: AudiobookTorrent): Promise<void> {
    await getTorrentsCollection().updateOne(
      { infoHash: torrent.infoHash },
      { $set: torrent },
      { upsert: true }
    )
  }

  static async upsertMany(torrents: AudiobookTorrent[]): Promise<void> {
    if (torrents.length === 0) return

    const operations = torrents.map((torrent) => ({
      updateOne: {
        filter: { infoHash: torrent.infoHash },
        update: { $set: torrent },
        upsert: true,
      },
    }))

    await getTorrentsCollection().bulkWrite(operations)
  }

  static async getRecentlyScraped(source: string, limit = 100): Promise<TorrentDocument[]> {
    return getTorrentsCollection()
      .find({ source })
      .sort({ scrapedAt: -1 })
      .limit(limit)
      .toArray()
  }

  static async countBySource(source: string): Promise<number> {
    return getTorrentsCollection().countDocuments({ source })
  }

  static async search(query: string, limit = 20): Promise<TorrentDocument[]> {
    return getTorrentsCollection()
      .find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { author: { $regex: query, $options: 'i' } },
          { narrator: { $regex: query, $options: 'i' } },
        ],
      })
      .sort({ seeders: -1 })
      .limit(limit)
      .toArray()
  }

  static async createIndexes(): Promise<void> {
    const collection = getTorrentsCollection()
    await collection.createIndex({ infoHash: 1 }, { unique: true })
    await collection.createIndex({ audiobookId: 1 })
    await collection.createIndex({ source: 1 })
    await collection.createIndex({ scrapedAt: -1 })
    await collection.createIndex({ title: 'text', author: 'text', narrator: 'text' })
  }
}
