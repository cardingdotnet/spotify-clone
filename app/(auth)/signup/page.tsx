'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Music, Loader2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Create account
      const signupRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const signupData = await signupRes.json();

      if (!signupRes.ok) {
        toast.error(signupData.error || 'Signup failed');
        return;
      }

      // Auto-login after signup
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!loginRes.ok) {
        toast.success('Account created! Please log in.');
        router.push('/login');
        return;
      }

      toast.success('Welcome to Wavestream! 🎵');
      router.push('/');
      router.refresh();
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-b from-[#1f1f1f] to-spotify-black">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-spotify-green rounded-full flex items-center justify-center mb-4">
            <Music className="w-8 h-8 text-black" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold">Wavestream</h1>
          <p className="text-spotify-text-gray mt-2">Create your account</p>
        </div>

        <div className="bg-spotify-dark-gray rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold mb-6">Sign up</h2>

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
                placeholder="choose_username"
                pattern="[a-zA-Z0-9_]{3,30}"
                title="3-30 characters, letters/numbers/underscore"
                autoComplete="username"
                className="input"
              />
              <p className="text-xs text-spotify-text-gray mt-1">
                3-30 characters, letters, numbers, and underscore only
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
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
                  Creating...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-spotify-lighter-gray text-center">
            <p className="text-spotify-text-gray">
              Already have an account?{' '}
              <Link 
                href="/login" 
                className="text-white hover:text-spotify-green underline font-semibold"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
