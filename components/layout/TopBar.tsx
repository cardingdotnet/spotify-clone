'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, LogOut, User, Menu } from 'lucide-react';
import toast from 'react-hot-toast';

interface TopBarProps {
  username: string;
  displayName: string;
  onMobileMenuToggle: () => void;
}

export default function TopBar({ username, displayName, onMobileMenuToggle }: TopBarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('Logged out');
      router.push('/login');
      router.refresh();
    } catch (err) {
      toast.error('Logout failed');
    }
  }

  return (
    <header className="h-14 sm:h-16 bg-black/50 backdrop-blur-md flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30">
      {/* Left: Hamburger (mobile) + Navigation arrows */}
      <div className="flex items-center gap-2">
        {/* Mobile hamburger */}
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 hover:bg-spotify-light-gray rounded-full transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Desktop nav arrows */}
        <button
          onClick={() => router.back()}
          className="hidden sm:flex w-8 h-8 bg-black/70 hover:bg-black rounded-full items-center justify-center transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => router.forward()}
          className="hidden sm:flex w-8 h-8 bg-black/70 hover:bg-black rounded-full items-center justify-center transition-colors"
          aria-label="Forward"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 bg-black/70 hover:bg-spotify-lighter-gray rounded-full px-2 py-1 sm:pr-4 transition-colors"
        >
          <div className="w-7 h-7 bg-spotify-light-gray rounded-full flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <span className="hidden sm:inline text-sm font-semibold max-w-[150px] truncate">
            {displayName}
          </span>
        </button>

        {menuOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setMenuOpen(false)} 
            />
            <div className="absolute right-0 mt-2 w-56 bg-spotify-light-gray rounded-md shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-spotify-lighter-gray">
                <p className="text-sm font-semibold truncate">{displayName}</p>
                <p className="text-xs text-spotify-text-gray truncate">@{username}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-spotify-lighter-gray transition-colors text-sm"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
