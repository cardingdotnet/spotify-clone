import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { generateUniqueShortCode } from '@/lib/utils/slug';

export const runtime = 'nodejs';

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
      short_code,
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

  // Generate unique short code
  const admin = createAdminSupabaseClient();
  const shortCode = await generateUniqueShortCode(async (candidate) => {
    const { data } = await admin
      .from('playlists')
      .select('id')
      .eq('short_code', candidate)
      .maybeSingle();
    return !!data;
  });

  // Also generate a basic slug for display
  const slug = name.trim().toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60) || 'playlist';

  const { data, error } = await supabase
    .from('playlists')
    .insert({
      user_id: user.id,
      name: name.trim(),
      short_code: shortCode,
      slug: `${slug}-${shortCode}`,  // for backward compat with slug column
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
