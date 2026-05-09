'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search as SearchIcon, Plus, Loader2, Music, Play, Pause, X, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDuration } from '@/lib/utils';
import { usePlayerStore, PlayerTrack } from '@/lib/player/store';
import type { Track } from '@/lib/soundcloud/types';
import { TrackListSkeleton } from '@/components/ui/Skeletons';
import AudioWaves from '@/components/ui/AudioWaves';

interface Playlist {
  id: string;
  name: string;
}

const SUGGESTIONS = [
  'lofi beats', 'arabic music', 'workout', 'chill', 
  'jazz', 'house', 'techno', 'rap', 'rock', 'classical'
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState<number | null>(null);
  
  const { 
    currentTrack, isPlaying, togglePlay, playQueue 
  } = usePlayerStore();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    fetch('/api/playlists')
      .then(r => r.json())
      .then(data => setPlaylists(data.playlists || []))
      .catch(console.error);
  }, []);

  const performSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || 'Search failed');
        return;
      }
      
      setResults(data.tracks);
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  function handlePlay(track: Track, index: number) {
    if (currentTrack?.id === track.id) {
      togglePlay();
      return;
    }
    
    const queue: PlayerTrack[] = results.map(t => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      duration: t.duration,
      artworkUrl: t.artworkUrl,
    }));
    
    playQueue(queue, index);
  }

  async function addToPlaylist(track: Track, playlistId: string) {
    setShowPlaylistMenu(null);

    try {
      const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: track.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.error('Already in this playlist');
        } else {
          toast.error(data.error || 'Failed to add');
        }
        return;
      }

      toast.success(`Added to playlist`);
    } catch (err) {
      toast.error('Network error');
    }
  }

  return (
    <div className="p-4 sm:p-8">
      {/* Search Bar */}
      <div className="relative max-w-2xl mb-6 sm:mb-8 animate-fade-in-up">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <SearchIcon className={`w-5 h-5 transition-colors ${
            query ? 'text-spotify-green' : 'text-white/40'
          }`} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for songs, artists, or genres..."
          className="input pl-12 pr-12 text-base sm:text-lg py-3 sm:py-4 rounded-full"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        )}
      </div>

      {/* Initial state — Suggestions */}
      {!loading && query.length < 2 && (
        <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2 mb-4 text-white/60">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold uppercase tracking-wider">Try searching for</span>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-12 max-w-2xl">
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.12] rounded-full text-sm border border-white/10 hover:border-white/30 transition-all hover:scale-105 animate-fade-in-up"
                style={{ animationDelay: `${150 + idx * 50}ms` }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Browse genres grid */}
          <div className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Browse all</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {[
                { name: 'Pop', from: 'from-pink-500', to: 'to-rose-700' },
                { name: 'Rock', from: 'from-red-500', to: 'to-orange-700' },
                { name: 'Hip Hop', from: 'from-amber-500', to: 'to-yellow-700' },
                { name: 'Electronic', from: 'from-cyan-500', to: 'to-blue-700' },
                { name: 'Jazz', from: 'from-purple-500', to: 'to-indigo-700' },
                { name: 'Classical', from: 'from-emerald-500', to: 'to-teal-700' },
                { name: 'Latin', from: 'from-orange-500', to: 'to-red-700' },
                { name: 'R&B', from: 'from-violet-500', to: 'to-purple-700' },
                { name: 'Indie', from: 'from-lime-500', to: 'to-green-700' },
                { name: 'Country', from: 'from-yellow-600', to: 'to-amber-800' },
              ].map((genre, idx) => (
                <button
                  key={genre.name}
                  onClick={() => setQuery(genre.name.toLowerCase())}
                  className={`
                    aspect-[4/3] sm:aspect-square rounded-xl p-4 sm:p-5 
                    bg-gradient-to-br ${genre.from} ${genre.to}
                    relative overflow-hidden text-left
                    hover-lift cursor-pointer
                    animate-fade-in-up
                  `}
                  style={{ animationDelay: `${300 + idx * 50}ms` }}
                >
                  <h3 className="font-bold text-base sm:text-lg drop-shadow-lg">{genre.name}</h3>
                  <div className="absolute -bottom-2 -right-2 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full blur-xl" />
                  <Music className="absolute bottom-2 right-2 w-8 h-8 sm:w-10 sm:h-10 opacity-60 rotate-12" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="animate-fade-in">
          <TrackListSkeleton count={8} />
        </div>
      )}

      {/* No results */}
      {!loading && query.length >= 2 && results.length === 0 && (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-16 h-16 mx-auto bg-white/[0.05] rounded-full flex items-center justify-center mb-4">
            <SearchIcon className="w-8 h-8 text-white/30" />
          </div>
          <h3 className="text-lg font-bold mb-2">No results</h3>
          <p className="text-white/60 text-sm">
            We couldn&apos;t find anything for &quot;{query}&quot;
          </p>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="animate-fade-in">
          <p className="text-sm text-white/60 mb-3">
            {results.length} {results.length === 1 ? 'result' : 'results'} for &quot;{query}&quot;
          </p>
          
          <div className="space-y-0.5">
            {results.map((track, idx) => {
              const isCurrentTrack = currentTrack?.id === track.id;
              const showPause = isCurrentTrack && isPlaying;

              return (
                <div
                  key={track.id}
                  className={`
                    flex items-center gap-3 sm:gap-4 px-2 sm:px-4 py-2 rounded-md group
                    transition-colors
                    ${isCurrentTrack ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'}
                  `}
                  style={{ 
                    animation: 'fadeInUp 0.3s ease-out backwards',
                    animationDelay: `${idx * 30}ms`,
                  }}
                >
                  {/* Artwork with overlay play button */}
                  <button
                    onClick={() => handlePlay(track, idx)}
                    className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-md overflow-hidden bg-white/[0.05] flex-shrink-0 group/art"
                  >
                    {track.artworkUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={track.artworkUrl}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-6 h-6 text-white/40" />
                      </div>
                    )}
                    
                    {/* Hover overlay (desktop) */}
                    <div className="hidden sm:flex absolute inset-0 bg-black/60 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {showPause ? (
                        <Pause className="w-6 h-6 text-white" fill="currentColor" />
                      ) : (
                        <Play className="w-6 h-6 text-white ml-0.5" fill="currentColor" />
                      )}
                    </div>
                    
                    {/* Mobile tap overlay */}
                    <div className="sm:hidden absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 active:opacity-100 transition-opacity">
                      {showPause ? (
                        <Pause className="w-6 h-6 text-white" fill="currentColor" />
                      ) : (
                        <Play className="w-6 h-6 text-white ml-0.5" fill="currentColor" />
                      )}
                    </div>
                    
                    {/* Now playing indicator */}
                    {isCurrentTrack && isPlaying && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <AudioWaves size="md" />
                      </div>
                    )}
                  </button>

                  {/* Title + Artist */}
                  <button
                    onClick={() => handlePlay(track, idx)}
                    className="min-w-0 text-left flex-1"
                  >
                    <p className={`font-semibold truncate text-sm sm:text-base transition-colors ${
                      isCurrentTrack ? 'text-spotify-green' : 'text-white'
                    }`}>
                      {track.title}
                    </p>
                    <p className="text-xs sm:text-sm text-white/60 truncate hover:underline">
                      {track.artist}
                    </p>
                  </button>

                  {/* Duration (desktop) */}
                  <span className="hidden sm:inline text-sm text-white/60 font-mono tabular-nums">
                    {formatDuration(track.duration)}
                  </span>

                  {/* Add to playlist */}
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setShowPlaylistMenu(
                        showPlaylistMenu === track.id ? null : track.id
                      )}
                      className="p-2 hover:bg-white/10 rounded-full transition-all hover:scale-110 active:scale-95"
                      title="Add to playlist"
                    >
                      <Plus className="w-5 h-5" />
                    </button>

                    {showPlaylistMenu === track.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowPlaylistMenu(null)} 
                        />
                        <div className="absolute right-0 mt-2 w-56 glass-dark rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto animate-scale-in">
                          <div className="px-4 py-2.5 text-xs uppercase tracking-wider text-white/50 font-bold border-b border-white/10">
                            Add to playlist
                          </div>
                          {playlists.length === 0 ? (
                            <div className="px-4 py-6 text-sm text-white/60 text-center">
                              No playlists yet
                            </div>
                          ) : (
                            <div className="p-1">
                              {playlists.map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => addToPlaylist(track, p.id)}
                                  className="w-full text-left px-3 py-2.5 hover:bg-white/10 transition-colors text-sm truncate rounded-md"
                                >
                                  {p.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
