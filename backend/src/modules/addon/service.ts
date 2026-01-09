import type { Manifest, CatalogItem, Meta, Stream } from './model'

// Built-in community addon manifest
const communityManifest: Manifest = {
  id: 'org.bookio.community',
  version: '1.0.0',
  name: 'Community Audiobooks',
  description: 'Community-sourced audiobooks from various torrent sources',
  resources: ['catalog', 'meta', 'stream'],
  types: ['audiobook'],
  catalogs: [
    {
      type: 'audiobook',
      id: 'popular',
      name: 'Popular Audiobooks',
      extra: [
        { name: 'search' },
        { name: 'genre', options: ['Fiction', 'Non-Fiction', 'Science Fiction', 'Fantasy', 'Mystery', 'Romance', 'Biography', 'Self-Help'] },
      ],
    },
    {
      type: 'audiobook',
      id: 'recent',
      name: 'Recently Added',
    },
  ],
  idPrefixes: ['ab:'],
  behaviorHints: {
    configurable: true,
    p2p: true,
  },
}

// Sample audiobook data for testing
const sampleAudiobooks: CatalogItem[] = [
  {
    id: 'ab:1',
    type: 'audiobook',
    name: 'Project Hail Mary',
    poster: 'https://m.media-amazon.com/images/I/91vS2L5YfEL._SL1500_.jpg',
    narrator: 'Ray Porter',
    author: 'Andy Weir',
    duration: '16:10:35',
    releaseInfo: '2021',
    genres: ['Science Fiction', 'Adventure'],
    description: 'Ryland Grace is the sole survivor on a desperate, last-chance mission.',
  },
  {
    id: 'ab:2',
    type: 'audiobook',
    name: 'The Martian',
    poster: 'https://m.media-amazon.com/images/I/81wFMY9OAFL._SL1500_.jpg',
    narrator: 'Wil Wheaton',
    author: 'Andy Weir',
    duration: '10:53:00',
    releaseInfo: '2014',
    genres: ['Science Fiction', 'Thriller'],
    description: 'Six days ago, astronaut Mark Watney became one of the first people to walk on Mars.',
  },
  {
    id: 'ab:3',
    type: 'audiobook',
    name: 'Dune',
    poster: 'https://m.media-amazon.com/images/I/81ym3QUd3KL._SL1500_.jpg',
    narrator: 'Scott Brick',
    author: 'Frank Herbert',
    duration: '21:02:00',
    releaseInfo: '1965',
    genres: ['Science Fiction', 'Fantasy'],
    description: 'Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides.',
  },
]

// Full metadata for sample audiobooks
const sampleMetas: Record<string, Meta> = {
  'ab:1': {
    id: 'ab:1',
    type: 'audiobook',
    name: 'Project Hail Mary',
    description: 'Ryland Grace is the sole survivor on a desperate, last-chance mission—and if he fails, humanity and the Earth itself will perish. Except that right now, he doesn\'t know that. He can\'t even remember his own name, let alone the nature of his assignment or how to complete it.',
    poster: 'https://m.media-amazon.com/images/I/91vS2L5YfEL._SL1500_.jpg',
    runtime: '16:10:35',
    chapters: [
      { id: 'ab:1:1', title: 'Chapter 1', duration: '45:20', startTime: 0 },
      { id: 'ab:1:2', title: 'Chapter 2', duration: '38:15', startTime: 2720 },
      { id: 'ab:1:3', title: 'Chapter 3', duration: '42:30', startTime: 5015 },
      { id: 'ab:1:4', title: 'Chapter 4', duration: '35:45', startTime: 7565 },
      { id: 'ab:1:5', title: 'Chapter 5', duration: '48:10', startTime: 9710 },
    ],
    narrator: ['Ray Porter'],
    author: ['Andy Weir'],
    publisher: 'Audible Studios',
    releaseInfo: '2021',
    genres: ['Science Fiction', 'Adventure'],
  },
  'ab:2': {
    id: 'ab:2',
    type: 'audiobook',
    name: 'The Martian',
    description: 'Six days ago, astronaut Mark Watney became one of the first people to walk on Mars. Now, he\'s sure he\'ll be the first person to die there.',
    poster: 'https://m.media-amazon.com/images/I/81wFMY9OAFL._SL1500_.jpg',
    runtime: '10:53:00',
    chapters: [
      { id: 'ab:2:1', title: 'Sol 6', duration: '32:15', startTime: 0 },
      { id: 'ab:2:2', title: 'Sol 7', duration: '28:40', startTime: 1935 },
      { id: 'ab:2:3', title: 'Sol 14', duration: '35:20', startTime: 3655 },
    ],
    narrator: ['Wil Wheaton'],
    author: ['Andy Weir'],
    publisher: 'Podium Audio',
    releaseInfo: '2014',
    genres: ['Science Fiction', 'Thriller'],
  },
  'ab:3': {
    id: 'ab:3',
    type: 'audiobook',
    name: 'Dune',
    description: 'Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world where the only thing of value is the "spice" melange.',
    poster: 'https://m.media-amazon.com/images/I/81ym3QUd3KL._SL1500_.jpg',
    runtime: '21:02:00',
    chapters: [
      { id: 'ab:3:1', title: 'Book One: Dune', duration: '7:30:00', startTime: 0 },
      { id: 'ab:3:2', title: 'Book Two: Muad\'Dib', duration: '7:00:00', startTime: 27000 },
      { id: 'ab:3:3', title: 'Book Three: The Prophet', duration: '6:32:00', startTime: 52200 },
    ],
    narrator: ['Scott Brick'],
    author: ['Frank Herbert'],
    publisher: 'Macmillan Audio',
    releaseInfo: '1965',
    genres: ['Science Fiction', 'Fantasy'],
  },
}

// Sample streams for testing
const sampleStreams: Record<string, Stream[]> = {
  'ab:1': [
    {
      name: 'Community\n320kbps MP3',
      title: 'Project.Hail.Mary.2021.Audiobook.MP3\n580 MB | 42 seeders | LibriVox',
      infoHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      fileIdx: 0,
      behaviorHints: {
        bingeGroup: 'community-320k',
        filename: 'chapter01.mp3',
      },
    },
    {
      name: 'Community\nFLAC Lossless',
      title: 'Project.Hail.Mary.2021.FLAC\n2.1 GB | 15 seeders',
      infoHash: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
      fileIdx: 0,
      behaviorHints: {
        bingeGroup: 'community-flac',
        filename: 'chapter01.flac',
      },
    },
  ],
  'ab:2': [
    {
      name: 'Community\n256kbps MP3',
      title: 'The.Martian.2014.Audiobook\n450 MB | 28 seeders',
      infoHash: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
      fileIdx: 0,
    },
  ],
  'ab:3': [
    {
      name: 'Community\n320kbps MP3',
      title: 'Dune.1965.Unabridged\n890 MB | 67 seeders',
      infoHash: 'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
      fileIdx: 0,
    },
  ],
}

// Addon registry - maps addon IDs to manifests
const addonRegistry: Map<string, Manifest> = new Map([
  ['community', communityManifest],
])

export abstract class AddonService {
  static getManifest(addonId: string): Manifest | null {
    return addonRegistry.get(addonId) ?? null
  }

  static getAllAddons(): Manifest[] {
    return Array.from(addonRegistry.values())
  }

  static registerAddon(manifest: Manifest): void {
    addonRegistry.set(manifest.id, manifest)
  }

  static getCatalog(
    addonId: string,
    type: string,
    catalogId: string,
    extra?: { search?: string; genre?: string; skip?: number }
  ): CatalogItem[] {
    // For now, return sample data
    // In production, this would query MongoDB
    let items = [...sampleAudiobooks]

    if (extra?.search) {
      const searchLower = extra.search.toLowerCase()
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.author?.toLowerCase().includes(searchLower) ||
          item.narrator?.toLowerCase().includes(searchLower)
      )
    }

    if (extra?.genre) {
      items = items.filter((item) =>
        item.genres?.some((g) => g.toLowerCase() === extra.genre?.toLowerCase())
      )
    }

    const skip = extra?.skip ?? 0
    return items.slice(skip, skip + 20)
  }

  static getMeta(addonId: string, type: string, id: string): Meta | null {
    // For now, return sample data
    // In production, this would query MongoDB
    return sampleMetas[id] ?? null
  }

  static getStreams(addonId: string, type: string, id: string): Stream[] {
    // For now, return sample data
    // In production, this would query MongoDB for scraped torrents
    return sampleStreams[id] ?? []
  }
}
