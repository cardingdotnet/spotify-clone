/**
 * IMVU-Compatible Radio Endpoint
 *
 * URL: /radio/{code}.mp3
 *
 * Emits a continuous Icecast-style MP3 byte stream that IMVU's room radio
 * accepts. The endpoint:
 *
 *   1. Resolves the first track in parallel with the DB query (fast TTFB).
 *   2. Pre-resolves the next track in the background while the current one
 *      is still piping (zero gap between songs).
 *   3. Fetches HLS segments with a sliding window of 3 in parallel
 *      (no head-of-line blocking, no buffer underrun).
 *   4. Caches track metadata + signed URLs in-process so loops & reconnects
 *      avoid extra round trips.
 *   5. **Resumes from the listener's last position on reconnect** so when
 *      the connection drops (host time-limit, network blip, IMVU keep-alive
 *      timeout) the listener doesn't restart at track 1.
 *
 * IMPORTANT — about restarts on Vercel:
 *
 *   Vercel Serverless functions have a hard execution-time cap (10s Hobby,
 *   60s/300s Pro depending on tier). When the cap is hit, the response is
 *   killed mid-stream. IMVU's player auto-reconnects to the same URL, and
 *   without resume support the listener would restart at track 1 every
 *   N seconds. The reconnect-resume logic below mitigates that by tracking
 *   each listener's last position so they continue forward, but the only
 *   true fix is to host this endpoint somewhere that supports long-lived
 *   responses: Fly.io, Railway, Render, a VPS, or a Cloudflare Worker.
 *
 *   See README.md for hosting recommendations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getSoundCloudClient, Mp3StreamSource } from '@/lib/soundcloud/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// NOTE: maxDuration deliberately NOT set. The default on Vercel is the
// platform tier's max; on long-running hosts (Fly/Railway/VPS) there is no
// limit. Don't reintroduce this — it caps the stream length artificially.
// (Was: `export const maxDuration = 300;` — the source of the 5-minute restart bug.)

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
  'X-Accel-Buffering': 'no',
};

const SC_FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: '*/*',
  Referer: 'https://soundcloud.com/',
  Origin: 'https://soundcloud.com',
};

/** How many HLS segments to fetch in parallel ahead of the playhead. */
const HLS_PREFETCH = 3;

/* ─────────────── Playlist row cache (avoid Supabase round trip on reconnect) ─────────────── */
const PLAYLIST_TTL_MS = 30 * 1000;
const playlistCache = new Map<
  string,
  { rows: PlaylistRow[]; expiresAt: number }
>();

function getCachedPlaylist(code: string): PlaylistRow[] | null {
  const e = playlistCache.get(code);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    playlistCache.delete(code);
    return null;
  }
  return e.rows;
}

function setCachedPlaylist(code: string, rows: PlaylistRow[]): void {
  if (playlistCache.size > 1000) {
    const firstKey = playlistCache.keys().next().value;
    if (firstKey !== undefined) playlistCache.delete(firstKey);
  }
  playlistCache.set(code, { rows, expiresAt: Date.now() + PLAYLIST_TTL_MS });
}

/* ─────────────── Listener cursor (resume on reconnect) ─────────────── */
/**
 * Tracks where each listener was when their connection last closed, so on
 * reconnect we can resume from the *next* track instead of starting over.
 *
 * Key: `${code}:${listener-fingerprint}` — IP-hash + UA hash.
 * Value: index of the LAST track that was being played + when it was set.
 *
 * The cursor expires after CURSOR_TTL_MS to avoid a listener resuming days
 * later from a stale spot. The same TTL also means an IP rotation eventually
 * starts fresh from track 0, which is fine.
 */
const CURSOR_TTL_MS = 10 * 60 * 1000; // 10 minutes
const listenerCursor = new Map<string, { idx: number; expiresAt: number }>();

function getListenerCursor(key: string): number | null {
  const e = listenerCursor.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    listenerCursor.delete(key);
    return null;
  }
  return e.idx;
}

function setListenerCursor(key: string, idx: number): void {
  if (listenerCursor.size > 5000) {
    // Crude eviction
    const firstKey = listenerCursor.keys().next().value;
    if (firstKey !== undefined) listenerCursor.delete(firstKey);
  }
  listenerCursor.set(key, { idx, expiresAt: Date.now() + CURSOR_TTL_MS });
}

/** Build a stable listener fingerprint from IP + UA. */
async function listenerKey(code: string, request: NextRequest): Promise<string> {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const ua = request.headers.get('user-agent') || 'unknown';
  // Truncate UA to a coarse fingerprint so minor version bumps don't break resume.
  const uaCoarse = ua.substring(0, 40);
  const raw = `${code}|${ip}|${uaCoarse}`;
  return `${code}:${await sha256(raw)}`;
}

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 24);
}

/* ─────────────── Main handler ─────────────── */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = rawCode.replace(/\.(mp3|m3u|pls)$/i, '').toLowerCase();

  if (!code || code.length < 1) {
    return new NextResponse('Invalid radio URL', { status: 400 });
  }

  // ─── Load playlist (cache first, then Supabase) ───
  let rows = getCachedPlaylist(code);
  if (!rows) {
    const supabase = createAdminSupabaseClient();
    const { data: rawRows, error } = await supabase.rpc(
      'get_playlist_by_short_code',
      { p_code: code }
    );
    if (error) {
      console.error('[radio] DB error:', error);
      return new NextResponse('Failed to load playlist', { status: 500 });
    }
    rows = (rawRows ?? []) as PlaylistRow[];
    if (rows.length > 0) setCachedPlaylist(code, rows);
  }
  if (rows.length === 0) {
    return new NextResponse(`Radio not found: ${code}`, { status: 404 });
  }

  const playlistName = rows[0].playlist_name;
  const playlistId = rows[0].playlist_id;
  const trackIds = rows.map((r) => r.track_id);

  // ─── Resume support ───
  const lkey = await listenerKey(code, request);
  const lastIdx = getListenerCursor(lkey);
  // Start at the NEXT track after the last one played, so we don't replay
  // a track the listener just heard. (Wrap to 0 if at end.)
  const startIndex =
    lastIdx === null ? 0 : (lastIdx + 1) % trackIds.length;

  console.log(
    `[radio] ${code} -> "${playlistName}" (${trackIds.length} tracks). ` +
    `start=${startIndex} ${lastIdx !== null ? '(resume)' : '(fresh)'} ` +
    `UA="${(request.headers.get('user-agent') || '').substring(0, 60)}"`
  );

  // Fire-and-forget logging (never blocks the stream)
  logRadioAccess(code, request).catch((e) =>
    console.error('[radio] log failed:', e)
  );
  incrementPlayCount(playlistId).catch((e) =>
    console.error('[radio] play_count failed:', e)
  );

  const sc = getSoundCloudClient();
  const abortController = new AbortController();

  // Pre-warm the first track resolution (parallel with framework header send).
  const firstResolvePromise = sc.resolveMp3Stream(trackIds[startIndex]);

  request.signal.addEventListener('abort', () => {
    console.log(`[radio] ${code} client disconnected`);
    abortController.abort();
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let trackIndex = startIndex;
      let consecutiveFailures = 0;
      const MAX_CONSECUTIVE_FAILURES = trackIds.length * 2;

      let nextTrackPromise: Promise<Mp3StreamSource | null> | null =
        firstResolvePromise;

      while (!abortController.signal.aborted) {
        const trackId = trackIds[trackIndex % trackIds.length];

        let mp3: Mp3StreamSource | null = null;
        try {
          mp3 = await (nextTrackPromise || sc.resolveMp3Stream(trackId));
        } catch (e) {
          console.error(`[radio] ${code} resolve failed track ${trackId}:`, e);
        }

        // Save the cursor BEFORE piping, so even if the host process is
        // killed mid-track, on reconnect we advance to the NEXT track
        // (resume-forward semantics).
        setListenerCursor(lkey, trackIndex % trackIds.length);

        // Pre-resolve the following track in the background.
        const nextIdx = (trackIndex + 1) % trackIds.length;
        nextTrackPromise = sc
          .resolveMp3Stream(trackIds[nextIdx])
          .catch((e) => {
            console.error(`[radio] prefetch track ${trackIds[nextIdx]}:`, e);
            return null;
          });

        trackIndex++;

        if (!mp3) {
          consecutiveFailures++;
          console.warn(
            `[radio] ${code} skip track ${trackId} (no MP3). ` +
            `failures=${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}`
          );
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            console.error(`[radio] ${code} too many failures, ending stream`);
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
            await pipeHlsParallel(mp3.url, controller, abortController.signal);
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
            `[radio] ${code} stream error track ${trackId}:`,
            e?.message || e
          );
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
      'icy-description': `EgMax radio · ${safeName}`,
      'icy-br': '128',
    },
  });
}

export async function HEAD(
  _request: NextRequest,
  _ctx: { params: Promise<{ code: string }> }
) {
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

/* ─────────────── pipe helpers ─────────────── */

async function pipeProgressive(
  url: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  signal: AbortSignal
): Promise<void> {
  const res = await fetch(url, { headers: SC_FETCH_HEADERS, signal });
  if (!res.ok || !res.body) {
    throw new Error(`progressive fetch ${res.status}`);
  }

  const reader = res.body.getReader();
  while (true) {
    if (signal.aborted) {
      try { await reader.cancel(); } catch {}
      return;
    }
    const { done, value } = await reader.read();
    if (done) break;
    if (value && value.byteLength > 0) {
      try {
        controller.enqueue(value);
      } catch {
        try { await reader.cancel(); } catch {}
        return;
      }
    }
  }
}

async function pipeHlsParallel(
  manifestUrl: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  signal: AbortSignal
): Promise<void> {
  const manifestRes = await fetch(manifestUrl, { headers: SC_FETCH_HEADERS, signal });
  if (!manifestRes.ok) {
    throw new Error(`hls manifest fetch ${manifestRes.status}`);
  }
  const manifestText = await manifestRes.text();
  const segmentUrls = parseM3u8Segments(manifestText, manifestUrl);
  if (segmentUrls.length === 0) {
    throw new Error('hls manifest: no segments');
  }

  const fetchSegment = async (segUrl: string): Promise<Uint8Array | null> => {
    if (signal.aborted) return null;
    try {
      const res = await fetch(segUrl, { headers: SC_FETCH_HEADERS, signal });
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      return new Uint8Array(buf);
    } catch {
      return null;
    }
  };

  const queue: Array<Promise<Uint8Array | null>> = [];
  for (let i = 0; i < Math.min(HLS_PREFETCH, segmentUrls.length); i++) {
    queue.push(fetchSegment(segmentUrls[i]));
  }
  let nextToFetch = queue.length;

  for (let played = 0; played < segmentUrls.length; played++) {
    if (signal.aborted) return;

    const buf = await queue.shift()!;
    if (nextToFetch < segmentUrls.length) {
      queue.push(fetchSegment(segmentUrls[nextToFetch++]));
    }

    if (!buf || buf.byteLength === 0) continue;

    try {
      controller.enqueue(buf);
    } catch {
      await Promise.allSettled(queue);
      return;
    }
  }
}

function parseM3u8Segments(text: string, baseUrl: string): string[] {
  const out: string[] = [];
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    try {
      out.push(new URL(line, baseUrl).toString());
    } catch {
      // ignore
    }
  }
  return out;
}

function sanitizeIcyName(name: string): string {
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
    const ipHash = await sha256(ip);
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
