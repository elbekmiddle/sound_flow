import axios from 'axios';
import { auth } from './firebase.js';

// ── Smart API base URL ─────────────────────────────────────
// • Dev:        reads VITE_API_URL (e.g. http://localhost:5000)
// • Production: MUST set VITE_API_URL to your HTTPS backend URL
//               e.g. https://api.obsidian-audio.com
//   Never use http:// on an https:// page (Mixed Content error!)
const API_BASE = import.meta.env.VITE_API_URL
  // If the env var starts with http:// but the page is https://, upgrade it
  ? import.meta.env.VITE_API_URL.replace(
      /^http:\/\//,
      window?.location?.protocol === 'https:' ? 'https://' : 'http://'
    )
  : window?.location?.origin ?? 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Auto-attach Firebase token ─────────────────────────────
api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch { /* no-op — unauthenticated request */ }
  return config;
});

// ── Global error handling ──────────────────────────────────
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Request failed';

    if (error.response?.status === 401) {
      auth.signOut().catch(() => {});
    }
    return Promise.reject(new Error(message));
  }
);

export { API_BASE };

// ── Music API ──────────────────────────────────────────────
export const musicApi = {
  search:      (q, limit = 20, offset = 0) =>
    api.get('/api/music/search', { params: { q, limit, offset } }),
  suggestions: (q) =>
    api.get('/api/music/suggestions', { params: { q } }),
  info:        (id) =>
    api.get('/api/music/info', { params: { id } }),
  trending:    () =>
    api.get('/api/music/trending'),
  // Stream URL — must also be HTTPS in production
  streamUrl:   (id) => `${API_BASE}/api/music/stream?id=${id}`,
};

// ── Auth API ───────────────────────────────────────────────
export const authApi = {
  syncUser:      (idToken, displayName) =>
    api.post('/api/auth/sync', { idToken, displayName }),
  getMe:         () => api.get('/api/auth/me'),
  updateProfile: (data) => api.put('/api/auth/profile', data),
};

// ── Playlist API ───────────────────────────────────────────
export const playlistApi = {
  getAll:      () => api.get('/api/playlist'),
  getOne:      (id) => api.get(`/api/playlist/${id}`),
  create:      (data) => api.post('/api/playlist', data),
  update:      (id, data) => api.put(`/api/playlist/${id}`, data),
  delete:      (id) => api.delete(`/api/playlist/${id}`),
  addTrack:    (playlistId, track) =>
    api.post(`/api/playlist/${playlistId}/tracks`, track),
  removeTrack: (playlistId, youtubeId) =>
    api.delete(`/api/playlist/${playlistId}/tracks/${youtubeId}`),
};

// ── History API ────────────────────────────────────────────
export const historyApi = {
  get:         () => api.get('/api/history'),
  add:         (data) => api.post('/api/history', data),
  getSearches: () => api.get('/api/history/search'),
  clear:       () => api.delete('/api/history'),
};

// ── Library API ────────────────────────────────────────────
export const libraryApi = {
  getLiked:       () => api.get('/api/library/liked'),
  likeTrack:      (youtubeId, data) =>
    api.post(`/api/library/liked/${youtubeId}`, data),
  unlikeTrack:    (youtubeId) =>
    api.delete(`/api/library/liked/${youtubeId}`),
  getLikedStatus: (youtubeId) =>
    api.get(`/api/library/liked/${youtubeId}/status`),
};

// ── Podcast API ────────────────────────────────────────────
export const podcastApi = {
  getAll:       () => api.get('/api/podcast'),
  getEpisodes:  (id) => api.get(`/api/podcast/${id}/episodes`),
  getProgress:  (episodeId) => api.get(`/api/podcast/progress/${episodeId}`),
  saveProgress: (episodeId, data) =>
    api.put(`/api/podcast/progress/${episodeId}`, data),
};

export default api;
