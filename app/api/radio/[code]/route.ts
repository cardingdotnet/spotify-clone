/**
 * IMVU-Compatible Radio Stream Endpoint
 *
 * URL: /api/radio/[code]
 * Also reachable via: /radio/[code]  and  /radio/[code].mp3
 *
 * What IMVU needs:
 *  - A direct URL that responds with Content-Type: audio/mpeg
 *  - A continuous byte stream of raw MP3 data (no redirects, no signed URLs)
 *  - HTTPS (IMVU blocks plain HTTP)
 *  - ICY metadata headers so it recognises it as a "radio station"
 *
 * How it works:
 *  1. Fetch playlist tracks from Supabase by short code
 *  2. Open a ReadableStream
 *  3. For each track: resolve SoundCloud progressive MP3 URL → pipe raw bytes
 *  4. Move to next track seamlessly — IMVU sees one endless audio/mpeg stream
 *
 * Limitations on Vercel:
 *  - Hobby: ~10 s response limit  → stream may cut after 1 track
 *  - Pro:   ~60 s response limit  → 3-4 tracks typically
 *  - For longer sessions: deploy this route to Railway / Fly.io / a VPS
 *    and point NEXT_PUBLIC_RADIO_BASE_URL to that host.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getSoundCloudClient } from '@/lib/soundcloud/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Increase the default body size limit for streaming responses
export const maxDuration = 60; // seconds — Vercel Pro max; ignored on Hobby

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  // Strip .mp3 extension if present (for cleaner IMVU URLs)
  const code = rawCode.replace(/\.mp3$/i, '').toLowerCase();

  if (!code || code.length < 1) {
    return new NextResponse('Invalid playlist code', { status: 400 });
  }

  // ── 1. Load playlist from Supabase ────────────────────────────────────────
  const supabase = createAdminSupabaseClient();
  const { data: rawRows, error } = await supabase
    .rpc('get_playlist_by_short_code', { p_code: code });

  if (error) {
    console.error('[radio] DB error:', error);
    return new NextResponse('Failed to load playlist', { status: 500 });
  }

  const rows = (rawRows ?? []) as PlaylistRow[];

  if (rows.length === 0) {
    return new NextResponse(`Playlist not found: ${code}`, { status: 404 });
  }

  const playlistName = rows[0].playlist_name;

  console.log(`[radio] Starting stream for playlist "${playlistName}" (${rows.length} tracks)`);

  // ── 2. Log access asynchronously (don't block the stream) ─────────────────
  logRadioAccess(code, request).catch(err =>
    console.error('[radio] Failed to log access:', err)
  );

  incrementPlayCount(rows[0].playlist_id).catch(err =>
    console.error('[radio] Failed to increment play count:', err)
  );

  // ── 3. Build a continuous ReadableStream of MP3 bytes ─────────────────────
  const sc = getSoundCloudClient();

  const stream = new ReadableStream({
    async start(controller) {
      for (const row of rows) {
        try {
          console.log(`[radio] Resolving track ${row.track_id}: ${row.track_artist} - ${row.track_title}`);

          // Resolve the actual SoundCloud progressive (MP3) stream URL
          const result = await sc.resolveStreamUrlWithType(row.track_id, true);

          if (!result) {
            console.warn(`[radio] No stream URL for track ${row.track_id}, skipping`);
            continue;
          }

          if (result.type === 'hls') {
            // HLS streams cannot be piped as raw MP3 — skip them
            console.warn(`[radio] Track ${row.track_id} is HLS-only, skipping (not compatible with IMVU)`);
            continue;
          }

          console.log(`[radio] Piping track ${row.track_id} (progressive MP3)`);

          // Fetch and stream the raw MP3 bytes
          const mp3Response = await fetch(result.url, {
            headers: {
              // Pass a browser-like User-Agent so CDN doesn't reject us
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'audio/mpeg, audio/*, */*',
            },
          });

          if (!mp3Response.ok || !mp3Response.body) {
            console.warn(`[radio] MP3 fetch failed for track ${row.track_id}: ${mp3Response.status}`);
            continue;
          }

          // Pipe the MP3 bytes directly to the response stream
          const reader = mp3Response.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }

          console.log(`[radio] Track ${row.track_id} finished`);

        } catch (err: any) {
          // Don't crash the whole stream on one bad track — just skip it
          console.error(`[radio] Error piping track ${row.track_id}:`, err.message);
        }
      }

      controller.close();
      console.log(`[radio] Stream complete for "${playlistName}"`);
    },

    cancel() {
      console.log(`[radio] Client disconnected from "${playlistName}"`);
    },
  });

  // ── 4. Return as continuous audio/mpeg with ICY radio headers ─────────────
  return new NextResponse(stream, {
    status: 200,
    headers: {
      // The critical header — tells IMVU and media players this is MP3 audio
      'Content-Type': 'audio/mpeg',

      // ICY (Icecast-compatible) headers — make IMVU treat this as a radio station
      'icy-name': playlistName,
      'icy-genre': 'Mixed',
      'icy-br': '128',
      'icy-pub': '0',
      'icy-description': `${playlistName} — streamed via EgMax`,

      // No caching — always fresh
      'Cache-Control': 'no-cache, no-store',

      // CORS — IMVU may need this
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',

      // Chunked transfer — we don't know total length upfront
      'Transfer-Encoding': 'chunked',

      // Prevent buffering in proxies/CDN
      'X-Accel-Buffering': 'no',
    },
  });
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  // HEAD response — just confirm the endpoint exists and return audio headers
  // (IMVU probes with HEAD before streaming)
  const { code: rawCode } = await context.params;
  const code = rawCode.replace(/\.mp3$/i, '').toLowerCase();

  const supabase = createAdminSupabaseClient();
  const { data: rawRows } = await supabase
    .rpc('get_playlist_by_short_code', { p_code: code });

  const rows = (rawRows ?? []) as PlaylistRow[];

  if (rows.length === 0) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'icy-name': rows[0].playlist_name,
      'icy-br': '128',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Icy-MetaData',
    },
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function logRadioAccess(code: string, request: NextRequest) {
  const supabase = createAdminSupabaseClient();
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  await supabase.from('stream_access_logs').insert({
    stream_token: code,
    user_agent: userAgent.substring(0, 500),
    ip_hash: ip, // Store raw in radio logs (or hash if privacy needed)
  });
}

async function incrementPlayCount(playlistId: string) {
  const supabase = createAdminSupabaseClient();
  // Single atomic increment — no read-then-write
  await supabase.rpc('increment_play_count', { playlist_id: playlistId });
}
