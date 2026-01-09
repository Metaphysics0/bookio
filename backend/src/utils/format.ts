/**
 * Format file size in human-readable form
 */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`
  }
  return `${bytes} B`
}

/**
 * Format duration in HH:MM:SS format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Parse duration string (HH:MM:SS or MM:SS) to seconds
 */
export function parseDuration(duration: string): number {
  const parts = duration.split(':').map(Number)

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return parts[0] || 0
}

/**
 * Format stream title for display in Stremio-like UI
 */
export function formatStreamTitle(
  filename: string,
  size: number,
  seeders: number,
  source: string
): string {
  const parts = [formatFileSize(size)]

  if (seeders > 0) {
    parts.push(`${seeders} seeders`)
  }

  parts.push(source)

  return `${filename}\n${parts.join(' | ')}`
}

/**
 * Format stream name (short identifier)
 */
export function formatStreamName(
  source: string,
  format: string,
  bitrate?: number
): string {
  const quality = bitrate ? `${bitrate}kbps ${format.toUpperCase()}` : format.toUpperCase()
  return `${source}\n${quality}`
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Pluralize a word based on count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular
  return plural || `${singular}s`
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) {
    return `${diffDays} ${pluralize(diffDays, 'day')} ago`
  }
  if (diffHours > 0) {
    return `${diffHours} ${pluralize(diffHours, 'hour')} ago`
  }
  if (diffMinutes > 0) {
    return `${diffMinutes} ${pluralize(diffMinutes, 'minute')} ago`
  }
  return 'just now'
}
