-- =====================================================
-- Migration: IMVU Radio Stream Support
-- 
-- Adds:
--  1. increment_play_count() — atomic single-query increment
--  2. Ensures stream_access_logs accepts radio endpoint logs
-- =====================================================

-- Atomic play count increment (replaces the read-then-write pattern)
CREATE OR REPLACE FUNCTION public.increment_play_count(playlist_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.playlists
  SET play_count = COALESCE(play_count, 0) + 1
  WHERE id = playlist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow service role to call it
GRANT EXECUTE ON FUNCTION public.increment_play_count(UUID) TO service_role;
