/**
 * IMVU-Compatible Radio Endpoint
 *
 * URL: /radio/{code}.mp3
 *
 * IMVU's room radio player only accepts "Direct Stream" URLs — i.e. an
 * Icecast/Shoutcast-style endpoint that emits a continuous MP3 byte stream.
 * It does NOT parse .m3u/.pls playlists, does NOT follow redirects across
 * tracks, and only plays MPEG audio (MP3) — never AAC/Opus.
 *
 * This route impersonates a small Icecast server:
 *   - Content-Type: audio/mpeg
 *   - icy-* metadata headers
 *   - One never-ending HTTP body containing concatenated MP3 frames
 *     drawn from the playlist's tracks (looped forever).
 *
 * The track lookup happens lazily as we go, so SoundCloud signed URLs
 * never expire mid-stream — each track gets a fresh URL when its turn
 * comes up.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getSoundCloudClient, Mp3StreamSource } from '@/lib/soundcloud/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// No max duration — this is supposed to stream forever.
// On Vercel free tier this is capped at ~10s/60s; deploy on a long-running
// Node host (Fly, Railway, VPS, Render) for proper IMVU behavior.
export const maxDuration = 300;

interface PlaylistRow {
  playlist_id: string;
  playlist_name: string;
  playlist_short_code: string;
  user_id: string;
  track_id: number;
  track_title: string;
  track_artist: string;
  track_duration_ms: number;
  track_position: number;
}

const RADIO_HEADERS = {
  'Content-Type': 'audio/mpeg',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  'Access-Control-Allow-Origin': '*',
  Connection: 'close',
  'icy-pub': '0',
};

const SC_FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: '*/*',
  Referer: 'https://soundcloud.com/',
  Origin: 'https://soundcloud.com',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = rawCode.replace(/\.(mp3|m3u|pls)$/i, '').toLowerCase();

  if (!code || code.length < 1) {
    return new NextResponse('Invalid radio URL', { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data: rawRows, error } = await supabase.rpc('get_playlist_by_short_code', {
    p_code: code,
  });

  if (error) {
    console.error('[radio] DB error:', error);
    return new NextResponse('Failed to load playlist', { status: 500 });
  }

  const rows = (rawRows ?? []) as PlaylistRow[];
  if (rows.length === 0) {
    return new NextResponse(`Radio not found: ${code}`, { status: 404 });
  }

  const playlistName = rows[0].playlist_name;
  const playlistId = rows[0].playlist_id;
  const trackIds = rows.map((r) => r.track_id);

  console.log(
    `[radio] ${code} -> "${playlistName}" (${trackIds.length} tracks). UA="${request.headers
      .get('user-agent')
      ?.substring(0, 80)}"`
  );

  // Track that someone tuned in
  logRadioAccess(code, request).catch((e) =>
    console.error('[radio] log failed:', e)
  );
  incrementPlayCount(playlistId).catch((e) =>
    console.error('[radio] play_count failed:', e)
  );

  const sc = getSoundCloudClient();
  const abortController = new AbortController();

  // When the IMVU client disconnects, kill the loop.
  request.signal.addEventListener('abort', () => {
    console.log(`[radio] ${code} client disconnected, stopping stream`);
    abortController.abort();
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let trackIndex = 0;
      let consecutiveFailures = 0;
      const MAX_CONSECUTIVE_FAILURES = trackIds.length * 2;

      // Helpful tag: silence padding bytes (a tiny valid MP3 frame) used
      // when we need to insert a brief gap between tracks. Optional.
      // We don't currently insert silence; tracks butt up against each other.

      while (!abortController.signal.aborted) {
        const trackId = trackIds[trackIndex % trackIds.length];
        trackIndex++;

        let mp3: Mp3StreamSource | null = null;
        try {
          mp3 = await sc.resolveMp3Stream(trackId);
        } catch (e) {
          console.error(`[radio] ${code} resolve failed track ${trackId}:`, e);
        }

        if (!mp3) {
          consecutiveFailures++;
          console.warn(
            `[radio] ${code} skipping track ${trackId} (no MP3). failures=${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}`
          );

          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            console.error(
              `[radio] ${code} too many consecutive failures, ending stream`
            );
            try {
              controller.close();
            } catch {}
            return;
          }
          continue;
        }
        consecutiveFailures = 0;

        try {
          if (mp3.type === 'progressive') {
            await pipeProgressive(mp3.url, controller, abortController.signal);
          } else {
            await pipeHls(mp3.url, controller, abortController.signal);
          }
        } catch (e: any) {
          if (
            abortController.signal.aborted ||
            e?.name === 'AbortError' ||
            e?.code === 'ERR_INVALID_STATE'
          ) {
            return;
          }
          console.error(
            `[radio] ${code} stream error on track ${trackId}:`,
            e?.message || e
          );
          // Move on to next track
        }
      }

      try {
        controller.close();
      } catch {}
    },
    cancel() {
      abortController.abort();
    },
  });

  const safeName = sanitizeIcyName(playlistName);

  return new NextResponse(stream as any, {
    status: 200,
    headers: {
      ...RADIO_HEADERS,
      'icy-name': safeName,
      'icy-genre': 'Various',
      'icy-description': `Radio stream from EgMax/Spotify-Clone playlist "${safeName}"`,
      'icy-br': '128',
    },
  });
}

export async function HEAD(
  _request: NextRequest,
  _ctx: { params: Promise<{ code: string }> }
) {
  // IMVU/Icecast clients sometimes probe with HEAD first.
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...RADIO_HEADERS,
      'icy-name': 'EgMax Radio',
      'icy-br': '128',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Icy-MetaData, Range',
    },
  });
}

/* ---------------- helpers ---------------- */

/**
 * Stream a progressive MP3 URL straight through to the client.
 */
async function pipeProgressive(
  url: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  signal: AbortSignal
): Promise<void> {
  const res = await fetch(url, {
    headers: SC_FETCH_HEADERS,
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`progressive fetch ${res.status}`);
  }

  const reader = res.body.getReader();
  while (true) {
    if (signal.aborted) {
      try {
        await reader.cancel();
      } catch {}
      return;
    }
    const { done, value } = await reader.read();
    if (done) break;
    if (value && value.byteLength > 0) {
      try {
        controller.enqueue(value);
      } catch {
        // Controller closed (client disconnected)
        try {
          await reader.cancel();
        } catch {}
        return;
      }
    }
  }
}

/**
 * Parse an HLS m3u8 manifest, fetch each MP3 segment in order,
 * and pipe their bytes to the client. SoundCloud's HLS-MP3 segments
 * are raw MPEG-1 Layer 3 frames that concatenate cleanly into one
 * continuous MP3 — exactly what IMVU expects.
 */
async function pipeHls(
  manifestUrl: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  signal: AbortSignal
): Promise<void> {
  const manifestRes = await fetch(manifestUrl, {
    headers: SC_FETCH_HEADERS,
    signal,
  });
  if (!manifestRes.ok) {
    throw new Error(`hls manifest fetch ${manifestRes.status}`);
  }
  const manifestText = await manifestRes.text();

  const segmentUrls = parseM3u8Segments(manifestText, manifestUrl);
  if (segmentUrls.length === 0) {
    throw new Error('hls manifest: no segments');
  }

  for (const segUrl of segmentUrls) {
    if (signal.aborted) return;

    const segRes = await fetch(segUrl, {
      headers: SC_FETCH_HEADERS,
      signal,
    });
    if (!segRes.ok || !segRes.body) {
      // skip bad segment, keep going
      continue;
    }

    const reader = segRes.body.getReader();
    while (true) {
      if (signal.aborted) {
        try {
          await reader.cancel();
        } catch {}
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.byteLength > 0) {
        try {
          controller.enqueue(value);
        } catch {
          try {
            await reader.cancel();
          } catch {}
          return;
        }
      }
    }
  }
}

/**
 * Extract segment URIs from an HLS playlist body.
 */
function parseM3u8Segments(text: string, baseUrl: string): string[] {
  const out: string[] = [];
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    try {
      // Resolve relative -> absolute
      out.push(new URL(line, baseUrl).toString());
    } catch {
      // ignore
    }
  }
  return out;
}

function sanitizeIcyName(name: string): string {
  // ICY headers are ASCII-only in old clients; strip non-ASCII safely.
  return (name || 'EgMax Radio')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[\r\n]/g, ' ')
    .trim()
    .substring(0, 80) || 'EgMax Radio';
}

async function logRadioAccess(code: string, request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient();
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const ipHash = await hash(ip);
    await supabase.from('stream_access_logs').insert({
      stream_token: code,
      user_agent: ('[radio] ' + userAgent).substring(0, 500),
      ip_hash: ipHash,
    });
  } catch (e) {
    console.error('[radio] logRadioAccess error:', e);
  }
}

async function incrementPlayCount(playlistId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: current } = await supabase
    .from('playlists')
    .select('play_count')
    .eq('id', playlistId)
    .single();
  if (current) {
    await supabase
      .from('playlists')
      .update({ play_count: (current.play_count || 0) + 1 })
      .eq('id', playlistId);
  }
}

async function hash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
