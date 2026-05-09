'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Music, Loader2, ArrowRight } from 'lucide-react';

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
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-spotify-green/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <div className="w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="group">
            <div className="relative">
              <div className="absolute inset-0 bg-spotify-green rounded-2xl blur-xl opacity-50 animate-pulse-glow" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-spotify-green to-emerald-600 rounded-2xl flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                <Music className="w-10 h-10 text-black" strokeWidth={2.5} />
              </div>
            </div>
          </Link>
          <h1 className="text-4xl font-black tracking-tight mt-6">Join Wavestream</h1>
          <p className="text-white/60 mt-2 text-sm">Create your account in seconds</p>
        </div>

        {/* Form Card */}
        <div className="card-glass p-6 sm:p-8 shadow-2xl">
          <h2 className="text-2xl font-bold mb-1">Sign up free</h2>
          <p className="text-sm text-white/60 mb-6">It only takes a moment</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-white/70">
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
              <p className="text-xs text-white/40 mt-1.5">
                3-30 characters, letters, numbers, underscore
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-white/70">
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
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-white/70">
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
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-white/60 text-sm">
              Already have an account?{' '}
              <Link 
                href="/login" 
                className="text-spotify-green hover:underline font-semibold"
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
