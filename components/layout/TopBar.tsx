'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, LogOut, User, Menu, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

interface TopBarProps {
  username: string;
  displayName: string;
  onMobileMenuToggle: () => void;
}

export default function TopBar({ username, displayName, onMobileMenuToggle }: TopBarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      const main = document.querySelector('main');
      if (main) {
        setScrolled(main.scrollTop > 20);
      }
    }
    
    const main = document.querySelector('main');
    main?.addEventListener('scroll', handleScroll);
    return () => main?.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Generate avatar gradient based on username
  const avatarGradient = `linear-gradient(135deg, 
    hsl(${username.charCodeAt(0) * 7 % 360}, 70%, 50%), 
    hsl(${(username.charCodeAt(0) * 7 + 60) % 360}, 70%, 60%))`;

  return (
    <header 
      className={`
        h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30
        transition-all duration-300
        ${scrolled 
          ? 'bg-spotify-darker-gray/80 backdrop-blur-xl border-b border-white/[0.04]' 
          : 'bg-transparent'
        }
      `}
    >
      <div className="flex items-center gap-2">
        {/* Mobile hamburger */}
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 hover:bg-white/10 rounded-full transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Desktop nav arrows */}
        <button
          onClick={() => router.back()}
          className="hidden sm:flex w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full items-center justify-center transition-all hover:scale-105 active:scale-95"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => router.forward()}
          className="hidden sm:flex w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full items-center justify-center transition-all hover:scale-105 active:scale-95"
          aria-label="Forward"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 bg-black/40 hover:bg-white/10 rounded-full p-1 sm:pr-3 transition-all"
        >
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md"
            style={{ background: avatarGradient }}
          >
            {(displayName || username || 'U').charAt(0).toUpperCase()}
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
            <div className="absolute right-0 mt-2 w-64 glass-dark rounded-xl shadow-2xl z-50 overflow-hidden animate-scale-in">
              <div className="px-4 py-4 border-b border-white/10 flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white"
                  style={{ background: avatarGradient }}
                >
                  {(displayName || username || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{displayName}</p>
                  <p className="text-xs text-spotify-text-gray truncate">@{username}</p>
                </div>
              </div>
              
              <div className="p-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors text-sm rounded-md text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
