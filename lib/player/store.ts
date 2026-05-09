/**
 * Player Store — Global audio playback state
 * Used by AudioPlayer, PlayerControls, and any track list to play/pause
 */

import { create } from 'zustand';

export interface PlayerTrack {
  id: number;
  title: string;
  artist: string;
  duration: number; // milliseconds
  artworkUrl: string | null;
}

interface PlayerState {
  // Current state
  currentTrack: PlayerTrack | null;
  queue: PlayerTrack[];
  currentIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  
  // Playback state
  currentTime: number;
  duration: number;
  volume: number;
  
  // Repeat / shuffle
  repeat: 'none' | 'all' | 'one';
  shuffle: boolean;
  
  // Actions
  playTrack: (track: PlayerTrack, queue?: PlayerTrack[]) => void;
  playQueue: (queue: PlayerTrack[], startIndex?: number) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setLoading: (loading: boolean) => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  clearPlayer: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  // Initial state
  currentTrack: null,
  queue: [],
  currentIndex: 0,
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  repeat: 'none',
  shuffle: false,
  
  // Play a single track (creates a queue with just that track if no queue given)
  playTrack: (track, queue) => {
    const newQueue = queue || [track];
    const index = newQueue.findIndex(t => t.id === track.id);
    set({
      currentTrack: track,
      queue: newQueue,
      currentIndex: index >= 0 ? index : 0,
      isPlaying: true,
      currentTime: 0,
    });
  },
  
  // Play a full queue starting at index
  playQueue: (queue, startIndex = 0) => {
    if (queue.length === 0) return;
    const track = queue[startIndex];
    set({
      currentTrack: track,
      queue,
      currentIndex: startIndex,
      isPlaying: true,
      currentTime: 0,
    });
  },
  
  togglePlay: () => set(state => ({ isPlaying: !state.isPlaying })),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setLoading: (loading) => set({ isLoading: loading }),
  
  next: () => {
    const { queue, currentIndex, repeat, shuffle } = get();
    if (queue.length === 0) return;
    
    if (repeat === 'one') {
      // Replay current
      set({ currentTime: 0, isPlaying: true });
      return;
    }
    
    let nextIndex: number;
    
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = currentIndex + 1;
      
      if (nextIndex >= queue.length) {
        if (repeat === 'all') {
          nextIndex = 0;
        } else {
          // End of queue
          set({ isPlaying: false, currentTime: 0 });
          return;
        }
      }
    }
    
    set({
      currentTrack: queue[nextIndex],
      currentIndex: nextIndex,
      currentTime: 0,
      isPlaying: true,
    });
  },
  
  previous: () => {
    const { queue, currentIndex, currentTime } = get();
    if (queue.length === 0) return;
    
    // If more than 3 seconds played, restart current track
    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }
    
    const prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      set({ currentTime: 0 });
      return;
    }
    
    set({
      currentTrack: queue[prevIndex],
      currentIndex: prevIndex,
      currentTime: 0,
      isPlaying: true,
    });
  },
  
  seek: (time) => set({ currentTime: time }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  
  setVolume: (volume) => {
    const clamped = Math.max(0, Math.min(1, volume));
    set({ volume: clamped });
  },
  
  toggleRepeat: () => set(state => ({
    repeat: state.repeat === 'none' ? 'all' : state.repeat === 'all' ? 'one' : 'none'
  })),
  
  toggleShuffle: () => set(state => ({ shuffle: !state.shuffle })),
  
  clearPlayer: () => set({
    currentTrack: null,
    queue: [],
    currentIndex: 0,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  }),
}));
