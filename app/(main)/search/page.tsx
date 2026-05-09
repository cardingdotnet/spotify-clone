'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search as SearchIcon, Plus, Loader2, Music, Play, Pause } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDuration } from '@/lib/utils';
import { usePlayerStore, PlayerTrack } from '@/lib/player/store';
import type { Track } from '@/lib/soundcloud/types';

interface Playlist {
  id: string;
  name: string;
}

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
      <div className="relative mb-6 sm:mb-8 max-w-xl">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-spotify-text-gray pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you want to listen to?"
          className="input pl-12"
          autoFocus
        />
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-spotify-green" />
        </div>
      )}

      {!loading && query.length < 2 && (
        <div className="text-center py-12 sm:py-16 text-spotify-text-gray">
          <Music className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
          <p>Search SoundCloud&apos;s massive music library</p>
        </div>
      )}

      {!loading && query.length >= 2 && results.length === 0 && (
        <div className="text-center py-12 sm:py-16 text-spotify-text-gray">
          <p>No results for &quot;{query}&quot;</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-1">
          {/* Desktop header */}
          <div className="hidden sm:grid grid-cols-[auto,auto,1fr,auto,auto] gap-4 px-4 py-2 text-sm text-spotify-text-gray border-b border-spotify-light-gray">
            <span className="w-8">#</span>
            <span></span>
            <span>Title</span>
            <span>Duration</span>
            <span>Add</span>
          </div>

          {results.map((track, idx) => {
            const isCurrentTrack = currentTrack?.id === track.id;
            const showPause = isCurrentTrack && isPlaying;

            return (
              <div
                key={track.id}
                className={`flex sm:grid sm:grid-cols-[auto,auto,1fr,auto,auto] gap-3 sm:gap-4 px-2 sm:px-4 py-2 hover:bg-spotify-light-gray rounded-md group items-center ${
                  isCurrentTrack ? 'bg-spotify-light-gray/50' : ''
                }`}
              >
                {/* Index/Play (desktop only) */}
                <div className="hidden sm:flex w-8 items-center justify-center">
                  <span className={`text-spotify-text-gray group-hover:hidden ${
                    isCurrentTrack ? 'hidden' : ''
                  }`}>
                    {idx + 1}
                  </span>
                  <button
                    onClick={() => handlePlay(track, idx)}
                    className={`hidden group-hover:block ${
                      isCurrentTrack ? '!block' : ''
                    } text-white hover:scale-110 transition-transform`}
                  >
                    {showPause ? (
                      <Pause className="w-4 h-4" fill="currentColor" />
                    ) : (
                      <Play className="w-4 h-4" fill="currentColor" />
                    )}
                  </button>
                </div>

                {/* Artwork (tap to play on mobile) */}
                <button
                  onClick={() => handlePlay(track, idx)}
                  className="w-12 h-12 rounded overflow-hidden bg-spotify-light-gray flex-shrink-0 relative"
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
                      <Music className="w-6 h-6 text-spotify-text-gray" />
                    </div>
                  )}
                  <div className="sm:hidden absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 active:opacity-100">
                    {showPause ? (
                      <Pause className="w-6 h-6 text-white" fill="currentColor" />
                    ) : (
                      <Play className="w-6 h-6 text-white ml-0.5" fill="currentColor" />
                    )}
                  </div>
                </button>

                <button
                  onClick={() => handlePlay(track, idx)}
                  className="min-w-0 text-left flex-1"
                >
                  <p className={`font-semibold truncate text-sm sm:text-base ${
                    isCurrentTrack ? 'text-spotify-green' : ''
                  }`}>
                    {track.title}
                  </p>
                  <p className="text-xs sm:text-sm text-spotify-text-gray truncate">
                    {track.artist}
                  </p>
                </button>

                <span className="hidden sm:inline text-sm text-spotify-text-gray">
                  {formatDuration(track.duration)}
                </span>

                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setShowPlaylistMenu(
                      showPlaylistMenu === track.id ? null : track.id
                    )}
                    className="p-2 hover:bg-spotify-lighter-gray rounded-full transition-colors"
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
                      <div className="absolute right-0 mt-2 w-56 bg-spotify-light-gray rounded-md shadow-xl z-50 max-h-64 overflow-y-auto">
                        <div className="px-4 py-2 text-xs uppercase text-spotify-text-gray border-b border-spotify-lighter-gray">
                          Add to playlist
                        </div>
                        {playlists.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-spotify-text-gray">
                            No playlists yet
                          </div>
                        ) : (
                          playlists.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => addToPlaylist(track, p.id)}
                              className="w-full text-left px-4 py-2 hover:bg-spotify-lighter-gray transition-colors text-sm truncate"
                            >
                              {p.name}
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
