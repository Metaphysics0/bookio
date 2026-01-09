import { LibraryCollection, type LibraryItem, type PlaybackProgress } from '@/db/collections/library'

export abstract class LibraryService {
  static async getUserLibrary(userId: string) {
    const items = await LibraryCollection.findByUser(userId)
    return items.map((item) => ({
      audiobookId: item.audiobookId,
      addedAt: item.addedAt.toISOString(),
      progress: {
        ...item.progress,
        lastPlayedAt: item.progress.lastPlayedAt.toISOString(),
      },
      rating: item.rating,
      notes: item.notes,
    }))
  }

  static async getLibraryItem(userId: string, audiobookId: string) {
    const item = await LibraryCollection.findByUserAndAudiobook(userId, audiobookId)
    if (!item) return null

    return {
      audiobookId: item.audiobookId,
      addedAt: item.addedAt.toISOString(),
      progress: {
        ...item.progress,
        lastPlayedAt: item.progress.lastPlayedAt.toISOString(),
      },
      rating: item.rating,
      notes: item.notes,
    }
  }

  static async addToLibrary(userId: string, audiobookId: string) {
    const now = new Date()
    const item: LibraryItem = {
      userId,
      audiobookId,
      addedAt: now,
      progress: {
        chapterId: '',
        position: 0,
        duration: 0,
        completed: false,
        lastPlayedAt: now,
      },
    }

    await LibraryCollection.addToLibrary(item)
  }

  static async updateProgress(
    userId: string,
    audiobookId: string,
    update: {
      chapterId: string
      position: number
      duration: number
      completed?: boolean
    }
  ) {
    const progress: PlaybackProgress = {
      chapterId: update.chapterId,
      position: update.position,
      duration: update.duration,
      completed: update.completed ?? false,
      lastPlayedAt: new Date(),
    }

    await LibraryCollection.updateProgress(userId, audiobookId, progress)
  }

  static async removeFromLibrary(userId: string, audiobookId: string) {
    await LibraryCollection.removeFromLibrary(userId, audiobookId)
  }

  static async getRecentlyPlayed(userId: string, limit = 10) {
    const items = await LibraryCollection.getRecentlyPlayed(userId, limit)
    return items.map((item) => ({
      audiobookId: item.audiobookId,
      addedAt: item.addedAt.toISOString(),
      progress: {
        ...item.progress,
        lastPlayedAt: item.progress.lastPlayedAt.toISOString(),
      },
    }))
  }

  static async getInProgress(userId: string) {
    const items = await LibraryCollection.getInProgress(userId)
    return items.map((item) => ({
      audiobookId: item.audiobookId,
      addedAt: item.addedAt.toISOString(),
      progress: {
        ...item.progress,
        lastPlayedAt: item.progress.lastPlayedAt.toISOString(),
      },
    }))
  }
}
