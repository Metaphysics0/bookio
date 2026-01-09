import type { Collection, WithId } from 'mongodb'
import { getDb } from '../mongo'

export interface PlaybackProgress {
  chapterId: string
  position: number
  duration: number
  completed: boolean
  lastPlayedAt: Date
}

export interface LibraryItem {
  userId: string
  audiobookId: string
  addedAt: Date
  progress: PlaybackProgress
  rating?: number
  notes?: string
}

export type LibraryDocument = WithId<LibraryItem>

function getLibraryCollection(): Collection<LibraryItem> {
  return getDb().collection<LibraryItem>('library')
}

export abstract class LibraryCollection {
  static async findByUser(userId: string): Promise<LibraryDocument[]> {
    return getLibraryCollection()
      .find({ userId })
      .sort({ 'progress.lastPlayedAt': -1 })
      .toArray()
  }

  static async findByUserAndAudiobook(
    userId: string,
    audiobookId: string
  ): Promise<LibraryDocument | null> {
    return getLibraryCollection().findOne({ userId, audiobookId })
  }

  static async addToLibrary(item: LibraryItem): Promise<void> {
    await getLibraryCollection().updateOne(
      { userId: item.userId, audiobookId: item.audiobookId },
      { $set: item },
      { upsert: true }
    )
  }

  static async updateProgress(
    userId: string,
    audiobookId: string,
    progress: PlaybackProgress
  ): Promise<void> {
    await getLibraryCollection().updateOne(
      { userId, audiobookId },
      { $set: { progress } }
    )
  }

  static async removeFromLibrary(userId: string, audiobookId: string): Promise<void> {
    await getLibraryCollection().deleteOne({ userId, audiobookId })
  }

  static async getRecentlyPlayed(userId: string, limit = 10): Promise<LibraryDocument[]> {
    return getLibraryCollection()
      .find({ userId, 'progress.lastPlayedAt': { $exists: true } })
      .sort({ 'progress.lastPlayedAt': -1 })
      .limit(limit)
      .toArray()
  }

  static async getInProgress(userId: string): Promise<LibraryDocument[]> {
    return getLibraryCollection()
      .find({
        userId,
        'progress.completed': false,
        'progress.position': { $gt: 0 },
      })
      .sort({ 'progress.lastPlayedAt': -1 })
      .toArray()
  }

  static async createIndexes(): Promise<void> {
    const collection = getLibraryCollection()
    await collection.createIndex({ userId: 1, audiobookId: 1 }, { unique: true })
    await collection.createIndex({ userId: 1, 'progress.lastPlayedAt': -1 })
  }
}
