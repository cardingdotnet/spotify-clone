'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Music, Trash2, Copy, Check, Share2, Loader2,
  ExternalLink, Play, Pause, Edit2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDuration, getStreamUrl, getStreamUrlWithExtension } from '@/lib/utils';
import { usePlayerStore, PlayerTrack } from '@/lib/player/store';

interface PlaylistTrack {
  id: number;
  title: string;
  artist: string;
  duration_ms: number;
  artwork_url: string | null;
  position: number;
}

interface Playlist {
  id: string;
  name: string;
  short_code: string;
  description: string | null;
  cover_url: string | null;
  is_public: boolean;
  stream_token: string;
  play_count: number;
  user_id: string;
}

export default function PlaylistPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedClean, setCopiedClean] = useState(false);
  const [copiedM3u, setCopiedM3u] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  
  const { 
    currentTrack, isPlaying, playQueue, togglePlay 
  } = usePlayerStore();

  useEffect(() => {
    loadPlaylist();
  }, [id]);

  async function loadPlaylist() {
    setLoading(true);
    try {
      const res = await fetch(`/api/playlists/${id}`);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to load');
        router.push('/library');
        return;
      }

      setPlaylist(data.playlist);
      setTracks(data.tracks);
      setEditName(data.playlist.name);
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }

  function buildQueue(): PlayerTrack[] {
    return tracks.map(t => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      duration: t.duration_ms,
      artworkUrl: t.artwork_url,
    }));
  }

  function playAll() {
    if (tracks.length === 0) return;
    playQueue(buildQueue(), 0);
  }

  function playTrackAt(index: number) {
    const track = tracks[index];
    if (!track) return;

    if (currentTrack?.id === track.id) {
      togglePlay();
      return;
    }

    playQueue(buildQueue(), index);
  }

  const isPlaylistPlaying = isPlaying && tracks.some(t => t.id === currentTrack?.id);

  async function removeTrack(trackId: number) {
    if (!confirm('Remove this track from the playlist?')) return;

    try {
      const res = await fetch(
        `/api/playlists/${id}/tracks?trackId=${trackId}`,
        { method: 'DELETE' }
      );

      if (!res.ok) {
        toast.error('Failed to remove track');
        return;
      }

      toast.success('Track removed');
      setTracks(tracks.filter(t => t.id !== trackId));
    } catch (err) {
      toast.error('Network error');
    }
  }

  async function deletePlaylist() {
    if (!confirm('Delete this playlist? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/playlists/${id}`, { method: 'DELETE' });

      if (!res.ok) {
        toast.error('Failed to delete');
        return;
      }

      toast.success('Playlist deleted');
      router.push('/library');
    } catch (err) {
      toast.error('Network error');
    }
  }

  async function saveRename() {
    if (!playlist || !editName.trim() || editName === playlist.name) {
      setEditing(false);
      return;
    }

    try {
      const res = await fetch(`/api/playlists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to rename');
        return;
      }

      setPlaylist(data.playlist);
      toast.success('Playlist renamed!');
      setEditing(false);
    } catch (err) {
      toast.error('Network error');
    }
  }

  async function copyToClipboard(text: string, setter: (b: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      toast.success('Copied!');
      setTimeout(() => setter(false), 2000);
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setter(true);
      toast.success('Copied!');
      setTimeout(() => setter(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-12 h-12 animate-spin text-spotify-green" />
      </div>
    );
  }

  if (!playlist) return null;

  const totalDuration = tracks.reduce((acc, t) => acc + t.duration_ms, 0);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const cleanUrl = getStreamUrl(playlist.short_code, origin);
  const m3uUrl = getStreamUrlWithExtension(playlist.short_code, origin);

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-b from-spotify-light-gray/50 to-transparent p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
          <div className="w-32 h-32 sm:w-52 sm:h-52 mx-auto sm:mx-0 bg-gradient-to-br from-purple-700 to-blue-700 rounded-md flex items-center justify-center shadow-2xl flex-shrink-0">
            {playlist.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={playlist.cover_url}
                alt={playlist.name}
                className="w-full h-full object-cover rounded-md"
              />
            ) : (
              <Music className="w-16 h-16 sm:w-24 sm:h-24 text-white/80" />
            )}
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <p className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2">PLAYLIST</p>
            
            {editing ? (
              <div className="flex flex-col sm:flex-row items-center gap-2 mb-3 sm:mb-4">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveRename();
                    if (e.key === 'Escape') {
                      setEditing(false);
                      setEditName(playlist.name);
                    }
                  }}
                  autoFocus
                  className="text-2xl sm:text-4xl md:text-5xl font-extrabold bg-transparent border-b-2 border-white outline-none flex-1 w-full text-center sm:text-left"
                  maxLength={100}
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveRename}
                    className="btn-primary text-sm py-2 px-4"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditName(playlist.name);
                    }}
                    className="btn-secondary text-sm py-2 px-4"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setEditing(true)}
                className="group cursor-pointer mb-3 sm:mb-4 inline-flex items-center gap-2 sm:gap-3 max-w-full"
                title="Click to rename"
              >
                <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold truncate">
                  {playlist.name}
                </h1>
                <Edit2 className="w-4 h-4 sm:w-6 sm:h-6 opacity-50 sm:opacity-0 sm:group-hover:opacity-50 transition-opacity flex-shrink-0" />
              </button>
            )}
            
            {playlist.description && (
              <p className="text-spotify-text-gray mb-2 text-sm sm:text-base">
                {playlist.description}
              </p>
            )}
            <p className="text-xs sm:text-sm text-spotify-text-gray">
              <code className="bg-spotify-light-gray px-2 py-0.5 rounded text-xs">
                /stream/{playlist.short_code}
              </code>
              <span className="block sm:inline mt-1 sm:mt-0">
                <span className="hidden sm:inline"> • </span>
                {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
                {tracks.length > 0 && ` • ${formatDuration(totalDuration)}`}
                {' • '}{playlist.play_count} plays
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 sm:px-8 pb-4 flex items-center gap-4">
        <button
          onClick={isPlaylistPlaying ? togglePlay : playAll}
          disabled={tracks.length === 0}
          className="w-12 h-12 sm:w-14 sm:h-14 bg-spotify-green hover:bg-spotify-green-hover rounded-full flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          title={isPlaylistPlaying ? 'Pause' : 'Play'}
        >
          {isPlaylistPlaying ? (
            <Pause className="w-6 h-6 sm:w-7 sm:h-7 text-black" fill="currentColor" />
          ) : (
            <Play className="w-6 h-6 sm:w-7 sm:h-7 text-black ml-0.5 sm:ml-1" fill="currentColor" />
          )}
        </button>
      </div>

      {/* Stream URL Share Card */}
      <div className="px-4 sm:px-8 pb-6">
        <div className="bg-spotify-dark-gray rounded-xl p-4 sm:p-6 border border-spotify-lighter-gray">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-spotify-green" />
            <h2 className="text-base sm:text-lg font-bold">Your Stream URLs</h2>
          </div>
          <p className="text-xs sm:text-sm text-spotify-text-gray mb-4">
            Short, easy-to-share URLs. Both work in VLC, browsers, IMVU, car stereos.
          </p>

          {/* Clean URL */}
          <div className="mb-3">
            <label className="text-xs text-spotify-text-gray uppercase font-semibold">
              Short URL (recommended)
            </label>
            <div className="flex flex-col sm:flex-row gap-2 mt-1">
              <input
                type="text"
                readOnly
                value={cleanUrl}
                className="input flex-1 font-mono text-xs sm:text-sm"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => copyToClipboard(cleanUrl, setCopiedClean)}
                className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap text-sm py-2"
                disabled={tracks.length === 0}
              >
                {copiedClean ? (
                  <><Check className="w-4 h-4" /> Copied</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copy</>
                )}
              </button>
            </div>
          </div>

          {/* M3U URL */}
          <div className="mb-4">
            <label className="text-xs text-spotify-text-gray uppercase font-semibold">
              .m3u URL
            </label>
            <div className="flex flex-col sm:flex-row gap-2 mt-1">
              <input
                type="text"
                readOnly
                value={m3uUrl}
                className="input flex-1 font-mono text-xs sm:text-sm"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => copyToClipboard(m3uUrl, setCopiedM3u)}
                className="btn-secondary flex items-center justify-center gap-2 whitespace-nowrap text-sm py-2"
                disabled={tracks.length === 0}
              >
                {copiedM3u ? (
                  <><Check className="w-4 h-4" /> Copied</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copy</>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <a
              href={cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 bg-spotify-light-gray rounded-full hover:bg-spotify-lighter-gray transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Test in browser
            </a>
            <span className="px-3 py-1 bg-spotify-light-gray rounded-full">✓ VLC</span>
            <span className="px-3 py-1 bg-spotify-light-gray rounded-full">✓ IMVU</span>
            <span className="px-3 py-1 bg-spotify-light-gray rounded-full">✓ Mobile</span>
          </div>

          {tracks.length === 0 && (
            <p className="mt-4 text-sm text-yellow-500">
              ⚠️ Add tracks before sharing
            </p>
          )}
        </div>
      </div>

      {/* Track List */}
      <div className="px-4 sm:px-8 pb-8">
        {tracks.length === 0 ? (
          <div className="text-center py-12">
            <Music className="w-16 h-16 mx-auto text-spotify-text-gray opacity-50 mb-4" />
            <p className="text-spotify-text-gray mb-4">
              No tracks yet. Search for music to add.
            </p>
            <button
              onClick={() => router.push('/search')}
              className="btn-secondary"
            >
              Find Music
            </button>
          </div>
        ) : (
          <>
            {/* Desktop track header */}
            <div className="hidden sm:grid grid-cols-[auto,auto,1fr,auto,auto] gap-4 px-4 py-2 text-sm text-spotify-text-gray border-b border-spotify-light-gray mb-2">
              <span className="w-8">#</span>
              <span></span>
              <span>Title</span>
              <span>Duration</span>
              <span></span>
            </div>

            {tracks.map((track, idx) => {
              const isCurrentTrack = currentTrack?.id === track.id;
              const showPause = isCurrentTrack && isPlaying;

              return (
                <div
                  key={track.id}
                  className={`flex sm:grid sm:grid-cols-[auto,auto,1fr,auto,auto] gap-3 sm:gap-4 px-2 sm:px-4 py-2 hover:bg-spotify-light-gray rounded-md group items-center ${
                    isCurrentTrack ? 'bg-spotify-light-gray/50' : ''
                  }`}
                >
                  {/* Index/Play (hidden on mobile, shown on hover desktop) */}
                  <div className="hidden sm:flex w-8 items-center justify-center">
                    <span className={`text-spotify-text-gray group-hover:hidden ${
                      isCurrentTrack ? 'hidden' : ''
                    }`}>
                      {idx + 1}
                    </span>
                    <button
                      onClick={() => playTrackAt(idx)}
                      className={`hidden group-hover:block ${
                        isCurrentTrack ? '!block' : ''
                      } text-white hover:scale-110 transition-transform`}
                      title={showPause ? 'Pause' : 'Play'}
                    >
                      {showPause ? (
                        <Pause className="w-4 h-4" fill="currentColor" />
                      ) : (
                        <Play className="w-4 h-4" fill="currentColor" />
                      )}
                    </button>
                  </div>

                  {/* Artwork (clickable on mobile) */}
                  <button
                    onClick={() => playTrackAt(idx)}
                    className="w-12 h-12 sm:w-10 sm:h-10 rounded overflow-hidden bg-spotify-light-gray flex-shrink-0 relative"
                  >
                    {track.artwork_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={track.artwork_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-5 h-5 text-spotify-text-gray" />
                      </div>
                    )}
                    {/* Mobile play overlay */}
                    <div className="sm:hidden absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 active:opacity-100">
                      {showPause ? (
                        <Pause className="w-6 h-6 text-white" fill="currentColor" />
                      ) : (
                        <Play className="w-6 h-6 text-white ml-0.5" fill="currentColor" />
                      )}
                    </div>
                  </button>

                  {/* Title + Artist */}
                  <button
                    onClick={() => playTrackAt(idx)}
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

                  {/* Duration */}
                  <span className="hidden sm:inline text-sm text-spotify-text-gray flex-shrink-0">
                    {formatDuration(track.duration_ms)}
                  </span>

                  {/* Remove */}
                  <button
                    onClick={() => removeTrack(track.id)}
                    className="p-2 hover:bg-spotify-lighter-gray rounded-full transition-colors flex-shrink-0"
                    title="Remove track"
                  >
                    <Trash2 className="w-4 h-4 text-spotify-text-light hover:text-red-500" />
                  </button>
                </div>
              );
            })}
          </>
        )}

        <div className="mt-12 pt-6 border-t border-spotify-light-gray">
          <button
            onClick={deletePlaylist}
            className="text-red-500 hover:text-red-400 text-sm flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete this playlist
          </button>
        </div>
      </div>
    </div>
  );
}
