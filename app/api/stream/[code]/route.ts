/**
 * Stream Endpoint — Short Code-based
 * 
 * URL: /stream/{code}
 * Examples: /stream/ax8k2m, /stream/9q3pdz
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { hashString } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
  const code = rawCode.replace(/\.m3u$/i, '').toLowerCase();

  if (!code || code.length < 1) {
    return new NextResponse('Invalid playlist URL', { status: 400 });
  }

  try {
    const supabase = createAdminSupabaseClient();

    const { data: rawRows, error } = await supabase
      .rpc('get_playlist_by_short_code', { p_code: code });

    if (error) {
      console.error('Database error:', error);
      return new NextResponse('Failed to load playlist', { status: 500 });
    }

    const rows = (rawRows ?? []) as PlaylistRow[];

    if (rows.length === 0) {
      return new NextResponse(
        `Playlist not found: ${code}`, 
        { status: 404 }
      );
    }

    const playlistName = rows[0].playlist_name;
    const playlistId = rows[0].playlist_id;

    const baseUrl = getBaseUrl(request);
    const m3uLines: string[] = ['#EXTM3U'];

    for (const row of rows) {
      const durationSeconds = Math.floor(row.track_duration_ms / 1000);
      const trackInfo = `${row.track_artist} - ${row.track_title}`;
      const proxyUrl = `${baseUrl}/api/stream-resolve/${row.track_id}`;

      m3uLines.push(`#EXTINF:${durationSeconds},${trackInfo}`);
      m3uLines.push(proxyUrl);
    }

    const m3uContent = m3uLines.join('\n') + '\n';

    logStreamAccess(code, request).catch(err => 
      console.error('Failed to log stream access:', err)
    );

    incrementPlayCount(playlistId).catch(err =>
      console.error('Failed to increment play count:', err)
    );

    return new NextResponse(m3uContent, {
      status: 200,
      headers: {
        'Content-Type': 'audio/x-mpegurl; charset=utf-8',
        'Content-Disposition': `inline; filename="${sanitizeFilename(playlistName)}.m3u"`,
        'Cache-Control': 'no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      },
    });
  } catch (error) {
    console.error('Stream endpoint error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const response = await GET(request, context);
  return new NextResponse(null, {
    status: response.status,
    headers: response.headers,
  });
}

function getBaseUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') || host.startsWith('127.')
    ? 'http' 
    : 'https';
  return `${protocol}://${host}`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\u0600-\u06FF\-]/g, '_').substring(0, 60);
}

async function logStreamAccess(code: string, request: NextRequest) {
  const supabase = createAdminSupabaseClient();

  const userAgent = request.headers.get('user-agent') || 'unknown';
  const ip = 
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const ipHash = await hashString(ip);

  await supabase.from('stream_access_logs').insert({
    stream_token: code,
    user_agent: userAgent.substring(0, 500),
    ip_hash: ipHash,
  });
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
