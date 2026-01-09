import { t } from 'elysia'

export const PlaybackProgressSchema = t.Object({
  chapterId: t.String(),
  position: t.Number(),
  duration: t.Number(),
  completed: t.Boolean(),
  lastPlayedAt: t.String(), // ISO date string
})

export type PlaybackProgress = typeof PlaybackProgressSchema.static

export const LibraryItemSchema = t.Object({
  audiobookId: t.String(),
  addedAt: t.String(), // ISO date string
  progress: PlaybackProgressSchema,
  rating: t.Optional(t.Number()),
  notes: t.Optional(t.String()),
})

export type LibraryItem = typeof LibraryItemSchema.static

export const AddToLibrarySchema = t.Object({
  audiobookId: t.String(),
})

export const UpdateProgressSchema = t.Object({
  chapterId: t.String(),
  position: t.Number(),
  duration: t.Number(),
  completed: t.Optional(t.Boolean()),
})
