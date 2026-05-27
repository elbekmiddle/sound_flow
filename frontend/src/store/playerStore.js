import { create } from 'zustand';
import { musicApi, historyApi, libraryApi } from '../api/client.js';
import { socket } from '../api/socket.js';
import toast from 'react-hot-toast';

let audioEl = null;
let historyLogged = false; // track if 30% threshold logged for current track

function audio() {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = 'metadata';
    audioEl.crossOrigin = 'anonymous'; // required for redirect streams (Piped/CDN)
  }
  return audioEl;
}

const usePlayerStore = create((set, get) => ({
  currentTrack: null,
  queue:        [],
  queueIndex:   0,
  isPlaying:    false,
  isLoading:    false,
  shuffle:      false,
  repeat:       'none',
  volume:       0.75,
  progress:     0,
  currentTime:  0,
  duration:     0,
  liked:        new Set(),

  initListeners: () => {
    const a = audio();
    a.ontimeupdate = () => {
      if (!a.duration) return;
      const pct = (a.currentTime / a.duration) * 100;
      set({ currentTime: a.currentTime, duration: a.duration, progress: pct });

      // Log history at 30% completion (Spotify standard)
      if (!historyLogged && pct >= 30) {
        historyLogged = true;
        const track = get().currentTrack;
        if (track) {
          historyApi.add({
            youtubeId:     track.id,
            title:         track.title,
            artist:        track.artist,
            duration:      track.duration,
            thumbnail:     track.thumbnail,
            deviceType:    'web',
            playDuration:  Math.floor(a.currentTime),
            completionPct: Math.floor(pct),
          }).catch(() => {});
        }
      }
    };
    a.onended = () => {
      historyLogged = false; // reset for next track
      const { repeat, queue, queueIndex } = get();
      if (repeat === 'one') { a.currentTime = 0; a.play(); }
      else if (repeat === 'all' || queueIndex < queue.length - 1) get().next();
      else set({ isPlaying: false });
    };
    a.onloadstart = () => set({ isLoading: true });
    a.oncanplay   = () => set({ isLoading: false });
    a.onerror     = () => { set({ isLoading: false, isPlaying: false }); toast.error('Failed to load track'); };
  },

  play: async (track, queue = [], startIdx = null) => {
    const a = audio();
    if (get().currentTrack?.id === track.id && a.src) return get().togglePlay();
    const idx = startIdx ?? Math.max(queue.findIndex(t => t.id === track.id), 0);

    // Reset completion tracker for new track
    historyLogged = false;

    set({ currentTrack: track, queue, queueIndex: idx, isLoading: true, isPlaying: false, progress: 0, currentTime: 0 });
    a.src = musicApi.streamUrl(track.id);
    a.volume = get().volume;
    try {
      await a.play();
      set({ isPlaying: true });
      // Broadcast to WebSocket friends
      if (socket.connected) {
        socket.emit('now_playing', {
          id: track.id, title: track.title,
          artist: track.artist, thumbnail: track.thumbnail,
        });
      }
      // Preload next track metadata (no full download)
      const ni = (idx + 1) % Math.max(queue.length, 1);
      if (queue[ni] && queue[ni].id !== track.id) {
        const pre = new Audio();
        pre.preload = 'metadata';
        pre.crossOrigin = 'anonymous';
        pre.src = musicApi.streamUrl(queue[ni].id);
      }
      // Note: history is now logged at 30% via ontimeupdate (Spotify standard)
    } catch { set({ isLoading: false, isPlaying: false }); }
  },

  togglePlay: () => {
    const a = audio();
    if (!get().currentTrack) return;
    if (get().isPlaying) { a.pause(); set({ isPlaying: false }); }
    else { a.play().then(() => set({ isPlaying: true })).catch(() => {}); }
  },

  next: () => {
    const { queue, queueIndex, shuffle } = get();
    if (!queue.length) return;
    let ni = shuffle ? Math.floor(Math.random() * queue.length) : (queueIndex + 1) % queue.length;
    get().play(queue[ni], queue, ni);
  },

  prev: () => {
    const { queue, queueIndex } = get();
    const a = audio();
    if (a.currentTime > 3) { a.currentTime = 0; return; }
    const pi = (queueIndex - 1 + queue.length) % queue.length;
    if (queue[pi]) get().play(queue[pi], queue, pi);
  },

  seek: (pct) => {
    const a = audio();
    if (a.duration) { a.currentTime = (pct / 100) * a.duration; set({ progress: pct }); }
  },

  setVolume: (v) => { audio().volume = v; set({ volume: v }); },

  toggleShuffle: () => {
    const next = !get().shuffle;
    set({ shuffle: next });
    toast(next ? '🔀 Shuffle on' : 'Shuffle off');
  },

  toggleRepeat: () => {
    const map = { none: 'all', all: 'one', one: 'none' };
    const next = map[get().repeat];
    set({ repeat: next });
    toast({ none: 'Repeat off', all: 'Repeat all', one: 'Repeat one' }[next]);
  },

  toggleLike: async () => {
    const track = get().currentTrack;
    if (!track) return;
    const id = track.id;
    const liked = new Set(get().liked);
    if (liked.has(id)) {
      liked.delete(id); set({ liked });
      await libraryApi.unlikeTrack(id).catch(() => {});
      toast('Removed from liked songs');
    } else {
      liked.add(id); set({ liked });
      await libraryApi.likeTrack(id, { title: track.title, artist: track.artist, duration: track.duration, thumbnail: track.thumbnail }).catch(() => {});
      toast.success('Added to liked songs ♥');
    }
  },

  setLiked: (ids) => set({ liked: new Set(ids) }),
  isLiked:  (id) => get().liked.has(id),

  addToQueue: (track) => {
    set({ queue: [...get().queue, track] });
    toast(`Added "${track.title}" to queue`);
  },

  clearQueue: () => { audio().pause(); audio().src = ''; set({ queue: [], currentTrack: null, isPlaying: false }); },
}));

export default usePlayerStore;
