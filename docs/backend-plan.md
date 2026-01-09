# Bookio Backend Project Structure Plan

## Overview

Bun + Elysia backend service combining the addon system and core logic, following Elysia's official best practices (feature-based modules, Elysia instances as controllers, static services for non-request logic).

---

## Project Structure

```
src/
├── index.ts                    # App entrypoint
├── app.ts                      # Main Elysia instance, mounts all modules
├── config/
│   └── index.ts                # Environment config (typed)
│
├── modules/
│   ├── addon/                  # Addon protocol implementation
│   │   ├── index.ts            # Addon controller (Elysia instance)
│   │   ├── service.ts          # Addon registry, manifest loading
│   │   ├── model.ts            # Manifest, CatalogItem, Meta, Stream types
│   │   └── routes/
│   │       ├── catalog.ts      # GET /addon/:addonId/catalog/:type/:id.json
│   │       ├── meta.ts         # GET /addon/:addonId/meta/:type/:id.json
│   │       ├── stream.ts       # GET /addon/:addonId/stream/:type/:id.json
│   │       └── manifest.ts     # GET /addon/:addonId/manifest.json
│   │
│   ├── scraper/                # Background torrent scraping
│   │   ├── index.ts            # Scraper controller (status endpoints)
│   │   ├── service.ts          # Scraper orchestration logic
│   │   ├── sources/            # Individual source scrapers
│   │   │   ├── librivox.ts
│   │   │   ├── archive-org.ts
│   │   │   └── audiobookbay.ts
│   │   ├── parser.ts           # Filename parsing (quality, narrator, format)
│   │   └── scheduler.ts        # Cron job setup for background scraping
│   │
│   ├── library/                # User library & playback state
│   │   ├── index.ts            # Library controller
│   │   ├── service.ts          # Library CRUD, progress sync
│   │   └── model.ts            # LibraryItem, PlaybackProgress types
│   │
│   ├── debrid/                 # Debrid service integration
│   │   ├── index.ts            # Debrid controller (cache check, link generation)
│   │   ├── service.ts          # Real-Debrid, Premiumize API clients
│   │   └── model.ts            # DebridLink, CacheStatus types
│   │
│   └── auth/                   # Authentication (Phase 4)
│       ├── index.ts            # Auth controller
│       ├── service.ts          # JWT, OAuth logic
│       └── model.ts            # User, Session types
│
├── db/
│   ├── mongo.ts                # MongoDB connection & client
│   ├── redis.ts                # Redis connection & client
│   └── collections/
│       ├── torrents.ts         # Torrent collection helpers
│       ├── users.ts            # User collection helpers
│       └── library.ts          # Library collection helpers
│
├── plugins/                    # Reusable Elysia plugins
│   ├── auth.ts                 # Auth guard macro (isSignedIn)
│   ├── rateLimit.ts            # Rate limiting plugin
│   └── cors.ts                 # CORS configuration
│
└── utils/
    ├── torrent.ts              # Magnet URI parsing, info hash utils
    ├── metadata.ts             # Fuzzy matching for title/author
    └── format.ts               # Stream title formatting (size, seeders, source)
```

---

## Key Patterns (Following Elysia Best Practices)

### 1. Elysia Instance as Controller

Each module's `index.ts` exports an Elysia instance that acts as the controller:

```typescript
// src/modules/addon/index.ts
import Elysia from 'elysia'
import { catalogRoute } from './routes/catalog'
import { metaRoute } from './routes/meta'
import { streamRoute } from './routes/stream'
import { manifestRoute } from './routes/manifest'

export const addonModule = new Elysia({ prefix: '/addon' })
  .use(catalogRoute)
  .use(metaRoute)
  .use(streamRoute)
  .use(manifestRoute)
```

### 2. Static Services for Non-Request Logic

Business logic that doesn't depend on request context uses abstract classes with static methods:

```typescript
// src/modules/scraper/service.ts
import { TorrentCollection } from '@/db/collections/torrents'

abstract class ScraperService {
  static async scrapeSource(sourceId: string): Promise<number> {
    // Returns count of new torrents scraped
  }

  static async matchToMetadata(torrent: RawTorrent): Promise<string | null> {
    // Fuzzy match to audiobook ID
  }
}
```

### 3. Models with Elysia's Type System

Single source of truth for validation and types:

```typescript
// src/modules/addon/model.ts
import { t } from 'elysia'

export const ManifestSchema = t.Object({
  id: t.String(),
  version: t.String(),
  name: t.String(),
  resources: t.Array(t.Union([
    t.Literal('catalog'),
    t.Literal('meta'),
    t.Literal('stream'),
    t.Literal('subtitles')
  ])),
  types: t.Array(t.String()),
  catalogs: t.Array(t.Object({
    type: t.String(),
    id: t.String(),
    name: t.String(),
    extra: t.Optional(t.Array(t.Object({
      name: t.String(),
      options: t.Optional(t.Array(t.String()))
    })))
  })),
  idPrefixes: t.Optional(t.Array(t.String())),
  behaviorHints: t.Optional(t.Object({
    configurable: t.Optional(t.Boolean()),
    p2p: t.Optional(t.Boolean())
  }))
})

export type Manifest = typeof ManifestSchema.static
```

### 4. Request-Dependent Services as Named Elysia Instances

For services that need request context (auth, session):

```typescript
// src/plugins/auth.ts
import Elysia from 'elysia'

export const authPlugin = new Elysia({ name: 'Auth.Plugin' })
  .macro({
    isSignedIn: {
      resolve({ cookie, status }) {
        if (!cookie.session.value) return status(401)
        return { session: cookie.session.value }
      }
    }
  })
```

---

## App Composition

```typescript
// src/app.ts
import Elysia from 'elysia'
import { cors } from '@elysiajs/cors'
import { addonModule } from './modules/addon'
import { scraperModule } from './modules/scraper'
import { libraryModule } from './modules/library'
import { debridModule } from './modules/debrid'
import { authPlugin } from './plugins/auth'

export const app = new Elysia()
  .use(cors())
  .use(authPlugin)
  .use(addonModule)
  .use(scraperModule)
  .use(libraryModule)
  .use(debridModule)
  .get('/health', () => ({ status: 'ok' }))
```

```typescript
// src/index.ts
import { app } from './app'
import { connectMongo } from './db/mongo'
import { connectRedis } from './db/redis'
import { startScraperScheduler } from './modules/scraper/scheduler'

await connectMongo()
await connectRedis()
startScraperScheduler()

app.listen(3000)
console.log('Bookio running on http://localhost:3000')
```

---

## Addon Protocol Endpoints

| Endpoint | Handler |
|----------|---------|
| `GET /:addonId/manifest.json` | Return addon manifest |
| `GET /:addonId/catalog/:type/:id.json` | Return catalog items with optional `?search=` and `?genre=` |
| `GET /:addonId/meta/:type/:id.json` | Return full audiobook metadata with chapters |
| `GET /:addonId/stream/:type/:id.json` | Return available streams (torrents, debrid links, HTTP) |

---

## Background Scraper Architecture

```typescript
// src/modules/scraper/scheduler.ts
import { CronJob } from 'cron' // or use Bun's native setInterval

export function startScraperScheduler() {
  // Run every 6 hours
  new CronJob('0 */6 * * *', async () => {
    await ScraperService.scrapeSource('librivox')
    await ScraperService.scrapeSource('archive-org')
  }).start()
}
```

Each source scraper implements a common interface:

```typescript
// src/modules/scraper/sources/librivox.ts
import type { AudiobookTorrent } from '../model'

export async function scrapeLibrivox(): Promise<AudiobookTorrent[]> {
  // Fetch RSS/API, parse, return normalized torrents
}
```

---

## Database Collections

**MongoDB Collections:**
- `torrents` - Scraped torrent data indexed by infoHash and audiobook ID
- `audiobooks` - Canonical audiobook metadata (matched from sources)
- `users` - User accounts (Phase 4)
- `library` - User library items and playback progress

**Redis Keys:**
- `cache:catalog:{type}:{id}` - Cached catalog responses (5 min TTL)
- `cache:debrid:{infoHash}` - Debrid cache status (8 hour TTL per Torrentio pattern)
- `ratelimit:{ip}` - Rate limiting counters

---

## Dependencies

```json
{
  "dependencies": {
    "elysia": "^1.x",
    "@elysiajs/cors": "^1.x",
    "mongodb": "^6.x",
    "redis": "^4.x",
    "cron": "^3.x",
    "parse-torrent": "^11.x"
  },
  "devDependencies": {
    "bun-types": "latest",
    "typescript": "^5.x"
  }
}
```

---

## Verification Plan

1. **Unit tests**: Use Elysia's `app.handle(new Request(...))` pattern
2. **Integration tests**: Spin up test MongoDB/Redis containers
3. **Manual testing**:
   - Verify addon manifest loads at `http://localhost:3000/community/manifest.json`
   - Test catalog endpoint returns audiobook items
   - Test stream endpoint returns torrent info hashes
4. **Scraper verification**: Check MongoDB for scraped torrents after scheduler runs

---

## Implementation Order

1. **Setup**: Project scaffold, config, DB connections
2. **Addon module**: Manifest + catalog endpoints with static JSON data
3. **Scraper module**: LibriVox scraper + MongoDB storage
4. **Stream endpoint**: Query scraped torrents, return stream objects
5. **Debrid module**: Real-Debrid integration for cache checking
6. **Library module**: User progress sync (requires auth)
7. **Auth module**: JWT/OAuth implementation
