/**
 * SoundCloud API Client — V2 (Internal API)
 *
 * Uses api-v2.soundcloud.com — same as the SoundCloud website.
 * The old V1 API (api.soundcloud.com) is restricted for public use.
 */

import { Track } from './types';

const SOUNDCLOUD_API_V2 = 'https://api-v2.soundcloud.com';

const DEFAULT_HEADERS = {
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://soundcloud.com/',
  'Origin': 'https://soundcloud.com',
};

export interface StreamResult {
  url: string;
  type: 'progressive' | 'hls';
  /** MIME reported by SoundCloud (e.g. "audio/mpeg", "audio/mp4"). */
  mimeType?: string;
  /** True when the chosen transcoding is MP3 (required by IMVU). */
  isMp3?: boolean;
}

/**
 * Descriptor used by the radio (IMVU) endpoint when it needs MP3 bytes.
 */
export interface Mp3StreamSource {
  trackId: number;
  /** Final resolved URL — either a direct progressive MP3 or an HLS-MP3 manifest. */
  url: string;
  type: 'progressive' | 'hls';
  /** Always "audio/mpeg" for an Mp3StreamSource. */
  mimeType: string;
}

/**
 * Determine if a SoundCloud transcoding is MP3 (the only format IMVU accepts).
 */
function isMp3Transcoding(t: any): boolean {
  const mime = String(t?.format?.mime_type || '').toLowerCase();
  const preset = String(t?.preset || '').toLowerCase();
  // mp3_0_0, mp3_1_0, mp3_standard, etc. Opus is "opus_0_0", AAC is "aac_..."
  return mime.includes('mpeg') || preset.startsWith('mp3');
}

export class SoundCloudClient {
  private clientId: string;

  constructor(clientId: string) {
    if (!clientId) {
      throw new Error('SoundCloud client ID is required');
    }
    this.clientId = clientId;
  }

  /**
   * Search for tracks
   */
  async searchTracks(
    query: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<Track[]> {
    const { limit = 20, offset = 0 } = options;

    const params = new URLSearchParams({
      q: query,
      client_id: this.clientId,
      limit: String(limit),
      offset: String(offset),
      linked_partitioning: '1',
    });

    const url = `${SOUNDCLOUD_API_V2}/search/tracks?${params}`;

    try {
      const response = await fetch(url, {
        headers: DEFAULT_HEADERS,
        next: { revalidate: 300 },
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        console.error(
          `SoundCloud V2 API error: ${response.status}`,
          text.substring(0, 300)
        );
        throw new Error(
          `SoundCloud API error: ${response.status}. ` +
          `Your client_id may be expired.`
        );
      }

      const data = await response.json();
      const tracks = (data.collection || []) as any[];

      return tracks
        .filter(t => t.kind === 'track' && t.streamable !== false)
        .map(normalizeV2Track);
    } catch (error) {
      console.error('SoundCloud search error:', error);
      throw error;
    }
  }

  /**
   * Get track details by ID
   */
  async getTrack(trackId: number): Promise<Track | null> {
    const params = new URLSearchParams({
      client_id: this.clientId,
    });

    const url = `${SOUNDCLOUD_API_V2}/tracks/${trackId}?${params}`;

    try {
      const response = await fetch(url, {
        headers: DEFAULT_HEADERS,
        next: { revalidate: 3600 },
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`SoundCloud API error: ${response.status}`);
      }

      const track = await response.json();
      return normalizeV2Track(track);
    } catch (error) {
      console.error(`Failed to fetch track ${trackId}:`, error);
      return null;
    }
  }

  /**
   * Resolve stream URL with type info.
   *
   * @param trackId - SoundCloud track ID
   * @param preferProgressive - If true, only use progressive (MP3). Better for M3U/external players.
   *                           If false, prefer HLS (better quality, used by web player).
   */
  async resolveStreamUrlWithType(
    trackId: number,
    preferProgressive: boolean = false
  ): Promise<StreamResult | null> {
    try {
      const params = new URLSearchParams({ client_id: this.clientId });
      const trackResponse = await fetch(
        `${SOUNDCLOUD_API_V2}/tracks/${trackId}?${params}`,
        { headers: DEFAULT_HEADERS, cache: 'no-store' }
      );

      if (!trackResponse.ok) {
        console.error(`Track fetch failed: ${trackResponse.status}`);
        return null;
      }

      const track = await trackResponse.json();
      const transcodings = track.media?.transcodings || [];

      if (transcodings.length === 0) {
        console.error(`No transcodings for track ${trackId}`);
        return null;
      }

      const fullTranscodings = transcodings.filter((t: any) => !t.snipped);
      const candidates = fullTranscodings.length > 0 ? fullTranscodings : transcodings;

      let chosen: any = null;
      let chosenType: 'progressive' | 'hls' = 'progressive';

      if (preferProgressive) {
        chosen = candidates.find((t: any) => t.format?.protocol === 'progressive');
        if (chosen) chosenType = 'progressive';
        else {
          chosen = candidates.find((t: any) => t.format?.protocol === 'hls');
          if (chosen) chosenType = 'hls';
        }
      } else {
        chosen = candidates.find((t: any) => t.format?.protocol === 'progressive');
        if (chosen) chosenType = 'progressive';
        else {
          chosen = candidates.find((t: any) => t.format?.protocol === 'hls');
          if (chosen) chosenType = 'hls';
        }
      }

      if (!chosen) chosen = candidates[0];
      if (!chosen) return null;

      if (chosen.format?.protocol === 'hls') chosenType = 'hls';
      else chosenType = 'progressive';

      const transcodingUrl = `${chosen.url}?client_id=${this.clientId}`;
      const resolveResponse = await fetch(transcodingUrl, {
        headers: DEFAULT_HEADERS,
        cache: 'no-store',
      });

      if (!resolveResponse.ok) {
        console.error(`Transcoding resolve failed: ${resolveResponse.status}`);
        return null;
      }

      const data = await resolveResponse.json();
      if (!data.url) return null;

      const mime = String(chosen.format?.mime_type || '');
      return {
        url: data.url,
        type: chosenType,
        mimeType: mime,
        isMp3: isMp3Transcoding(chosen),
      };
    } catch (error) {
      console.error(`Failed to get stream URL for track ${trackId}:`, error);
      return null;
    }
  }

  /**
   * Resolve a track to its MP3 stream specifically — required for IMVU radio.
   * IMVU only accepts MPEG audio (MP3); Opus/AAC will not play.
   *
   * Returns null if the track has no MP3 transcoding available.
   */
  async resolveMp3Stream(trackId: number): Promise<Mp3StreamSource | null> {
    try {
      const params = new URLSearchParams({ client_id: this.clientId });
      const trackResponse = await fetch(
        `${SOUNDCLOUD_API_V2}/tracks/${trackId}?${params}`,
        { headers: DEFAULT_HEADERS, cache: 'no-store' }
      );

      if (!trackResponse.ok) {
        console.error(`[mp3] Track fetch failed for ${trackId}: ${trackResponse.status}`);
        return null;
      }

      const track = await trackResponse.json();
      const transcodings: any[] = track.media?.transcodings || [];

      if (transcodings.length === 0) {
        console.error(`[mp3] No transcodings for track ${trackId}`);
        return null;
      }

      const full = transcodings.filter((t) => !t.snipped);
      const pool = full.length > 0 ? full : transcodings;

      // MP3 only — IMVU requirement.
      const mp3 = pool.filter(isMp3Transcoding);
      if (mp3.length === 0) {
        console.error(
          `[mp3] Track ${trackId} has no MP3 transcoding ` +
          `(available: ${pool.map((t) => t.preset).join(', ')})`
        );
        return null;
      }

      // Prefer progressive MP3 (single file), fall back to HLS-MP3 (segmented).
      const chosen =
        mp3.find((t) => t.format?.protocol === 'progressive') ||
        mp3.find((t) => t.format?.protocol === 'hls') ||
        mp3[0];

      const protocol: 'progressive' | 'hls' =
        chosen.format?.protocol === 'hls' ? 'hls' : 'progressive';

      const transcodingUrl = `${chosen.url}?client_id=${this.clientId}`;
      const resolveResponse = await fetch(transcodingUrl, {
        headers: DEFAULT_HEADERS,
        cache: 'no-store',
      });

      if (!resolveResponse.ok) {
        console.error(
          `[mp3] Transcoding resolve failed for track ${trackId}: ${resolveResponse.status}`
        );
        return null;
      }

      const data = await resolveResponse.json();
      if (!data.url) return null;

      return {
        trackId,
        url: data.url,
        type: protocol,
        mimeType: 'audio/mpeg',
      };
    } catch (error) {
      console.error(`[mp3] Failed to resolve track ${trackId}:`, error);
      return null;
    }
  }

  /**
   * Resolve a SoundCloud URL (track/playlist link)
   */
  async resolveUrl(soundcloudUrl: string): Promise<Track | Track[] | null> {
    const params = new URLSearchParams({
      url: soundcloudUrl,
      client_id: this.clientId,
    });

    try {
      const response = await fetch(`${SOUNDCLOUD_API_V2}/resolve?${params}`, {
        headers: DEFAULT_HEADERS,
      });

      if (!response.ok) return null;

      const data = await response.json();

      if (data.kind === 'track') {
        return normalizeV2Track(data);
      }

      if (data.kind === 'playlist' && Array.isArray(data.tracks)) {
        return data.tracks
          .filter((t: any) => t.streamable !== false)
          .map(normalizeV2Track);
      }

      return null;
    } catch (error) {
      console.error('Failed to resolve URL:', error);
      return null;
    }
  }
}

function normalizeV2Track(scTrack: any): Track {
  let artworkUrl: string | null = null;

  if (scTrack.artwork_url) {
    artworkUrl = scTrack.artwork_url.replace('-large', '-t500x500');
  } else if (scTrack.user?.avatar_url) {
    artworkUrl = scTrack.user.avatar_url.replace('-large', '-t500x500');
  }

  return {
    id: scTrack.id,
    title: scTrack.title || 'Untitled',
    artist: scTrack.user?.username || 'Unknown Artist',
    artistId: scTrack.user?.id || 0,
    duration: scTrack.duration || 0,
    artworkUrl,
    permalinkUrl: scTrack.permalink_url || '',
    streamable: scTrack.streamable !== false,
    genre: scTrack.genre || null,
    source: 'soundcloud',
  };
}

let _client: SoundCloudClient | null = null;

export function getSoundCloudClient(): SoundCloudClient {
  if (!_client) {
    const clientId = process.env.SOUNDCLOUD_CLIENT_ID;
    if (!clientId) {
      throw new Error('SOUNDCLOUD_CLIENT_ID environment variable is not set');
    }
    _client = new SoundCloudClient(clientId);
  }
  return _client;
}
