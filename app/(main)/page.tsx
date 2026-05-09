import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Music, Plus, Headphones, Share2, Sparkles, TrendingUp } from 'lucide-react';

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
    .select('id, name, cover_url, play_count, short_code')
    .eq('user_id', user!.id)
    .order('updated_at', { ascending: false })
    .limit(8);

  const greeting = getGreeting();
  const name = profile?.display_name || profile?.username || 'there';
  const totalPlays = playlists?.reduce((acc, p) => acc + (p.play_count || 0), 0) || 0;

  return (
    <div className="relative">
      {/* Hero gradient background */}
      <div className="absolute inset-0 -z-10 h-[500px] bg-gradient-to-b from-purple-900/30 via-purple-900/10 to-transparent" />
      
      <div className="relative p-4 sm:p-6 lg:p-8">
        {/* Hero Section */}
        <section className="mb-8 sm:mb-12 animate-fade-in-up">
          <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="uppercase tracking-wider font-semibold text-xs">{greeting}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold mb-3 tracking-tight">
            Welcome back, <span className="gradient-text-green">{name}</span>
          </h1>
          <p className="text-white/60 text-sm sm:text-base max-w-2xl">
            {playlists && playlists.length > 0 
              ? `You have ${playlists.length} playlist${playlists.length === 1 ? '' : 's'} with ${totalPlays} total plays`
              : 'Start building your music collection — search, save, and stream anywhere.'
            }
          </p>
        </section>

        {/* Quick Action Cards */}
        <section className="mb-10 sm:mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Link
              href="/search"
              className="group relative overflow-hidden rounded-2xl p-5 sm:p-6 hover-lift animate-fade-in-up"
              style={{ animationDelay: '100ms' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500" />
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              
              <div className="relative">
                <Music className="w-7 h-7 sm:w-9 sm:h-9 mb-3 drop-shadow-lg" />
                <h3 className="font-bold text-lg sm:text-xl mb-1">Discover Music</h3>
                <p className="text-xs sm:text-sm opacity-90">
                  Explore millions of tracks on SoundCloud
                </p>
              </div>
            </Link>

            <Link
              href="/library"
              className="group relative overflow-hidden rounded-2xl p-5 sm:p-6 hover-lift text-black animate-fade-in-up"
              style={{ animationDelay: '200ms' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-spotify-green via-emerald-500 to-teal-400" />
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              
              <div className="relative">
                <Headphones className="w-7 h-7 sm:w-9 sm:h-9 mb-3 drop-shadow-lg" />
                <h3 className="font-bold text-lg sm:text-xl mb-1">Your Library</h3>
                <p className="text-xs sm:text-sm opacity-80">
                  {playlists?.length || 0} playlists ready to stream
                </p>
              </div>
            </Link>

            <div 
              className="group relative overflow-hidden rounded-2xl p-5 sm:p-6 hover-lift animate-fade-in-up"
              style={{ animationDelay: '300ms' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-pink-500 to-rose-500" />
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              
              <div className="relative">
                <Share2 className="w-7 h-7 sm:w-9 sm:h-9 mb-3 drop-shadow-lg" />
                <h3 className="font-bold text-lg sm:text-xl mb-1">Stream Anywhere</h3>
                <p className="text-xs sm:text-sm opacity-90">
                  Each playlist gets a short, shareable URL
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Playlists */}
        {playlists && playlists.length > 0 ? (
          <section className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-spotify-green" />
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Your Playlists</h2>
              </div>
              <Link 
                href="/library" 
                className="text-xs sm:text-sm text-white/60 hover:text-white hover:underline transition-colors uppercase tracking-wide font-semibold"
              >
                Show all
              </Link>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {playlists.map((playlist, idx) => (
                <Link
                  key={playlist.id}
                  href={`/playlist/${playlist.id}`}
                  className="card group relative animate-fade-in-up"
                  style={{ animationDelay: `${500 + idx * 50}ms` }}
                >
                  <div className="aspect-square bg-gradient-to-br from-spotify-light-gray to-spotify-lighter-gray rounded-md mb-2 sm:mb-3 overflow-hidden relative shadow-lg">
                    {playlist.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={playlist.cover_url}
                        alt={playlist.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, 
                            hsl(${playlist.id.charCodeAt(0) * 7 % 360}, 60%, 40%), 
                            hsl(${(playlist.id.charCodeAt(0) * 7 + 60) % 360}, 60%, 30%))`
                        }}
                      >
                        <Music className="w-8 h-8 sm:w-12 sm:h-12 text-white/60" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold truncate text-sm sm:text-base">{playlist.name}</h3>
                  <p className="text-xs sm:text-sm text-white/60 mt-0.5 truncate">
                    {playlist.play_count} {playlist.play_count === 1 ? 'play' : 'plays'}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <section 
            className="text-center py-12 sm:py-20 max-w-md mx-auto animate-fade-in-up"
            style={{ animationDelay: '400ms' }}
          >
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-spotify-green/20 rounded-full blur-2xl animate-pulse-glow" />
              <div className="relative w-full h-full bg-gradient-to-br from-spotify-green to-emerald-600 rounded-full flex items-center justify-center shadow-2xl">
                <Plus className="w-10 h-10 text-black" strokeWidth={3} />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Start your collection</h2>
            <p className="text-white/60 mb-6 text-sm sm:text-base">
              Create playlists, add your favorite tracks, and share them with anyone via a short URL.
            </p>
            <Link href="/search" className="btn-primary inline-block">
              Start Exploring
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Late night vibes';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Night sessions';
}
