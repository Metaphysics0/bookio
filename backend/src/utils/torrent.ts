/**
 * Parse a magnet URI and extract the info hash
 */
export function parseInfoHash(magnetUri: string): string | null {
  const match = magnetUri.match(/urn:btih:([a-fA-F0-9]{40})/i)
  if (match) {
    return match[1].toLowerCase()
  }

  // Try base32 encoded hash
  const base32Match = magnetUri.match(/urn:btih:([a-zA-Z2-7]{32})/i)
  if (base32Match) {
    return base32ToHex(base32Match[1]).toLowerCase()
  }

  return null
}

/**
 * Create a magnet URI from an info hash
 */
export function createMagnetUri(
  infoHash: string,
  name?: string,
  trackers?: string[]
): string {
  let uri = `magnet:?xt=urn:btih:${infoHash}`

  if (name) {
    uri += `&dn=${encodeURIComponent(name)}`
  }

  if (trackers && trackers.length > 0) {
    for (const tracker of trackers) {
      uri += `&tr=${encodeURIComponent(tracker)}`
    }
  }

  return uri
}

/**
 * Validate an info hash (40 hex characters)
 */
export function isValidInfoHash(hash: string): boolean {
  return /^[a-fA-F0-9]{40}$/.test(hash)
}

/**
 * Convert base32 to hex (for BitTorrent v1 hashes)
 */
function base32ToHex(base32: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''

  for (const char of base32.toUpperCase()) {
    const index = alphabet.indexOf(char)
    if (index === -1) continue
    bits += index.toString(2).padStart(5, '0')
  }

  let hex = ''
  for (let i = 0; i < bits.length; i += 4) {
    const nibble = bits.substr(i, 4)
    if (nibble.length === 4) {
      hex += parseInt(nibble, 2).toString(16)
    }
  }

  return hex
}

/**
 * Common BitTorrent trackers for audiobook torrents
 */
export const DEFAULT_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://tracker.bittor.pw:1337/announce',
  'udp://public.popcorn-tracker.org:6969/announce',
]
