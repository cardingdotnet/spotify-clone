'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Home, Search, Library, Plus, Music, X, ListMusic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/lib/player/store';
import AudioWaves from '@/components/ui/AudioWaves';
import toast from 'react-hot-toast';

interface Playlist {
  id: string;
  name: string;
}

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [creating, setCreating] = useState(false);
  const { currentTrack, isPlaying } = usePlayerStore();

  useEffect(() => {
    fetchPlaylists();
  }, []);

  useEffect(() => {
    onMobileClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function fetchPlaylists() {
    try {
      const res = await fetch('/api/playlists');
      const data = await res.json();
      if (res.ok) {
        setPlaylists(data.playlists || []);
      }
    } catch (err) {
      console.error('Failed to load playlists:', err);
    }
  }

  async function createPlaylist() {
    setCreating(true);
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `My Playlist #${playlists.length + 1}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to create playlist');
        return;
      }

      toast.success('Playlist created!');
      await fetchPlaylists();
      router.push(`/playlist/${data.playlist.id}`);
    } catch (err) {
      toast.error('Network error');
    } finally {
      setCreating(false);
    }
  }

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/library', label: 'Library', icon: Library },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 lg:hidden animate-fade-in"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'flex-shrink-0 flex flex-col p-2 gap-2 transition-transform duration-300 ease-out',
          'bg-spotify-true-black',
          'lg:relative lg:translate-x-0 lg:w-[260px]',
          'fixed inset-y-0 left-0 z-50 w-[280px]',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-spotify-green to-emerald-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform glow-green">
              <Music className="w-5 h-5 text-black" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Wavestream
            </span>
          </Link>
          
          <button
            onClick={onMobileClose}
            className="lg:hidden p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Nav */}
        <nav className="bg-spotify-dark-gray/60 backdrop-blur-sm rounded-xl p-2 border border-white/[0.04]">
          <ul className="space-y-0.5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      'flex items-center gap-4 px-4 py-3 rounded-lg font-semibold transition-all duration-200 relative overflow-hidden group',
                      active
                        ? 'text-white bg-white/[0.08]'
                        : 'text-spotify-text-light hover:text-white hover:bg-white/[0.04]'
                    )}
                  >
                    {/* Active indicator */}
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-spotify-green rounded-r-full" />
                    )}
                    
                    <Icon className={cn(
                      'w-6 h-6 transition-transform duration-200',
                      active ? 'scale-110' : 'group-hover:scale-110'
                    )} />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Playlists Section */}
        <div className="bg-spotify-dark-gray/60 backdrop-blur-sm rounded-xl p-2 flex-1 overflow-hidden flex flex-col min-h-0 border border-white/[0.04]">
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2 text-spotify-text-light">
              <ListMusic className="w-4 h-4" />
              <span className="font-semibold text-sm">Your Library</span>
            </div>
            <button
              onClick={createPlaylist}
              disabled={creating}
              title="Create playlist"
              className="p-2 hover:bg-white/10 rounded-full transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <ul className="overflow-y-auto flex-1 mt-1 space-y-0.5">
            {playlists.length === 0 ? (
              <li className="px-4 py-6 text-center">
                <Music className="w-8 h-8 mx-auto text-spotify-text-gray/40 mb-2" />
                <p className="text-spotify-text-gray text-xs">
                  No playlists yet
                </p>
                <p className="text-spotify-text-gray/60 text-xs mt-1">
                  Click + to create one
                </p>
              </li>
            ) : (
              playlists.map((p) => {
                const active = pathname === `/playlist/${p.id}`;
                // Highlight if a track from this playlist is currently playing
                // (We can't easily know without the full data, so just check if active)
                
                return (
                  <li key={p.id}>
                    <Link
                      href={`/playlist/${p.id}`}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200 group',
                        active
                          ? 'bg-white/[0.08] text-white'
                          : 'text-spotify-text-light hover:text-white hover:bg-white/[0.04]'
                      )}
                    >
                      <span className="truncate flex-1">{p.name}</span>
                      
                      {/* Show wave animation if active and playing */}
                      {active && currentTrack && isPlaying && (
                        <AudioWaves size="sm" />
                      )}
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </aside>
    </>
  );
}
