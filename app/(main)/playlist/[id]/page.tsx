'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Music, 
  Trash2, 
  Copy, 
  Check, 
  Share2, 
  Loader2,
  ExternalLink,
  Play,
  Pause,
  Edit2
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
  slug: string;
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
    currentTrack, 
    isPlaying, 
    playQueue, 
    togglePlay 
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
      
      if (data.playlist.slug !== playlist.slug) {
        toast.success(`Stream URL updated to: ${data.playlist.slug}`, { 
          duration: 4000 
        });
      }
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
  const cleanUrl = getStreamUrl(playlist.slug, origin);
  const m3uUrl = getStreamUrlWithExtension(playlist.slug, origin);

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-b from-spotify-light-gray/50 to-transparent p-8">
        <div className="flex items-end gap-6">
          <div className="w-52 h-52 bg-gradient-to-br from-purple-700 to-blue-700 rounded-md flex items-center justify-center shadow-2xl flex-shrink-0">
            {playlist.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={playlist.cover_url}
                alt={playlist.name}
                className="w-full h-full object-cover rounded-md"
              />
            ) : (
              <Music className="w-24 h-24 text-white/80" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold mb-2">PLAYLIST</p>
            
            {editing ? (
              <div className="flex items-center gap-2 mb-4">
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
                  className="text-3xl md:text-5xl font-extrabold bg-transparent border-b-2 border-white outline-none flex-1"
                  maxLength={100}
                />
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
            ) : (
              <div 
                onClick={() => setEditing(true)}
                className="group cursor-pointer mb-4 inline-flex items-center gap-3"
                title="Click to rename"
              >
                <h1 className="text-5xl md:text-7xl font-extrabold truncate">
                  {playlist.name}
                </h1>
                <Edit2 className="w-6 h-6 opacity-0 group-hover:opacity-50 transition-opacity" />
              </div>
            )}
            
            {playlist.description && (
              <p className="text-spotify-text-gray mb-2">
                {playlist.description}
              </p>
            )}
            <p className="text-sm text-spotify-text-gray">
              <code className="bg-spotify-light-gray px-2 py-0.5 rounded text-xs">
                /stream/{playlist.slug}
              </code>
              {' • '}
              {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
              {tracks.length > 0 && ` • ${formatDuration(totalDuration)}`}
              {' • '}
              {playlist.play_count} plays
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-8 pb-4 flex items-center gap-4">
        <button
          onClick={isPlaylistPlaying ? togglePlay : playAll}
          disabled={tracks.length === 0}
          className="w-14 h-14 bg-spotify-green hover:bg-spotify-green-hover rounded-full flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          title={isPlaylistPlaying ? 'Pause' : 'Play'}
        >
          {isPlaylistPlaying ? (
            <Pause className="w-7 h-7 text-black" fill="currentColor" />
          ) : (
            <Play className="w-7 h-7 text-black ml-1" fill="currentColor" />
          )}
        </button>
      </div>

      {/* Stream URL Share Card */}
      <div className="px-8 pb-6">
        <div className="bg-spotify-dark-gray rounded-xl p-6 border border-spotify-lighter-gray">
          <div className="flex items-center gap-3 mb-3">
            <Share2 className="w-5 h-5 text-spotify-green" />
            <h2 className="text-lg font-bold">Your Stream URLs</h2>
          </div>
          <p className="text-sm text-spotify-text-gray mb-4">
            Share these URLs anywhere — VLC, browsers, IMVU, car stereos.
            Both formats work; choose based on what you need.
          </p>

          {/* Clean URL */}
          <div className="mb-3">
            <label className="text-xs text-spotify-text-gray uppercase font-semibold">
              Clean URL (recommended for sharing)
            </label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                readOnly
                value={cleanUrl}
                className="input flex-1 font-mono text-sm"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => copyToClipboard(cleanUrl, setCopiedClean)}
                className="btn-primary flex items-center gap-2 whitespace-nowrap"
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
              .m3u URL (use for older players if clean URL doesn&apos;t work)
            </label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                readOnly
                value={m3uUrl}
                className="input flex-1 font-mono text-sm"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => copyToClipboard(m3uUrl, setCopiedM3u)}
                className="btn-secondary flex items-center gap-2 whitespace-nowrap"
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
            <span className="px-3 py-1 bg-spotify-light-gray rounded-full">✓ Browsers</span>
            <span className="px-3 py-1 bg-spotify-light-gray rounded-full">✓ Car stereos</span>
          </div>

          {tracks.length === 0 && (
            <p className="mt-4 text-sm text-yellow-500">
              ⚠️ Add tracks before sharing
            </p>
          )}
        </div>
      </div>

      {/* Track List */}
      <div className="px-8 pb-8">
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
            <div className="grid grid-cols-[auto,auto,1fr,auto,auto] gap-4 px-4 py-2 text-sm text-spotify-text-gray border-b border-spotify-light-gray mb-2">
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
                  className={`grid grid-cols-[auto,auto,1fr,auto,auto] gap-4 px-4 py-2 hover:bg-spotify-light-gray rounded-md group items-center ${
                    isCurrentTrack ? 'bg-spotify-light-gray/50' : ''
                  }`}
                >
                  <div className="w-8 flex items-center justify-center">
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

                  <div className="w-10 h-10 rounded overflow-hidden bg-spotify-light-gray flex-shrink-0">
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
                  </div>

                  <div className="min-w-0">
                    <p className={`font-semibold truncate ${
                      isCurrentTrack ? 'text-spotify-green' : ''
                    }`}>
                      {track.title}
                    </p>
                    <p className="text-sm text-spotify-text-gray truncate">
                      {track.artist}
                    </p>
                  </div>

                  <span className="text-sm text-spotify-text-gray">
                    {formatDuration(track.duration_ms)}
                  </span>

                  <button
                    onClick={() => removeTrack(track.id)}
                    className="p-2 hover:bg-spotify-lighter-gray rounded-full transition-colors opacity-0 group-hover:opacity-100"
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
