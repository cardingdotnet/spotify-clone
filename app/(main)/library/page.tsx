import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Music, Plus, Library as LibraryIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const supabase = await createClient();

  // PERF: skip the network round-trip; middleware already validated the session.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  // PERF: read track_count directly from the playlists row (a denormalized
  // column maintained by a trigger, see database/migration_perf.sql).
  // The previous version did a count aggregation per row which forced
  // PostgREST to issue a sub-select per playlist.
  const { data: playlists } = await supabase
    .from('playlists')
    .select('id, name, cover_url, play_count, short_code, created_at, track_count')
    .eq('user_id', session.user.id)
    .order('updated_at', { ascending: false });

  return (
    <div className="p-4 sm:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 sm:mb-8 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-spotify-green to-emerald-700 flex items-center justify-center shadow-lg">
            <LibraryIcon className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">Your Library</h1>
            <p className="text-xs sm:text-sm text-white/60">
              {playlists?.length || 0} playlist{playlists?.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </div>

      {!playlists || playlists.length === 0 ? (
        <div className="text-center py-12 sm:py-20 max-w-md mx-auto animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-spotify-green/20 rounded-full blur-2xl animate-pulse-glow" />
            <div className="relative w-full h-full bg-gradient-to-br from-spotify-green to-emerald-600 rounded-full flex items-center justify-center shadow-2xl">
              <Plus className="w-10 h-10 text-black" strokeWidth={3} />
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Create your first playlist</h2>
          <p className="text-white/60 mb-6 text-sm sm:text-base">
            Use the + button in the sidebar to start building your collection
          </p>
          <Link href="/search" className="btn-primary inline-block">
            Browse Music
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {playlists.map((playlist, idx) => {
            const trackCount = (playlist as any).track_count || 0;
            const hue = playlist.id.charCodeAt(0) * 7 % 360;
            
            return (
              <Link
                key={playlist.id}
                href={`/playlist/${playlist.id}`}
                prefetch
                className="card group relative animate-fade-in-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="aspect-square rounded-md mb-2 sm:mb-3 overflow-hidden relative shadow-lg">
                  {playlist.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={playlist.cover_url}
                      alt={playlist.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, 
                          hsl(${hue}, 60%, 40%), 
                          hsl(${(hue + 60) % 360}, 60%, 30%))`
                      }}
                    >
                      <Music className="w-10 h-10 sm:w-12 sm:h-12 text-white/50 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                  )}
                </div>
                <h3 className="font-semibold truncate text-sm sm:text-base">{playlist.name}</h3>
                <p className="text-xs text-white/50 mt-0.5 truncate">
                  {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
                  {playlist.play_count > 0 && ` • ${playlist.play_count} plays`}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
