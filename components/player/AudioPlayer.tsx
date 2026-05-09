'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/lib/player/store';
import toast from 'react-hot-toast';

/**
 * AudioPlayer — Hidden component that handles actual audio playback.
 * Listens to player store state and controls a single <audio> element.
 * 
 * Supports both progressive (MP3) streams via direct src,
 * and HLS streams via hls.js when needed.
 */
export default function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<any>(null);
  
  const {
    currentTrack,
    isPlaying,
    volume,
    setPlaying,
    setLoading,
    setCurrentTime,
    setDuration,
    next,
  } = usePlayerStore();

  // Load track when it changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    let cancelled = false;
    setLoading(true);

    async function loadTrack() {
      try {
        // Get the resolved stream URL from our backend
        const resolveUrl = `/api/stream-resolve/${currentTrack!.id}?format=json`;
        const res = await fetch(resolveUrl);
        
        if (!res.ok) {
          throw new Error('Failed to get stream URL');
        }
        
        const { url, type } = await res.json();
        
        if (cancelled) return;
        
        // Cleanup previous HLS instance
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }

        if (type === 'hls' && audio) {
          // HLS stream — use hls.js
          // Native HLS support in Safari
          if (audio.canPlayType('application/vnd.apple.mpegurl')) {
            audio.src = url;
          } else {
            // Use hls.js for other browsers
            const Hls = (await import('hls.js')).default;
            
            if (Hls.isSupported()) {
              const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: false,
              });
              
              hls.loadSource(url);
              hls.attachMedia(audio);
              hlsRef.current = hls;
              
              hls.on(Hls.Events.ERROR, (_event, data) => {
                if (data.fatal) {
                  console.error('HLS fatal error:', data);
                  toast.error('Playback error. Trying to recover...');
                  
                  switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                      hls.startLoad();
                      break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                      hls.recoverMediaError();
                      break;
                    default:
                      hls.destroy();
                      break;
                  }
                }
              });
            } else {
              audio.src = url;
            }
          }
        } else {
          // Progressive stream (MP3)
          audio.src = url;
        }
        
        if (cancelled) return;
        
        // Try to play
        if (isPlaying) {
          try {
            await audio.play();
          } catch (err: any) {
            // Autoplay blocked — common on first interaction
            if (err.name === 'NotAllowedError') {
              toast.error('Click play button to start (browser autoplay blocked)');
              setPlaying(false);
            } else {
              throw err;
            }
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to load track:', err);
        if (!cancelled) {
          toast.error('Failed to load track. Skipping...');
          setLoading(false);
          setPlaying(false);
          // Try next track after a short delay
          setTimeout(() => next(), 1500);
        }
      }
    }

    loadTrack();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  // Handle play/pause from store
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    
    if (isPlaying && audio.paused) {
      audio.play().catch(err => {
        console.error('Play failed:', err);
        if (err.name === 'NotAllowedError') {
          toast.error('Browser blocked autoplay. Click play to start.');
          setPlaying(false);
        }
      });
    } else if (!isPlaying && !audio.paused) {
      audio.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentTrack?.id]);

  // Handle volume changes
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
    }
  }, [volume]);

  // Handle seek requests from store
  const seekTime = usePlayerStore(s => s.currentTime);
  const isSeekingRef = useRef(false);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // Only seek if user explicitly set time (not from timeupdate)
    if (Math.abs(audio.currentTime - seekTime) > 1.5 && !isSeekingRef.current) {
      isSeekingRef.current = true;
      audio.currentTime = seekTime;
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 100);
    }
  }, [seekTime]);

  // Audio element event handlers
  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (audio && !isSeekingRef.current) {
      setCurrentTime(audio.currentTime);
    }
  }

  function handleLoadedMetadata() {
    const audio = audioRef.current;
    if (audio) {
      setDuration(audio.duration);
    }
  }

  function handleEnded() {
    next();
  }

  function handleError(e: React.SyntheticEvent<HTMLAudioElement>) {
    const audio = e.currentTarget;
    console.error('Audio error:', audio.error);
    
    if (audio.error) {
      toast.error('Playback failed. Skipping to next...');
      setTimeout(() => next(), 1000);
    }
  }
  
  function handleWaiting() {
    setLoading(true);
  }
  
  function handlePlaying() {
    setLoading(false);
  }

  return (
    <audio
      ref={audioRef}
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={handleLoadedMetadata}
      onEnded={handleEnded}
      onError={handleError}
      onWaiting={handleWaiting}
      onPlaying={handlePlaying}
      preload="auto"
      crossOrigin="anonymous"
    />
  );
}
