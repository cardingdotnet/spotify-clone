import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Music, Plus, Headphones, Share2 } from 'lucide-react';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', user!.id)
    .single();

  const { data: playlists } = await supabase
    .from('playlists')
    .select('id, name, cover_url, play_count, stream_token')
    .eq('user_id', user!.id)
    .order('updated_at', { ascending: false })
    .limit(6);

  const greeting = getGreeting();
  const name = profile?.display_name || profile?.username || 'there';

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-8">
        {greeting}, {name} 👋
      </h1>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        <Link
          href="/search"
          className="bg-gradient-to-br from-purple-600 to-blue-600 p-6 rounded-lg hover:scale-[1.02] transition-transform"
        >
          <Music className="w-8 h-8 mb-3" />
          <h3 className="font-bold text-lg">Discover Music</h3>
          <p className="text-sm opacity-90 mt-1">
            Search SoundCloud&apos;s massive library
          </p>
        </Link>

        <Link
          href="/library"
          className="bg-gradient-to-br from-spotify-green to-emerald-700 p-6 rounded-lg hover:scale-[1.02] transition-transform text-black"
        >
          <Headphones className="w-8 h-8 mb-3" />
          <h3 className="font-bold text-lg">Your Playlists</h3>
          <p className="text-sm opacity-90 mt-1">
            {playlists?.length || 0} playlists ready to stream
          </p>
        </Link>

        <div className="bg-gradient-to-br from-orange-500 to-pink-600 p-6 rounded-lg">
          <Share2 className="w-8 h-8 mb-3" />
          <h3 className="font-bold text-lg">Stream Anywhere</h3>
          <p className="text-sm opacity-90 mt-1">
            Each playlist gets a unique URL
          </p>
        </div>
      </div>

      {/* Recent Playlists */}
      {playlists && playlists.length > 0 ? (
        <section>
          <h2 className="text-2xl font-bold mb-4">Your Playlists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {playlists.map((playlist) => (
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
                  {playlist.play_count} plays
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="text-center py-16">
          <div className="w-20 h-20 mx-auto bg-spotify-dark-gray rounded-full flex items-center justify-center mb-4">
            <Plus className="w-10 h-10 text-spotify-text-gray" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Create your first playlist</h2>
          <p className="text-spotify-text-gray mb-6">
            Search music and build playlists you can stream anywhere
          </p>
          <Link href="/search" className="btn-primary inline-block">
            Start Exploring
          </Link>
        </section>
      )}
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
