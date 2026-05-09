import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { slugify, generateUniqueSlug } from '@/lib/utils/slug';

export const runtime = 'nodejs';

/**
 * GET /api/playlists - List user's playlists
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('playlists')
    .select(`
      id,
      name,
      slug,
      description,
      cover_url,
      is_public,
      stream_token,
      play_count,
      created_at,
      updated_at,
      tracks:playlist_tracks(count)
    `)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ playlists: data });
}

/**
 * POST /api/playlists - Create new playlist (auto-generates unique slug)
 */
export async function POST(request: NextRequest) {
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

  const { name, description, is_public } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json(
      { error: 'Playlist name is required' },
      { status: 400 }
    );
  }

  if (name.length > 100) {
    return NextResponse.json(
      { error: 'Playlist name too long (max 100 chars)' },
      { status: 400 }
    );
  }

  // Generate unique slug — admin client checks across ALL playlists (global uniqueness)
  const admin = createAdminSupabaseClient();
  const slug = await generateUniqueSlug(name, async (candidateSlug) => {
    const { data } = await admin
      .from('playlists')
      .select('id')
      .eq('slug', candidateSlug)
      .maybeSingle();
    return !!data;
  });

  const { data, error } = await supabase
    .from('playlists')
    .insert({
      user_id: user.id,
      name: name.trim(),
      slug,
      description: description?.trim() || null,
      is_public: Boolean(is_public),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ playlist: data }, { status: 201 });
}
