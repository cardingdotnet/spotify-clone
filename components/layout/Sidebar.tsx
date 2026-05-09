'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Home, Search, Library, Plus, Music, X } from 'lucide-react';
import { cn } from '@/lib/utils';
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

  useEffect(() => {
    fetchPlaylists();
  }, []);

  // Close mobile sidebar on route change
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'bg-black flex-shrink-0 flex flex-col p-2 gap-2 transition-transform duration-300',
          // Desktop: always visible
          'lg:relative lg:translate-x-0 lg:w-64',
          // Mobile: drawer
          'fixed inset-y-0 left-0 z-50 w-72',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header with close button on mobile */}
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-spotify-green rounded-full flex items-center justify-center">
              <Music className="w-5 h-5 text-black" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold">Wavestream</span>
          </div>
          
          {/* Close button (mobile only) */}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1 hover:bg-spotify-light-gray rounded-full"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Nav */}
        <nav className="bg-spotify-dark-gray rounded-lg p-2">
          <ul className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      'flex items-center gap-4 px-4 py-3 rounded-md font-semibold transition-colors',
                      active
                        ? 'bg-spotify-light-gray text-white'
                        : 'text-spotify-text-light hover:text-white'
                    )}
                  >
                    <Icon className="w-6 h-6" />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Playlists */}
        <div className="bg-spotify-dark-gray rounded-lg p-2 flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="font-semibold text-spotify-text-light">
              Your Library
            </span>
            <button
              onClick={createPlaylist}
              disabled={creating}
              title="Create playlist"
              className="p-2 hover:bg-spotify-lighter-gray rounded-full transition-colors disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <ul className="overflow-y-auto flex-1 mt-2 space-y-1">
            {playlists.length === 0 ? (
              <li className="px-4 py-2 text-spotify-text-gray text-sm">
                No playlists yet. Click + to create one.
              </li>
            ) : (
              playlists.map((p) => {
                const active = pathname === `/playlist/${p.id}`;
                return (
                  <li key={p.id}>
                    <Link
                      href={`/playlist/${p.id}`}
                      className={cn(
                        'block px-4 py-2 rounded-md text-sm transition-colors truncate',
                        active
                          ? 'bg-spotify-light-gray text-white'
                          : 'text-spotify-text-light hover:text-white hover:bg-spotify-light-gray/50'
                      )}
                    >
                      {p.name}
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
