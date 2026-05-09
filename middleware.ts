import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Skip auth check on:
     * - Next.js internals
     * - Static assets
     * - /stream/* (public playlist URLs — no auth needed)
     * - /api/stream/* (the M3U stream backend)
     * - /api/stream-resolve/* (track URL resolver → 302 to SoundCloud CDN)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|stream/|api/stream/|api/stream-resolve/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
