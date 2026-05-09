import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Music, Plus } from 'lucide-react';

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: playlists } = await supabase
    .from('playlists')
    .select(`
      id, 
      name, 
      cover_url, 
      play_count, 
      stream_token,
      created_at,
      tracks:playlist_tracks(count)
    `)
    .eq('user_id', user!.id)
    .order('updated_at', { ascending: false });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Your Library</h1>
        <span className="text-spotify-text-gray">
          {playlists?.length || 0} playlists
        </span>
      </div>

      {!playlists || playlists.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto bg-spotify-dark-gray rounded-full flex items-center justify-center mb-4">
            <Plus className="w-10 h-10 text-spotify-text-gray" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Create your first playlist</h2>
          <p className="text-spotify-text-gray mb-6">
            Use the + button in the sidebar to create one
          </p>
          <Link href="/search" className="btn-primary inline-block">
            Browse Music
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {playlists.map((playlist) => {
            const trackCount = (playlist.tracks as any)?.[0]?.count || 0;
            
            return (
              <Link
                key={playlist.id}
                href={`/playlist/${playlist.id}`}
                className="card group"
              >
                <div className="aspect-square bg-gradient-to-br from-spotify-light-gray to-spotify-lighter-gray rounded-md mb-3 flex items-center justify-center overflow-hidden">
                  {playlist.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={playlist.cover_url}
                      alt={playlist.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music className="w-12 h-12 text-spotify-text-gray" />
                  )}
                </div>
                <h3 className="font-semibold truncate">{playlist.name}</h3>
                <p className="text-sm text-spotify-text-gray mt-1">
                  {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}