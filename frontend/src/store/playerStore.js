import { create } from 'zustand';
import { musicApi, historyApi, libraryApi } from '../api/client.js';
import toast from 'react-hot-toast';

let audioEl = null;

function getAudio() {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = 'metadata';
  }
  return audioEl;
}

const usePlayerStore = create((set, get) => ({
  // ── State ────────────────────────────────────────────────
  currentTrack: null,
  queue:        [],
  queueIndex:   0,
  isPlaying:    false,
  isLoading:    false,
  shuffle:      false,
  repeat:       'none',   // 'none' | 'all' | 'one'
  volume:       0.7,
  progress:     0,        // 0–100
  currentTime:  0,
  duration:     0,
  liked:        new Set(),

  // ── Init audio listeners ─────────────────────────────────
  initListeners: () => {
    const audio = getAudio();

    audio.ontimeupdate = () => {
      if (!audio.duration) return;
      set({
        currentTime: audio.currentTime,
        duration:    audio.duration,
        progress:    (audio.currentTime / audio.duration) * 100,
      });
    };

    audio.onended = () => {
      const { repeat, shuffle, queue, queueIndex } = get();
      if (repeat === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else if (repeat === 'all' || queueIndex < queue.length - 1) {
        get().next();
      } else {
        set({ isPlaying: false });
      }
    };

    audio.onloadstart = () => set({ isLoading: true });
    audio.oncanplay  = () => set({ isLoading: false });
    audio.onerror    = () => {
      set({ isLoading: false, isPlaying: false });
      toast.error('Failed to load track');
    };
  },

  // ── Play a track ─────────────────────────────────────────
  play: async (track, queue = [], startIndex = null) => {
    const audio = getAudio();

    // If same track — just toggle
    if (get().currentTrack?.id === track.id && audio.src) {
      return get().togglePlay();
    }

    const idx = startIndex ?? queue.findIndex(t => t.id === track.id);
    set({
      currentTrack: track,
      queue,
      queueIndex:   Math.max(idx, 0),
      isLoading:    true,
      isPlaying:    false,
      progress:     0,
      currentTime:  0,
    });

    const streamUrl = musicApi.streamUrl(track.id);
    audio.src = streamUrl;
    audio.volume = get().volume;

    try {
      await audio.play();
      set({ isPlaying: true });

      // Preload next track
      const nextIdx = (Math.max(idx, 0) + 1) % Math.max(queue.length, 1);
      if (queue[nextIdx] && queue[nextIdx].id !== track.id) {
        const preload = new Audio();
        preload.preload = 'metadata';
        preload.src = musicApi.streamUrl(queue[nextIdx].id);
      }

      // Save to history (fire and forget)
      historyApi.add({
        youtubeId:  track.id,
        title:      track.title,
        artist:     track.artist,
        duration:   track.duration,
        thumbnail:  track.thumbnail,
        deviceType: 'web',
      }).catch(() => {});

    } catch (err) {
      set({ isLoading: false, isPlaying: false });
    }
  },

  togglePlay: () => {
    const audio = getAudio();
    if (!get().currentTrack) return;

    if (get().isPlaying) {
      audio.pause();
      set({ isPlaying: false });
    } else {
      audio.play().then(() => set({ isPlaying: true })).catch(() => {});
    }
  },

  next: () => {
    const { queue, queueIndex, shuffle } = get();
    if (!queue.length) return;

    let nextIdx;
    if (shuffle) {
      do { nextIdx = Math.floor(Math.random() * queue.length); }
      while (queue.length > 1 && nextIdx === queueIndex);
    } else {
      nextIdx = (queueIndex + 1) % queue.length;
    }

    get().play(queue[nextIdx], queue, nextIdx);
  },

  prev: () => {
    const { queue, queueIndex } = get();
    const audio = getAudio();

    // If >3s in, restart current track
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    const prevIdx = (queueIndex - 1 + queue.length) % queue.length;
    if (queue[prevIdx]) get().play(queue[prevIdx], queue, prevIdx);
  },

  seek: (pct) => {
    const audio = getAudio();
    if (audio.duration) {
      audio.currentTime = (pct / 100) * audio.duration;
      set({ progress: pct });
    }
  },

  setVolume: (vol) => {
    getAudio().volume = vol;
    set({ volume: vol });
  },

  toggleShuffle: () => {
    set(s => ({ shuffle: !s.shuffle }));
    toast(get().shuffle ? '🔀 Shuffle on' : 'Shuffle off', { icon: '🔀' });
  },

  toggleRepeat: () => {
    const modes = ['none', 'all', 'one'];
    const next = modes[(modes.indexOf(get().repeat) + 1) % 3];
    set({ repeat: next });
    const labels = { none: 'Repeat off', all: 'Repeat all', one: 'Repeat one' };
    toast(labels[next]);
  },

  // ── Like / Unlike ────────────────────────────────────────
  toggleLike: async () => {
    const track = get().currentTrack;
    if (!track) return;

    const wasLiked = get().liked.has(track.id);
    const newLiked = new Set(get().liked);

    if (wasLiked) {
      newLiked.delete(track.id);
      set({ liked: newLiked });
      await libraryApi.unlikeTrack(track.id).catch(() => {});
      toast('Removed from liked songs');
    } else {
      newLiked.add(track.id);
      set({ liked: newLiked });
      await libraryApi.likeTrack(track.id, {
        title: track.title, artist: track.artist,
        duration: track.duration, thumbnail: track.thumbnail,
      }).catch(() => {});
      toast.success('Added to liked songs ♥');
    }
  },

  setLiked: (ids) => set({ liked: new Set(ids) }),

  isLiked: (id) => get().liked.has(id),

  // ── Queue management ─────────────────────────────────────
  addToQueue: (track) => {
    const q = [...get().queue, track];
    set({ queue: q });
    toast(`Added to queue: ${track.title}`);
  },

  clearQueue: () => set({ queue: [], currentTrack: null }),
}));

export default usePlayerStore;
