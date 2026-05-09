import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .select(`
      id,
      user_id,
      name,
      short_code,
      slug,
      description,
      cover_url,
      is_public,
      stream_token,
      play_count,
      created_at,
      updated_at
    `)
    .eq('id', id)
    .single();

  if (playlistError || !playlist) {
    return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
  }

  const { data: tracks, error: tracksError } = await supabase
    .from('playlist_tracks')
    .select(`
      position,
      added_at,
      track:tracks (
        id,
        title,
        artist,
        duration_ms,
        artwork_url,
        permalink_url,
        genre
      )
    `)
    .eq('playlist_id', id)
    .order('position', { ascending: true });

  if (tracksError) {
    return NextResponse.json({ error: tracksError.message }, { status: 500 });
  }

  return NextResponse.json({
    playlist,
    tracks: tracks?.map((t: any) => ({
      ...t.track,
      position: t.position,
      added_at: t.added_at,
    })) || [],
  });
}

/**
 * PATCH /api/playlists/[id]
 * Rename playlist. Short code STAYS THE SAME (URL doesn't change).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const updates: any = {};
  
  if (typeof body.name === 'string' && body.name.trim()) {
    updates.name = body.name.trim().substring(0, 100);
  }
  if (typeof body.description === 'string') {
    updates.description = body.description.trim() || null;
  }
  if (typeof body.is_public === 'boolean') {
    updates.is_public = body.is_public;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid updates' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('playlists')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ playlist: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
