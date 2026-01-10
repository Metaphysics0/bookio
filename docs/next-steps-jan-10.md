---

Current State Summary

What's Real vs Mock
┌─────────────────────┬────────────┬──────────────────────────────────────────────────┐
│ Component │ Status │ Notes │
├─────────────────────┼────────────┼──────────────────────────────────────────────────┤
│ API Framework │ ✅ Real │ Elysia with all routes working │
├─────────────────────┼────────────┼──────────────────────────────────────────────────┤
│ MongoDB Collections │ ✅ Real │ library, torrents, users schemas defined │
├─────────────────────┼────────────┼──────────────────────────────────────────────────┤
│ Redis Caching │ ✅ Real │ Used for debrid cache (8hr TTL) │
├─────────────────────┼────────────┼──────────────────────────────────────────────────┤
│ Scraper Framework │ ⚠️ Partial │ Framework works, but sources create fake hashes │
├─────────────────────┼────────────┼──────────────────────────────────────────────────┤
│ Addon Service │ ❌ Mock │ 3 hardcoded sample books in service.ts:36-95 │
├─────────────────────┼────────────┼──────────────────────────────────────────────────┤
│ Debrid Integration │ ⚠️ Partial │ Real-Debrid API calls implemented, needs API key │
├─────────────────────┼────────────┼──────────────────────────────────────────────────┤
│ Authentication │ ❌ Mock │ Uses x-user-id header, not secure │
└─────────────────────┴────────────┴──────────────────────────────────────────────────┘

---

What to Check in Your Deployed Services

MongoDB Atlas

Your collections should exist (created on first use):

- library - User's saved audiobooks + playback progress
- torrents - Scraped torrent metadata (currently empty)
- users - User accounts (currently empty)

Check via MongoDB Atlas UI or:

# Connect via mongosh

mongosh "mongodb+srv://your-cluster.mongodb.net/bookio"

> show collections
> db.torrents.countDocuments() # Should be 0 initially

Upstash Redis

- Used for debrid cache only (cache:debrid:{provider}:{infoHash})
- Should be mostly empty until users start checking torrent availability

Fly.io Endpoints to Test

# Health check

curl https://your-app.fly.dev/health

# Addon manifest

curl https://your-app.fly.dev/addon/community/manifest.json

# Catalog (returns mock data)

curl https://your-app.fly.dev/addon/community/catalog/audiobook/popular.json

# Scraper status

curl https://your-app.fly.dev/addon/community/scraper/status

---

Can Your Current Implementation Support Your Goal?

Yes, the architecture is correct. The addon protocol is well-designed and follows Stremio patterns. However, you need to:

1. Replace mock data with real queries in backend/src/modules/addon/service.ts
2. Fix the scrapers to find real torrents (or use a public books API for metadata)
3. Build a frontend client that consumes the addon API

---

What's Required for End Users to Enable the Addon

Currently, your addon is accessed via:
https://your-app.fly.dev/addon/community/manifest.json

For a Stremio-style experience, users would:

1. Go to your frontend app
2. The app auto-loads the community addon manifest
3. Browse catalogs, view metadata, get streams

No user action needed for the built-in community addon. For third-party addons, you'd implement:
// User adds addon URL
POST /addon/register { manifestUrl: "https://third-party.com/manifest.json" }

---

Next Steps (Prioritized)

Phase 1: Make the Backend Real

1. Update Addon Service to Query MongoDB (backend/src/modules/addon/service.ts)

The mock data at lines 36-95 and 200-227 needs to query the torrents collection:

// Replace getCatalog mock with real query
async getCatalog(addonId: string, type: string, catalogId: string, extra?: CatalogExtra) {
const torrentsCollection = await getTorrentsCollection();

    const filter: any = {};
    if (extra?.search) {
      filter.$text = { $search: extra.search };
    }

    const torrents = await torrentsCollection
      .find(filter)
      .skip(extra?.skip || 0)
      .limit(20)
      .toArray();

    // Transform torrents to catalog items
    return { metas: torrents.map(t => ({
      id: `ab:${t.infoHash}`,
      type: 'audiobook',
      name: t.title,
      poster: '', // Need metadata API
      author: t.author,
      narrator: t.narrator,
    }))};

}

2. Integrate a Public Books API for Metadata

Since you want a book catalogue from a public API, consider:

- Open Library API (openlibrary.org) - Free, extensive
- Google Books API - Good cover images
- Hardcover.app API - Modern, audiobook-aware

Create a new service:
// backend/src/modules/metadata/service.ts
class MetadataService {
async searchBooks(query: string): Promise<BookMetadata[]>;
async getBookById(id: string): Promise<BookMetadata>;
}

3. Fix the Scrapers or Remove Them

The current LibriVox/Archive.org scrapers at backend/src/modules/scraper/sources/ create fake hashes. Options:

a) Remove them - Focus on metadata API first, add real torrent sources later
b) Fix LibriVox - Their API provides real audio files (not torrents), so stream directly:
// LibriVox gives direct MP3 URLs, not torrents
{
url: "https://archive.org/download/..../chapter1.mp3",
name: "LibriVox Direct",
// No infoHash needed
}

Phase 2: Build the Frontend

Your frontend should:

1. Fetch catalog from /addon/community/catalog/audiobook/popular.json
2. Display book grid with covers from metadata API
3. On book click, fetch /addon/community/meta/audiobook/{id}.json
4. Show streams from /addon/community/stream/audiobook/{id}.json
5. Play via WebTorrent (for torrents) or direct HTTP (for LibriVox)

Phase 3: Real Torrent Sources (Later)

For actual torrent streaming, you'd need:

- AudioBook Bay scraper (requires careful implementation)
- MyAnonamouse integration (private tracker)
- Real-Debrid for cached torrent → HTTPS conversion

---

Immediate Action Items

1. Verify deployment works: Hit /health and /addon/community/manifest.json
2. Check MongoDB connection: Look for any errors in fly logs
3. Decide on metadata source: Open Library API is easiest to start
4. Update addon service: Replace mock data with real queries

Would you like me to:

1. Update the addon service to query MongoDB instead of returning mock data?
2. Add an Open Library API integration for book metadata?
3. Fix the LibriVox scraper to return real streaming URLs (they're free public domain audiobooks)?
