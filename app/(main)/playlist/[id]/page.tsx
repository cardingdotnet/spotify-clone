'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Music, Trash2, Copy, Check, Share2, Loader2,
  ExternalLink, Play, Pause, Edit2, MoreHorizontal, Clock,
  Volume2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDuration, getStreamUrl, getStreamUrlWithExtension } from '@/lib/utils';
import { usePlayerStore, PlayerTrack } from '@/lib/player/store';
import { TrackListSkeleton } from '@/components/ui/Skeletons';
import AudioWaves from '@/components/ui/AudioWaves';

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
  const [showShareCard, setShowShareCard] = useState(false);
  
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
      toast.success('Copied to clipboard!');
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
      <div>
        {/* Skeleton header */}
        <div className="bg-gradient-to-b from-purple-900/30 to-transparent p-4 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            <div className="w-32 h-32 sm:w-56 sm:h-56 mx-auto sm:mx-0 bg-white/[0.05] rounded-md shimmer-bg" />
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-white/[0.05] rounded w-20 shimmer-bg" />
              <div className="h-12 bg-white/[0.05] rounded w-3/4 shimmer-bg" />
              <div className="h-4 bg-white/[0.05] rounded w-1/2 shimmer-bg" />
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-8">
          <TrackListSkeleton count={5} />
        </div>
      </div>
    );
  }

  if (!playlist) return null;

  const totalDuration = tracks.reduce((acc, t) => acc + t.duration_ms, 0);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const cleanUrl = getStreamUrl(playlist.short_code, origin);
  const m3uUrl = getStreamUrlWithExtension(playlist.short_code, origin);

  // Generate dynamic gradient based on playlist ID
  const hue = playlist.id.charCodeAt(0) * 7 % 360;
  const headerGradient = `linear-gradient(180deg, 
    hsla(${hue}, 70%, 35%, 0.6) 0%, 
    hsla(${hue}, 60%, 25%, 0.3) 30%,
    transparent 100%)`;

  return (
    <div className="animate-fade-in">
      {/* === HERO HEADER === */}
      <div 
        className="relative px-4 sm:px-8 pt-6 pb-4 sm:pt-12 sm:pb-6"
        style={{ background: headerGradient }}
      >
        {/* Noise overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" 
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
        
        <div className="relative flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
          {/* Album art */}
          <div className="relative mx-auto sm:mx-0 group">
            <div className="absolute inset-0 bg-black/30 blur-2xl rounded-md" />
            <div 
              className="relative w-40 h-40 sm:w-56 sm:h-56 rounded-md flex items-center justify-center shadow-2xl flex-shrink-0 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, 
                  hsl(${hue}, 60%, 50%), 
                  hsl(${(hue + 60) % 360}, 60%, 35%))`
              }}
            >
              {playlist.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={playlist.cover_url}
                  alt={playlist.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music className="w-20 h-20 sm:w-28 sm:h-28 text-white/50" />
              )}
              
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-widest mb-2 text-white/70">
              Playlist
            </p>
            
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
                  className="text-2xl sm:text-4xl md:text-6xl font-black bg-transparent border-b-2 border-white outline-none flex-1 w-full text-center sm:text-left tracking-tight"
                  maxLength={100}
                />
                <div className="flex gap-2">
                  <button onClick={saveRename} className="btn-primary text-sm py-2 px-4">
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
                className="group cursor-pointer mb-3 sm:mb-5 inline-flex items-center gap-2 sm:gap-3 max-w-full"
                title="Click to rename"
              >
                <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight truncate">
                  {playlist.name}
                </h1>
                <Edit2 className="w-4 h-4 sm:w-6 sm:h-6 opacity-0 sm:group-hover:opacity-60 transition-opacity flex-shrink-0" />
              </button>
            )}
            
            {playlist.description && (
              <p className="text-white/70 mb-2 text-sm sm:text-base">
                {playlist.description}
              </p>
            )}
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-xs sm:text-sm text-white/70">
              <span className="font-semibold text-white">@{playlist.user_id.substring(0, 6)}</span>
              <span>•</span>
              <span>{tracks.length} {tracks.length === 1 ? 'song' : 'songs'}</span>
              {tracks.length > 0 && (
                <>
                  <span>•</span>
                  <span>{formatDuration(totalDuration)}</span>
                </>
              )}
              <span>•</span>
              <span>{playlist.play_count} plays</span>
            </div>
          </div>
        </div>
      </div>

      {/* === ACTION BAR === */}
      <div className="px-4 sm:px-8 py-4 sm:py-6 flex items-center gap-4 sm:gap-6">
        <button
          onClick={isPlaylistPlaying ? togglePlay : playAll}
          disabled={tracks.length === 0}
          className={`
            w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center 
            transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed 
            shadow-2xl group
            ${isPlaylistPlaying 
              ? 'bg-spotify-green scale-100 hover:scale-105 glow-green-strong' 
              : 'bg-spotify-green hover:scale-110 hover:bg-spotify-green-hover hover:shadow-spotify-green/50'
            }
          `}
          title={isPlaylistPlaying ? 'Pause' : 'Play'}
        >
          {isPlaylistPlaying ? (
            <Pause className="w-6 h-6 sm:w-7 sm:h-7 text-black" fill="currentColor" />
          ) : (
            <Play className="w-6 h-6 sm:w-7 sm:h-7 text-black ml-0.5 sm:ml-1" fill="currentColor" />
          )}
        </button>

        <button
          onClick={() => setShowShareCard(!showShareCard)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] backdrop-blur-sm border border-white/10 transition-all hover:scale-105"
        >
          <Share2 className="w-4 h-4 text-spotify-green" />
          <span className="text-sm font-semibold">Share</span>
        </button>

        <button className="ml-auto p-2 rounded-full hover:bg-white/[0.08] transition-colors">
          <MoreHorizontal className="w-6 h-6 text-white/60" />
        </button>
      </div>

      {/* === SHARE CARD (Collapsible) === */}
      {showShareCard && (
        <div className="px-4 sm:px-8 mb-6 animate-fade-in-up">
          <div className="card-glass p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-spotify-green/20 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-spotify-green" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold">Stream Anywhere</h2>
                <p className="text-xs text-white/60">Works in VLC, browsers, IMVU, car stereos</p>
              </div>
            </div>

            {/* Short URL */}
            <div className="mb-3">
              <label className="text-[10px] text-white/50 uppercase font-bold tracking-wider">
                Short URL (recommended)
              </label>
              <div className="flex gap-2 mt-1.5">
                <input
                  type="text"
                  readOnly
                  value={cleanUrl}
                  className="input flex-1 font-mono text-xs sm:text-sm"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => copyToClipboard(cleanUrl, setCopiedClean)}
                  className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap text-sm py-2.5 px-4"
                  disabled={tracks.length === 0}
                >
                  {copiedClean ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
                </button>
              </div>
            </div>

            {/* M3U URL */}
            <div className="mb-4">
              <label className="text-[10px] text-white/50 uppercase font-bold tracking-wider">
                .m3u URL
              </label>
              <div className="flex gap-2 mt-1.5">
                <input
                  type="text"
                  readOnly
                  value={m3uUrl}
                  className="input flex-1 font-mono text-xs sm:text-sm"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => copyToClipboard(m3uUrl, setCopiedM3u)}
                  className="btn-secondary flex items-center justify-center gap-2 whitespace-nowrap text-sm py-2.5 px-4"
                  disabled={tracks.length === 0}
                >
                  {copiedM3u ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <a
                href={cleanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.12] rounded-full text-xs transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Test
              </a>
              {['VLC', 'IMVU', 'Browsers', 'Mobile'].map(label => (
                <span key={label} className="px-2.5 py-1 bg-white/[0.06] rounded-full text-xs">
                  ✓ {label}
                </span>
              ))}
            </div>

            {tracks.length === 0 && (
              <p className="mt-4 text-sm text-yellow-400 flex items-center gap-2">
                ⚠️ Add tracks before sharing
              </p>
            )}
          </div>
        </div>
      )}

      {/* === TRACK LIST === */}
      <div className="px-4 sm:px-8 pb-8">
        {tracks.length === 0 ? (
          <div className="text-center py-16 max-w-sm mx-auto">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 bg-spotify-green/10 rounded-full blur-2xl" />
              <div className="relative w-full h-full bg-white/[0.04] rounded-full flex items-center justify-center border border-white/10">
                <Music className="w-10 h-10 text-white/30" />
              </div>
            </div>
            <h3 className="text-lg font-bold mb-2">It&apos;s quiet here...</h3>
            <p className="text-white/60 mb-6 text-sm">
              Search for music to start building your playlist
            </p>
            <button
              onClick={() => router.push('/search')}
              className="btn-primary"
            >
              Find Music
            </button>
          </div>
        ) : (
          <>
            {/* Desktop track header */}
            <div className="hidden sm:grid grid-cols-[40px,auto,1fr,auto,40px] gap-4 px-4 py-2 text-xs uppercase tracking-wider text-white/50 border-b border-white/[0.08] mb-2 font-semibold">
              <span>#</span>
              <span></span>
              <span>Title</span>
              <Clock className="w-4 h-4" />
              <span></span>
            </div>

            <div className="space-y-0.5">
              {tracks.map((track, idx) => {
                const isCurrentTrack = currentTrack?.id === track.id;
                const showPause = isCurrentTrack && isPlaying;

                return (
                  <div
                    key={track.id}
                    className={`
                      flex sm:grid sm:grid-cols-[40px,auto,1fr,auto,40px] 
                      gap-3 sm:gap-4 px-2 sm:px-4 py-2 rounded-md group items-center
                      transition-colors
                      ${isCurrentTrack ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'}
                    `}
                    style={{ 
                      animation: 'fadeInUp 0.3s ease-out backwards',
                      animationDelay: `${idx * 30}ms`,
                    }}
                  >
                    {/* Index/Play (desktop) */}
                    <div className="hidden sm:flex w-10 items-center justify-center">
                      {isCurrentTrack && isPlaying ? (
                        <AudioWaves size="md" className="group-hover:hidden" />
                      ) : (
                        <span className={`
                          font-mono text-sm group-hover:hidden
                          ${isCurrentTrack ? 'text-spotify-green' : 'text-white/50'}
                        `}>
                          {idx + 1}
                        </span>
                      )}
                      <button
                        onClick={() => playTrackAt(idx)}
                        className="hidden group-hover:block text-white hover:scale-110 transition-transform"
                      >
                        {showPause ? (
                          <Pause className="w-4 h-4" fill="currentColor" />
                        ) : (
                          <Play className="w-4 h-4" fill="currentColor" />
                        )}
                      </button>
                    </div>

                    {/* Artwork */}
                    <button
                      onClick={() => playTrackAt(idx)}
                      className="relative w-12 h-12 sm:w-10 sm:h-10 rounded overflow-hidden bg-white/[0.05] flex-shrink-0 group/art"
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
                          <Music className="w-5 h-5 text-white/40" />
                        </div>
                      )}
                      {/* Mobile play overlay */}
                      <div className="sm:hidden absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-active/art:opacity-100 transition-opacity">
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
                      <p className={`
                        font-semibold truncate text-sm sm:text-base transition-colors
                        ${isCurrentTrack ? 'text-spotify-green' : 'text-white'}
                      `}>
                        {track.title}
                      </p>
                      <p className="text-xs sm:text-sm text-white/60 truncate hover:underline">
                        {track.artist}
                      </p>
                    </button>

                    {/* Duration */}
                    <span className="hidden sm:inline text-sm text-white/60 font-mono tabular-nums">
                      {formatDuration(track.duration_ms)}
                    </span>

                    {/* Remove */}
                    <button
                      onClick={() => removeTrack(track.id)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0 opacity-60 sm:opacity-0 sm:group-hover:opacity-60 hover:!opacity-100"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4 hover:text-red-400 transition-colors" />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Delete playlist (subtle) */}
        <div className="mt-12 pt-6 border-t border-white/[0.04]">
          <button
            onClick={deletePlaylist}
            className="text-red-400/70 hover:text-red-400 text-sm flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete this playlist
          </button>
        </div>
      </div>
    </div>
  );
}
