import axios from 'axios';
import { auth } from './firebase.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Attach Firebase ID token to every request ──────────────
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
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
      // Force re-login if token expired
      auth.signOut();
    }

    return Promise.reject(new Error(message));
  }
);

// ── Music API ──────────────────────────────────────────────
export const musicApi = {
  search:      (q, limit = 20, offset = 0) =>
    api.get(`/api/music/search`, { params: { q, limit, offset } }),
  suggestions: (q) =>
    api.get(`/api/music/suggestions`, { params: { q } }),
  info:        (id) =>
    api.get(`/api/music/info`, { params: { id } }),
  trending:    () =>
    api.get(`/api/music/trending`),
  streamUrl:   (id) =>
    `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/music/stream?id=${id}`,
};

// ── Auth API ───────────────────────────────────────────────
export const authApi = {
  syncUser:      (idToken, displayName) =>
    api.post(`/api/auth/sync`, { idToken, displayName }),
  getMe:         () => api.get(`/api/auth/me`),
  updateProfile: (data) => api.put(`/api/auth/profile`, data),
};

// ── Playlist API ───────────────────────────────────────────
export const playlistApi = {
  getAll:       () => api.get(`/api/playlist`),
  getOne:       (id) => api.get(`/api/playlist/${id}`),
  create:       (data) => api.post(`/api/playlist`, data),
  update:       (id, data) => api.put(`/api/playlist/${id}`, data),
  delete:       (id) => api.delete(`/api/playlist/${id}`),
  addTrack:     (playlistId, track) =>
    api.post(`/api/playlist/${playlistId}/tracks`, track),
  removeTrack:  (playlistId, youtubeId) =>
    api.delete(`/api/playlist/${playlistId}/tracks/${youtubeId}`),
};

// ── History API ────────────────────────────────────────────
export const historyApi = {
  get:            () => api.get(`/api/history`),
  add:            (data) => api.post(`/api/history`, data),
  getSearches:    () => api.get(`/api/history/search`),
  clear:          () => api.delete(`/api/history`),
};

// ── Library API ────────────────────────────────────────────
export const libraryApi = {
  getLiked:       () => api.get(`/api/library/liked`),
  likeTrack:      (youtubeId, data) =>
    api.post(`/api/library/liked/${youtubeId}`, data),
  unlikeTrack:    (youtubeId) =>
    api.delete(`/api/library/liked/${youtubeId}`),
  getLikedStatus: (youtubeId) =>
    api.get(`/api/library/liked/${youtubeId}/status`),
};

// ── Podcast API ────────────────────────────────────────────
export const podcastApi = {
  getAll:          () => api.get(`/api/podcast`),
  getEpisodes:     (id) => api.get(`/api/podcast/${id}/episodes`),
  getProgress:     (episodeId) => api.get(`/api/podcast/progress/${episodeId}`),
  saveProgress:    (episodeId, data) =>
    api.put(`/api/podcast/progress/${episodeId}`, data),
};

export default api;
