import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatCount(num: number): string {
  if (num < 1000) return String(num);
  if (num < 1_000_000) return `${(num / 1000).toFixed(1)}K`;
  return `${(num / 1_000_000).toFixed(1)}M`;
}

/**
 * Generate stream URL using short code.
 * Example: https://yoursite.com/stream/ax8k2m
 *
 * This URL works in:
 *  - IMVU room Radio Streaming (paste as-is)
 *  - VLC (open network stream)
 *  - Browsers (downloads/plays M3U)
 *  - Mobile players
 *
 * How it works: returns an M3U playlist where each entry is
 * /api/stream-resolve/[trackId] which does a 302 redirect to
 * the actual SoundCloud MP3. IMVU follows the full redirect chain.
 */
export function getStreamUrl(shortCode: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_SITE_URL || '';
  return `${base}/stream/${shortCode}`;
}

/**
 * Generate stream URL with .m3u extension.
 * Some older/stricter players require the .m3u extension to recognise the format.
 * Both /stream/code and /stream/code.m3u hit the same endpoint.
 */
export function getStreamUrlWithExtension(shortCode: string, baseUrl?: string): string {
  return `${getStreamUrl(shortCode, baseUrl)}.m3u`;
}

export async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
