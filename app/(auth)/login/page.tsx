'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Music, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Login failed');
        return;
      }

      toast.success('Welcome back!');
      router.push('/');
      router.refresh();
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-[#1f1f1f] to-spotify-black">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-spotify-green rounded-full flex items-center justify-center mb-4">
            <Music className="w-8 h-8 text-black" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold">Wavestream</h1>
          <p className="text-spotify-text-gray mt-2">Stream anywhere, anytime</p>
        </div>

        {/* Form Card */}
        <div className="bg-spotify-dark-gray rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold mb-6">Log in</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                autoComplete="username"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-6 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Log In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-spotify-lighter-gray text-center">
            <p className="text-spotify-text-gray">
              Don&apos;t have an account?{' '}
              <Link 
                href="/signup" 
                className="text-white hover:text-spotify-green underline font-semibold"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
