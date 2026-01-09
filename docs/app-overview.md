# Building an audiobook streaming platform with Stremio-inspired addon architecture

The Stremio ecosystem represents a masterclass in modular media streaming architecture. At its heart lies a **Rust-compiled WebAssembly core** that handles all business logic, a **stateless HTTP-based addon protocol** enabling unlimited content sources, and a **clean separation** between core functionality and extensible plugins. This document provides a comprehensive technical blueprint for building a similar platform focused on audiobooks and ebooks, starting with a torrent-based community addon.

---

## Stremio's three-layer architecture enables cross-platform consistency

Stremio separates concerns into three distinct layers that can be adapted for audiobook streaming:

**stremio-core (Rust/WASM)** handles all business logic including addon communication, state management, and stream resolution. Using an Elm-inspired architecture with immutable state and explicit side effects, the core implements unidirectional data flow: `Actions → Update → State → View`. The `Environment` trait abstracts platform specifics (fetch, storage, runtime), enabling the same codebase to run on desktop, mobile, web, and TV platforms. For an audiobook platform, this pattern provides **type safety through Rust**, **cross-platform portability** via WASM, and **predictable state management** for complex playback scenarios.

**stremio-web (React)** serves as a thin presentation layer that subscribes to state changes from the WASM runtime. The web app handles UI rendering, routing, and accessibility while delegating all business logic to the core. Key dependencies include HLS.js for adaptive streaming and a custom `stremio-video` package that wraps HTML5 media elements with features like audio track selection, subtitle support, and remote playback control.

**Addon protocol** defines a REST-like HTTP/JSON interface that any server can implement. Addons are discovered via manifest URLs, communicate through stateless request/response cycles, and are inherently sandboxed—they cannot access user data, modify the app UI, or execute local code. This architecture means **infinite extensibility without security risk**.

---

## The addon protocol is elegantly simple yet powerful

Every addon begins with a **manifest.json** that declares capabilities:

```json
{
	"id": "org.audiobooks.community",
	"version": "1.0.0",
	"name": "Community Audiobooks",
	"resources": ["catalog", "stream"],
	"types": ["audiobook"],
	"catalogs": [
		{
			"type": "audiobook",
			"id": "popular",
			"name": "Popular Audiobooks",
			"extra": [
				{ "name": "search" },
				{ "name": "genre", "options": ["Fiction", "Non-Fiction"] }
			]
		}
	],
	"idPrefixes": ["ab:"],
	"behaviorHints": { "configurable": true, "p2p": true }
}
```

Four resource types cover all content needs:

| Resource      | Endpoint                      | Purpose                                                  |
| ------------- | ----------------------------- | -------------------------------------------------------- |
| **catalog**   | `/catalog/{type}/{id}.json`   | Browseable content feeds with filtering/pagination       |
| **meta**      | `/meta/{type}/{id}.json`      | Detailed metadata including chapters, narrator, duration |
| **stream**    | `/stream/{type}/{id}.json`    | Playable stream sources (URLs, torrents, external links) |
| **subtitles** | `/subtitles/{type}/{id}.json` | Transcript/text tracks in SRT/VTT format                 |

**Stream responses** support multiple source types—one required per stream object:

- `url`: Direct HTTP/HTTPS link to audio file
- `infoHash`: BitTorrent info hash with optional `fileIdx` for multi-file torrents
- `externalUrl`: Opens external app (Audible, Spotify)
- `ytId`: YouTube video ID (useful for free audiobooks on YouTube)

The `behaviorHints` object enables rich metadata: `bingeGroup` for auto-selecting consistent quality across chapters, `notWebReady` for streams requiring transcoding, and `filename`/`videoSize` for player optimization.

---

## Torrentio reveals the optimal pattern for torrent-based addons

Torrentio's architecture demonstrates that **pre-scraped databases dramatically outperform live scraping**. Rather than hitting torrent sites on each request, Torrentio continuously scrapes sources into MongoDB, indexed by IMDB ID. When users request streams, the addon queries this database—delivering results in milliseconds instead of seconds.

The scraper infrastructure uses:

- **MongoDB** for primary torrent storage indexed by content ID
- **Redis** for query result caching and debrid cache status
- **Bottleneck** rate limiter with proxy rotation for scraping
- **parse-torrent-title** regex patterns for extracting quality metadata (resolution, codec, size)

**Debrid integration** transforms torrents into instant HTTPS streams. The flow:

1. Query debrid API to check which info hashes are already cached (Real-Debrid recently removed this, requiring Torrentio to maintain its own 8-hour TTL cache)
2. For cached torrents, return direct HTTPS streaming URL instead of magnet link
3. Mark stream titles with prefixes: `[RD+]` for cached/instant, `[RD download]` for uncached

Stream responses embed rich metadata in formatted strings:

```
💾 2.3 GB 👤 156 seeders ⚙️ LibriVox
```

Configuration is **URL-encoded** in the manifest path (`/sort=qualitysize|providers=librivox,archive/manifest.json`), making addons fully stateless and shareable.

---

## Browser-based torrent streaming is viable but constrained

WebTorrent enables **pure browser P2P** using WebRTC Data Channels instead of TCP/UDP. Critical limitations shape architecture decisions:

**WebRTC peer isolation**: Browser clients can only connect to other WebRTC-capable peers—not standard BitTorrent clients (uTorrent, qBittorrent). This means audiobook torrents need **WebTorrent-hybrid bridge servers** seeding to both networks.

**Service worker streaming** is the recommended approach for audio playback:

```javascript
navigator.serviceWorker.register("sw.min.js");
const controller = await navigator.serviceWorker.ready;
client.createServer({ controller });

// Stream audio file to HTML5 element
file.streamTo(document.querySelector("audio"));
```

**Sequential downloading** prioritizes pieces in playback order. When users seek, WebTorrent re-prioritizes pieces needed for the new position. For multi-file audiobook torrents (chapter files), selective downloading minimizes bandwidth:

```javascript
chapters.forEach((file, i) => {
	if (i === currentChapter)
		file.select(1); // High priority
	else if (i === currentChapter + 1)
		file.select(0); // Preload next
	else file.deselect(); // Skip others
});
```

**Performance characteristics**: First byte latency is **5-30 seconds** depending on peer availability. Sustained throughput depends on slowest peer. Seek latency is **2-10 seconds**. These numbers argue for a hybrid architecture with HTTP fallback.

---

## Recommended platform architecture for audiobooks

Based on Stremio's patterns and audiobook-specific requirements, here's the target architecture:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Audiobook Platform Architecture                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐ │
│  │   Web Client    │    │   Core (WASM)   │    │    Addon Server     │ │
│  │   - React       │◄──►│   - State mgmt  │◄──►│    - HTTP/JSON      │ │
│  │   - WebTorrent  │    │   - Addon comms │    │    - Stateless      │ │
│  │   - Audio Player│    │   - Library     │    │    - Manifest       │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────────┘ │
│           │                                              │              │
│           ▼                                              ▼              │
│  ┌─────────────────┐                        ┌─────────────────────────┐│
│  │  Streaming      │                        │   Community Addon       ││
│  │  - WebTorrent   │                        │   (Torrent Scraper)     ││
│  │  - Debrid proxy │                        │   - MongoDB             ││
│  │  - HTTP fallback│                        │   - Redis cache         ││
│  └─────────────────┘                        │   - Debrid integration  ││
│                                             └─────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

**Three-tier streaming strategy** ensures reliability:

1. **Primary: WebTorrent in browser** for P2P efficiency and zero server costs
2. **Fallback: HTTP streaming** from server when no WebRTC peers available
3. **Premium: Debrid integration** for instant HTTPS streaming via Real-Debrid/Premiumize

---

## Audiobook-specific data models extend Stremio's types

**Catalog items** (meta preview):

```json
{
	"id": "ab:1234",
	"type": "audiobook",
	"name": "Project Hail Mary",
	"poster": "https://...",
	"narrator": "Ray Porter",
	"author": "Andy Weir",
	"duration": "16:10:35",
	"releaseInfo": "2021",
	"genres": ["Science Fiction", "Adventure"]
}
```

**Full metadata** (meta resource):

```json
{
	"meta": {
		"id": "ab:1234",
		"type": "audiobook",
		"name": "Project Hail Mary",
		"description": "Ryland Grace is the sole survivor on a desperate mission...",
		"runtime": "16:10:35",
		"chapters": [
			{
				"id": "ab:1234:1",
				"title": "Chapter 1",
				"duration": "45:20",
				"startTime": 0
			},
			{
				"id": "ab:1234:2",
				"title": "Chapter 2",
				"duration": "38:15",
				"startTime": 2720
			}
		],
		"narrator": ["Ray Porter"],
		"author": ["Andy Weir"],
		"publisher": "Audible Studios"
	}
}
```

**Stream response** for torrent audiobooks:

```json
{
	"streams": [
		{
			"name": "Community\n320kbps MP3",
			"title": "Project.Hail.Mary.2021.Audiobook.MP3\n💾 580 MB 👤 42 ⚙️ LibriVox",
			"infoHash": "a1b2c3d4e5f6...",
			"fileIdx": 0,
			"behaviorHints": {
				"bingeGroup": "community-320k",
				"filename": "chapter01.mp3"
			}
		},
		{
			"name": "[RD+] Community\nFLAC",
			"url": "https://real-debrid.com/d/...",
			"title": "High Quality Lossless\n💾 2.1 GB"
		}
	]
}
```

---

## Security model keeps addons sandboxed by design

Stremio's addon security is **structural, not policy-based**. Addons are remote HTTP services that:

| Can Do                                  | Cannot Do                              |
| --------------------------------------- | -------------------------------------- |
| Respond to catalog/stream requests      | Access user library or watch history   |
| Receive user-configured API keys        | Execute local code on client           |
| Return any valid stream URL/magnet      | Modify app UI or behavior              |
| Be hosted anywhere (serverless, static) | Push notifications or background tasks |

**User configuration** is URL-encoded in the manifest path, making addons stateless. Sensitive data like debrid API keys can be encrypted with `encryptionSecret` in some SDK implementations.

For the audiobook platform, extend this model with **user authentication** for library sync while keeping addons completely isolated from auth tokens.

---

## MVP roadmap: Four phases to production

### Phase 1: Core foundation (Weeks 1-4)

**Goal**: Basic app with addon protocol and local playback

**Technical deliverables**:

- React web app with audio player (howler.js or native HTML5)
- TypeScript addon client implementing manifest fetch, resource requests
- Simple state management (Zustand or Redux) for library/playback state
- Basic UI: catalog browsing, audiobook details, player with chapter navigation

**Addon protocol implementation**:

```typescript
interface AddonClient {
	loadManifest(url: string): Promise<Manifest>;
	getCatalog(
		addonUrl: string,
		type: string,
		id: string,
		extra?: Record<string, string>,
	): Promise<CatalogResponse>;
	getMeta(addonUrl: string, type: string, id: string): Promise<MetaResponse>;
	getStreams(
		addonUrl: string,
		type: string,
		id: string,
	): Promise<StreamResponse>;
}
```

**Test with**: Static JSON addon hosted on GitHub Pages providing sample audiobooks

### Phase 2: Torrent streaming (Weeks 5-8)

**Goal**: WebTorrent integration with HTTP fallback

**Technical deliverables**:

- WebTorrent client with service worker streaming
- Multi-file torrent handling for chapter-based audiobooks
- Progress persistence in IndexedDB
- Playback position sync across chapters
- HTTP fallback endpoint on Node.js server

**Audiobook player component**:

```typescript
class AudiobookPlayer {
	private client: WebTorrent;
	private chapters: TorrentFile[];
	private currentChapter: number;

	async loadTorrent(infoHash: string): Promise<void>;
	async playChapter(index: number): Promise<void>;
	seek(seconds: number): void;
	saveProgress(): void;
	restoreProgress(): void;
}
```

**Test with**: Public domain audiobooks from LibriVox/Archive.org

### Phase 3: Community scraper addon (Weeks 9-14)

**Goal**: Torrentio-style addon for audiobook torrents

**Technical deliverables**:

- Node.js addon server with Express
- MongoDB for scraped torrent database
- Redis for caching
- Scrapers for audiobook sources (AudioBookBay, MyAnonamouse feeds, Archive.org)
- Filename parsing for quality/narrator/format extraction
- Debrid service integration (Real-Debrid, Premiumize)

**Scraper architecture**:

```typescript
interface AudiobookTorrent {
	infoHash: string;
	title: string;
	author: string;
	narrator?: string;
	format: "mp3" | "m4b" | "flac";
	bitrate?: number;
	size: number;
	seeders: number;
	source: string;
	scrapedAt: Date;
}

class AudiobookScraper {
	async scrapeSource(source: Source): Promise<AudiobookTorrent[]>;
	async matchToMetadata(torrent: AudiobookTorrent): Promise<string | null>; // Returns audiobook ID
}
```

**Metadata matching**: Use Audible/Goodreads APIs or OpenLibrary for authoritative metadata, fuzzy match scraped titles

### Phase 4: Platform polish (Weeks 15-20)

**Goal**: Production-ready with user accounts and mobile

**Technical deliverables**:

- User authentication (JWT, OAuth with Google/Apple)
- Cloud library sync across devices
- Mobile-responsive PWA with offline support
- Ebook reader addon (epub.js integration)
- Addon discovery/repository
- Analytics and error monitoring

**Additional addons**:

- **Librivox Official**: Public domain audiobooks via API
- **Archive.org**: Internet Archive audio collections
- **Podcast addon**: RSS feed support for audio content
- **Ebook addon**: Project Gutenberg, Standard Ebooks

---

## Technology recommendations mapped to Stremio patterns

| Component        | Stremio Uses           | Recommended for MVP | Notes                             |
| ---------------- | ---------------------- | ------------------- | --------------------------------- |
| Core logic       | Rust/WASM              | TypeScript          | Defer WASM until scale demands it |
| Web framework    | React                  | React + Vite        | Familiar, fast HMR                |
| State management | Elm-style in Rust      | Zustand             | Simple, TypeScript-native         |
| Audio player     | stremio-video + HLS.js | howler.js or native | HLS.js overkill for audio         |
| Torrent client   | Native + WebTorrent    | WebTorrent          | Browser-first                     |
| Addon server     | Express                | Express or Fastify  | SDK compatible                    |
| Database         | MongoDB                | MongoDB             | Same patterns as Torrentio        |
| Cache            | Redis                  | Redis               | Essential for scraper performance |
| Deployment       | Dokku (BeamUp)         | Vercel + Railway    | Serverless-friendly               |

---

## Key architectural decisions summarized

**Why addon protocol over embedded plugins**: Addons as HTTP services provide natural sandboxing, language agnosticism, independent deployment, and zero local code execution risk. Any audiobook community can create and host their own addon.

**Why pre-scraped database over live scraping**: Torrentio proves this pattern delivers sub-second response times versus 5-15 seconds for live scraping. Background scrapers with proper rate limiting avoid blocks while keeping data fresh.

**Why hybrid streaming architecture**: Pure WebTorrent faces peer availability issues (only ~70-80% direct P2P success). HTTP fallback ensures reliability. Debrid integration provides premium experience for paying users.

**Why TypeScript over Rust for MVP**: Stremio's Rust/WASM pattern enables cross-platform from a single codebase, but adds significant complexity. For a web-first MVP, TypeScript delivers faster iteration with option to introduce WASM later for performance-critical paths.

The Stremio architecture has proven itself across millions of users. Adapting its patterns for audiobooks—with appropriate modifications for chapter-based content, longer playback sessions, and audio-specific metadata—provides a solid foundation for building a community-driven streaming platform.
