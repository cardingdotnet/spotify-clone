'use client';

import { useState } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  Repeat, Repeat1, Shuffle, Music, Loader2, ChevronUp
} from 'lucide-react';
import { usePlayerStore } from '@/lib/player/store';
import { formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    repeat,
    shuffle,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    toggleRepeat,
    toggleShuffle,
  } = usePlayerStore();

  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  if (!currentTrack) return null;

  const progressPercent = duration > 0 
    ? ((isDragging ? dragValue : currentTime) / duration) * 100 
    : 0;

  function handleProgressChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = parseFloat(e.target.value);
    setDragValue(value);
  }

  function handleProgressMouseDown() {
    setIsDragging(true);
    setDragValue(currentTime);
  }

  function handleProgressMouseUp() {
    seek(dragValue);
    setIsDragging(false);
  }

  return (
    <>
      {/* Mobile expanded view (full-screen player) */}
      {mobileExpanded && (
        <div 
          className="lg:hidden fixed inset-0 bg-gradient-to-b from-purple-900 via-black to-spotify-black z-50 flex flex-col p-6 animate-fade-in"
        >
          <button
            onClick={() => setMobileExpanded(false)}
            className="self-start p-2 hover:bg-white/10 rounded-full"
            aria-label="Minimize"
          >
            <ChevronUp className="w-6 h-6 rotate-180" />
          </button>

          <div className="flex-1 flex flex-col items-center justify-center gap-8">
            {/* Large artwork */}
            <div className="w-full max-w-[300px] aspect-square bg-spotify-light-gray rounded-lg overflow-hidden shadow-2xl">
              {currentTrack.artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={currentTrack.artworkUrl} 
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-24 h-24 text-spotify-text-gray" />
                </div>
              )}
            </div>

            {/* Track info */}
            <div className="text-center w-full px-4">
              <p className="text-2xl font-bold mb-2 truncate">{currentTrack.title}</p>
              <p className="text-spotify-text-gray truncate">{currentTrack.artist}</p>
            </div>

            {/* Progress */}
            <div className="w-full px-4">
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={isDragging ? dragValue : currentTime}
                onChange={handleProgressChange}
                onMouseDown={handleProgressMouseDown}
                onMouseUp={handleProgressMouseUp}
                onTouchStart={handleProgressMouseDown}
                onTouchEnd={handleProgressMouseUp}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer slider-thumb-mobile"
                style={{
                  background: `linear-gradient(to right, #fff 0%, #fff ${progressPercent}%, #4f4f4f ${progressPercent}%, #4f4f4f 100%)`,
                }}
              />
              <div className="flex justify-between text-xs text-spotify-text-gray mt-2">
                <span>{formatDuration((isDragging ? dragValue : currentTime) * 1000)}</span>
                <span>{formatDuration((duration || 0) * 1000)}</span>
              </div>
            </div>

            {/* Big controls */}
            <div className="flex items-center justify-center gap-8 w-full">
              <button
                onClick={toggleShuffle}
                className={cn(shuffle ? 'text-spotify-green' : 'text-spotify-text-light')}
              >
                <Shuffle className="w-5 h-5" />
              </button>
              
              <button onClick={previous} className="text-white">
                <SkipBack className="w-8 h-8" fill="currentColor" />
              </button>

              <button
                onClick={togglePlay}
                disabled={isLoading}
                className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-7 h-7 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-8 h-8" fill="currentColor" />
                ) : (
                  <Play className="w-8 h-8 ml-1" fill="currentColor" />
                )}
              </button>

              <button onClick={next} className="text-white">
                <SkipForward className="w-8 h-8" fill="currentColor" />
              </button>

              <button
                onClick={toggleRepeat}
                className={cn(repeat !== 'none' ? 'text-spotify-green' : 'text-spotify-text-light')}
              >
                {repeat === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Player Bar */}
      <div className="bg-spotify-dark-gray border-t border-spotify-lighter-gray flex-shrink-0">
        {/* MOBILE LAYOUT (compact bar with progress on top) */}
        <div className="lg:hidden">
          {/* Progress bar (thin, top) */}
          <div className="px-2 pt-1">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={isDragging ? dragValue : currentTime}
              onChange={handleProgressChange}
              onMouseDown={handleProgressMouseDown}
              onMouseUp={handleProgressMouseUp}
              onTouchStart={handleProgressMouseDown}
              onTouchEnd={handleProgressMouseUp}
              className="w-full h-1 rounded-full appearance-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right, #1DB954 0%, #1DB954 ${progressPercent}%, #4f4f4f ${progressPercent}%, #4f4f4f 100%)`,
              }}
            />
          </div>

          {/* Track info + controls */}
          <div className="flex items-center px-3 py-2 gap-3">
            <button
              onClick={() => setMobileExpanded(true)}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <div className="w-10 h-10 bg-spotify-light-gray rounded flex-shrink-0 overflow-hidden">
                {currentTrack.artworkUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={currentTrack.artworkUrl} 
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-5 h-5 text-spotify-text-gray" />
                  </div>
                )}
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold truncate">{currentTrack.title}</p>
                <p className="text-xs text-spotify-text-gray truncate">{currentTrack.artist}</p>
              </div>
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={previous}
                className="p-2 text-white"
                aria-label="Previous"
              >
                <SkipBack className="w-5 h-5" fill="currentColor" />
              </button>

              <button
                onClick={togglePlay}
                disabled={isLoading}
                className="p-2 text-white"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isLoading ? (
                  <Loader2 className="w-7 h-7 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-7 h-7" fill="currentColor" />
                ) : (
                  <Play className="w-7 h-7" fill="currentColor" />
                )}
              </button>

              <button
                onClick={next}
                className="p-2 text-white"
                aria-label="Next"
              >
                <SkipForward className="w-5 h-5" fill="currentColor" />
              </button>
            </div>
          </div>
        </div>

        {/* DESKTOP LAYOUT (full player bar) */}
        <div className="hidden lg:flex h-24 items-center px-4 gap-4">
          {/* Track Info — Left */}
          <div className="flex items-center gap-3 w-1/4 min-w-0">
            <div className="w-14 h-14 bg-spotify-light-gray rounded flex-shrink-0 overflow-hidden">
              {currentTrack.artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={currentTrack.artworkUrl} 
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-6 h-6 text-spotify-text-gray" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{currentTrack.title}</p>
              <p className="text-xs text-spotify-text-gray truncate">{currentTrack.artist}</p>
            </div>
          </div>

          {/* Controls — Center */}
          <div className="flex-1 flex flex-col items-center gap-2 max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleShuffle}
                className={cn(
                  'transition-colors',
                  shuffle ? 'text-spotify-green' : 'text-spotify-text-light hover:text-white'
                )}
                title={shuffle ? 'Shuffle: On' : 'Shuffle: Off'}
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                onClick={previous}
                className="text-spotify-text-light hover:text-white transition-colors"
                title="Previous"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={togglePlay}
                disabled={isLoading}
                className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5" fill="currentColor" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                )}
              </button>

              <button
                onClick={next}
                className="text-spotify-text-light hover:text-white transition-colors"
                title="Next"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <button
                onClick={toggleRepeat}
                className={cn(
                  'transition-colors',
                  repeat !== 'none' ? 'text-spotify-green' : 'text-spotify-text-light hover:text-white'
                )}
                title={`Repeat: ${repeat}`}
              >
                {repeat === 'one' ? (
                  <Repeat1 className="w-4 h-4" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="w-full flex items-center gap-2">
              <span className="text-xs text-spotify-text-gray min-w-[35px] text-right">
                {formatDuration((isDragging ? dragValue : currentTime) * 1000)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={isDragging ? dragValue : currentTime}
                onChange={handleProgressChange}
                onMouseDown={handleProgressMouseDown}
                onMouseUp={handleProgressMouseUp}
                onTouchStart={handleProgressMouseDown}
                onTouchEnd={handleProgressMouseUp}
                className="flex-1 h-1 rounded-full appearance-none cursor-pointer slider-thumb"
                style={{
                  background: `linear-gradient(to right, #1DB954 0%, #1DB954 ${progressPercent}%, #4f4f4f ${progressPercent}%, #4f4f4f 100%)`,
                }}
              />
              <span className="text-xs text-spotify-text-gray min-w-[35px]">
                {formatDuration((duration || 0) * 1000)}
              </span>
            </div>
          </div>

          {/* Volume — Right */}
          <div className="w-1/4 flex justify-end items-center gap-2">
            <button
              onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
              className="text-spotify-text-light hover:text-white transition-colors"
              title={volume > 0 ? 'Mute' : 'Unmute'}
            >
              {volume > 0 ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24 h-1 rounded-full appearance-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right, #fff 0%, #fff ${volume * 100}%, #4f4f4f ${volume * 100}%, #4f4f4f 100%)`,
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
