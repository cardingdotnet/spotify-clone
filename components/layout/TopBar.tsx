'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, LogOut, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface TopBarProps {
  username: string;
  displayName: string;
}

export default function TopBar({ username, displayName }: TopBarProps) {
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
    <header className="h-16 bg-black/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Navigation arrows */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 bg-black/70 hover:bg-black rounded-full flex items-center justify-center transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => router.forward()}
          className="w-8 h-8 bg-black/70 hover:bg-black rounded-full flex items-center justify-center transition-colors"
          aria-label="Forward"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 bg-black/70 hover:bg-spotify-lighter-gray rounded-full px-2 py-1 pr-4 transition-colors"
        >
          <div className="w-7 h-7 bg-spotify-light-gray rounded-full flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold">{displayName}</span>
        </button>

        {menuOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setMenuOpen(false)} 
            />
            <div className="absolute right-0 mt-2 w-48 bg-spotify-light-gray rounded-md shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-spotify-lighter-gray">
                <p className="text-sm font-semibold">{displayName}</p>
                <p className="text-xs text-spotify-text-gray">@{username}</p>
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
