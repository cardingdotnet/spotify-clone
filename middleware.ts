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
     * - /stream/* (public M3U playlist URLs — no auth needed)
     * - /api/stream/* (M3U playlist generator)
     * - /api/stream-resolve/* (track URL resolver)
     * - /radio/* (public Icecast MP3 stream URLs — IMVU)
     * - /api/radio/* (radio stream backend)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|stream/|api/stream/|api/stream-resolve/|radio/|api/radio/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
