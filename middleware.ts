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
     * - /radio/*  (IMVU-compatible live radio stream — no auth needed)
     * - /api/stream/* (the actual stream backend)
     * - /api/stream-resolve/* (track URL resolver)
     * - /api/radio/* (IMVU radio proxy)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|stream/|radio/|api/stream/|api/stream-resolve/|api/radio/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
