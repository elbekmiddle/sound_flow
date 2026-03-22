import axios from 'axios';

const API_BASE = (() => {
  const raw = import.meta.env.VITE_API_URL || '';
  if (!raw) return window?.location?.origin || 'http://localhost:5000';
  // Auto-upgrade http→https when page is served over HTTPS
  if (window?.location?.protocol === 'https:') return raw.replace(/^http:\/\//, 'https://');
  return raw;
})();

const TOKEN_KEY = 'obsidian_token';

export const getToken  = () => localStorage.getItem(TOKEN_KEY);
export const setToken  = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const api = axios.create({ baseURL: API_BASE, timeout: 15000, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (r) => r.data,
  (err) => {
    if (err.response?.status === 401) { clearToken(); window.location.href = '/login'; }
    return Promise.reject(new Error(err.response?.data?.error || err.message || 'Request failed'));
  }
);

export { API_BASE };

/* ── Auth ─────────────────────────────────────── */
export const authApi = {
  register:       (d) => api.post('/api/auth/register', d),
  login:          (d) => api.post('/api/auth/login', d),
  me:             ()  => api.get('/api/auth/me'),
  update:         (d) => api.put('/api/auth/profile', d),
  forgotPassword: (e) => api.post('/api/auth/forgot-password', { email: e }),
  resetPassword:  (d) => api.post('/api/auth/reset-password', d),
  verifyEmail:    (t) => api.post('/api/auth/verify-email', { token: t }),
};

/* ── Music ────────────────────────────────────── */
export const musicApi = {
  search:      (q, limit = 20, offset = 0) => api.get('/api/music/search', { params: { q, limit, offset } }),
  suggestions: (q)  => api.get('/api/music/suggestions', { params: { q } }),
  info:        (id) => api.get('/api/music/info', { params: { id } }),
  trending:    ()   => api.get('/api/music/trending'),
  streamUrl:   (id) => `${API_BASE}/api/music/stream?id=${id}`,
};

/* ── Playlist ─────────────────────────────────── */
export const playlistApi = {
  getAll:      ()             => api.get('/api/playlist'),
  getOne:      (id)           => api.get(`/api/playlist/${id}`),
  create:      (d)            => api.post('/api/playlist', d),
  update:      (id, d)        => api.put(`/api/playlist/${id}`, d),
  delete:      (id)           => api.delete(`/api/playlist/${id}`),
  addTrack:    (pid, track)   => api.post(`/api/playlist/${pid}/tracks`, track),
  removeTrack: (pid, ytId)    => api.delete(`/api/playlist/${pid}/tracks/${ytId}`),
};

/* ── History ──────────────────────────────────── */
export const historyApi = {
  get:         () => api.get('/api/history'),
  add:         (d) => api.post('/api/history', d),
  getSearches: () => api.get('/api/history/search'),
  clear:       () => api.delete('/api/history'),
};

/* ── Library ──────────────────────────────────── */
export const libraryApi = {
  getLiked:    ()           => api.get('/api/library/liked'),
  likeTrack:   (id, d)      => api.post(`/api/library/liked/${id}`, d),
  unlikeTrack: (id)         => api.delete(`/api/library/liked/${id}`),
};

/* ── Podcast ──────────────────────────────────── */
export const podcastApi = {
  getAll:       ()    => api.get('/api/podcast'),
  getEpisodes:  (id)  => api.get(`/api/podcast/${id}/episodes`),
  getProgress:  (eid) => api.get(`/api/podcast/progress/${eid}`),
  saveProgress: (eid, d) => api.put(`/api/podcast/progress/${eid}`, d),
};

export default api;
