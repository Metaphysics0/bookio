import type { Collection, WithId } from 'mongodb'
import { getDb } from '../mongo'

export interface User {
  email: string
  passwordHash?: string
  name?: string
  oauthProvider?: 'google' | 'apple'
  oauthId?: string
  debridSettings?: {
    realDebridApiKey?: string
    premiumizeApiKey?: string
  }
  preferences?: {
    preferredQuality?: 'high' | 'medium' | 'low'
    autoPlay?: boolean
    sleepTimerMinutes?: number
  }
  createdAt: Date
  updatedAt: Date
}

export type UserDocument = WithId<User>

function getUsersCollection(): Collection<User> {
  return getDb().collection<User>('users')
}

export abstract class UserCollection {
  static async findById(id: string): Promise<UserDocument | null> {
    const { ObjectId } = await import('mongodb')
    return getUsersCollection().findOne({ _id: new ObjectId(id) })
  }

  static async findByEmail(email: string): Promise<UserDocument | null> {
    return getUsersCollection().findOne({ email: email.toLowerCase() })
  }

  static async findByOAuth(
    provider: 'google' | 'apple',
    oauthId: string
  ): Promise<UserDocument | null> {
    return getUsersCollection().findOne({ oauthProvider: provider, oauthId })
  }

  static async create(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date()
    const result = await getUsersCollection().insertOne({
      ...user,
      email: user.email.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    })
    return result.insertedId.toString()
  }

  static async update(id: string, updates: Partial<User>): Promise<void> {
    const { ObjectId } = await import('mongodb')
    await getUsersCollection().updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      }
    )
  }

  static async updateDebridSettings(
    id: string,
    settings: User['debridSettings']
  ): Promise<void> {
    const { ObjectId } = await import('mongodb')
    await getUsersCollection().updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          debridSettings: settings,
          updatedAt: new Date(),
        },
      }
    )
  }

  static async createIndexes(): Promise<void> {
    const collection = getUsersCollection()
    await collection.createIndex({ email: 1 }, { unique: true })
    await collection.createIndex({ oauthProvider: 1, oauthId: 1 })
  }
}
