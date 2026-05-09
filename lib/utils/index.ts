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
 * Generate stream URL using slug.
 * 
 * The URL works WITHOUT .m3u extension (clean) but
 * /stream/slug.m3u also works for older players.
 */
export function getStreamUrl(slug: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_SITE_URL || '';
  // Encode slug to handle Arabic and special characters in URLs
  const encodedSlug = encodeURIComponent(slug);
  return `${base}/stream/${encodedSlug}`;
}

/**
 * Generate stream URL with .m3u extension (for compatibility).
 * Use this when the player MUST see the .m3u extension.
 */
export function getStreamUrlWithExtension(slug: string, baseUrl?: string): string {
  return `${getStreamUrl(slug, baseUrl)}.m3u`;
}

export async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
