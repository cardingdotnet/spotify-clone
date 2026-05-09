import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { getSoundCloudClient } from '@/lib/soundcloud/client';

export const runtime = 'nodejs';

/**
 * POST /api/playlists/[id]/tracks
 * Body: { trackId: number } - SoundCloud track ID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: playlistId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const trackId = Number(body.trackId);
  if (!trackId || isNaN(trackId)) {
    return NextResponse.json(
      { error: 'Valid trackId required' },
      { status: 400 }
    );
  }

  // Verify playlist ownership
  const { data: playlist, error: pError } = await supabase
    .from('playlists')
    .select('id, user_id')
    .eq('id', playlistId)
    .eq('user_id', user.id)
    .single();

  if (pError || !playlist) {
    return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
  }

  // Cache track metadata if not already cached
  const admin = createAdminSupabaseClient();
  const { data: existingTrack } = await admin
    .from('tracks')
    .select('id')
    .eq('id', trackId)
    .single();

  if (!existingTrack) {
    // Fetch from SoundCloud and cache
    const sc = getSoundCloudClient();
    const track = await sc.getTrack(trackId);

    if (!track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    if (!track.streamable) {
      return NextResponse.json(
        { error: 'Track is not streamable' },
        { status: 400 }
      );
    }

    const { error: insertError } = await admin.from('tracks').insert({
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration_ms: track.duration,
      artwork_url: track.artworkUrl,
      permalink_url: track.permalinkUrl,
      soundcloud_user_id: track.artistId,
      streamable: track.streamable,
      genre: track.genre,
    });

    if (insertError && !insertError.message.includes('duplicate')) {
      console.error('Track cache error:', insertError);
      return NextResponse.json(
        { error: 'Failed to cache track' },
        { status: 500 }
      );
    }
  }

  // Get next position
  const { data: maxPos } = await supabase
    .from('playlist_tracks')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosition = (maxPos?.position ?? -1) + 1;

  // Add to playlist
  const { error: addError } = await supabase
    .from('playlist_tracks')
    .insert({
      playlist_id: playlistId,
      track_id: trackId,
      position: nextPosition,
    });

  if (addError) {
    if (addError.message.includes('duplicate')) {
      return NextResponse.json(
        { error: 'Track already in playlist' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: addError.message }, { status: 500 });
  }

  return NextResponse.json({ 
    success: true, 
    position: nextPosition 
  }, { status: 201 });
}

/**
 * DELETE /api/playlists/[id]/tracks?trackId=123
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: playlistId } = await params;
  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get('trackId');

  if (!trackId) {
    return NextResponse.json({ error: 'trackId required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership via RLS
  const { error } = await supabase
    .from('playlist_tracks')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('track_id', trackId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
