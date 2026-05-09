import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { generateUniqueSlug } from '@/lib/utils/slug';

export const runtime = 'nodejs';

/**
 * GET /api/playlists/[id] - Get playlist with tracks
 */
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
    tracks: tracks?.map(t => ({
      ...t.track,
      position: t.position,
      added_at: t.added_at,
    })) || [],
  });
}

/**
 * PATCH /api/playlists/[id] - Update playlist (regenerates slug on rename)
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
  
  // If name is being changed, regenerate slug too
  if (typeof body.name === 'string' && body.name.trim()) {
    const newName = body.name.trim().substring(0, 100);
    updates.name = newName;
    
    // Get current slug to check if name actually changed
    const { data: current } = await supabase
      .from('playlists')
      .select('name, slug')
      .eq('id', id)
      .single();
    
    if (current && current.name !== newName) {
      // Name changed — regenerate slug, excluding this playlist from uniqueness check
      const admin = createAdminSupabaseClient();
      const newSlug = await generateUniqueSlug(newName, async (candidateSlug) => {
        const { data } = await admin
          .from('playlists')
          .select('id')
          .eq('slug', candidateSlug)
          .neq('id', id)  // exclude current playlist
          .maybeSingle();
        return !!data;
      });
      updates.slug = newSlug;
    }
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

/**
 * DELETE /api/playlists/[id]
 */
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
