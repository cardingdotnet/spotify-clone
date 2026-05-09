import { NextRequest, NextResponse } from 'next/server';
import { getSoundCloudClient } from '@/lib/soundcloud/client';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Require auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const offset = parseInt(searchParams.get('offset') || '0');

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: 'Query too short' }, { status: 400 });
  }

  try {
    const sc = getSoundCloudClient();
    const tracks = await sc.searchTracks(query, { limit, offset });

    return NextResponse.json({
      tracks,
      query,
      count: tracks.length,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
