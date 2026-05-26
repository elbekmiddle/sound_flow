// ============================================================
// Obsidian Audio — Chrome Extension Background Service Worker
// Uses Offscreen API for persistent audio playback (MV3)
// ============================================================

const API_BASE = 'http://localhost:5001';   // Change to production URL

let offscreenCreated = false;
let currentTrack = null;
let isPlaying = false;
let volume = 0.8;

// ── Create offscreen document (required for audio in MV3) ──
async function ensureOffscreen() {
  if (offscreenCreated) return;

  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });

  if (existingContexts.length > 0) {
    offscreenCreated = true;
    return;
  }

  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL('offscreen.html'),
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Required for background music playback',
  });

  offscreenCreated = true;
}

// ── Send message to offscreen document ─────────────────────
function toOffscreen(msg) {
  chrome.runtime.sendMessage({ ...msg, target: 'offscreen' });
}

// ── Message handler from popup ──────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target === 'offscreen') return;     // ignore relayed messages

  (async () => {
    switch (msg.type) {

      case 'PLAY': {
        await ensureOffscreen();
        currentTrack = msg.track;
        isPlaying = true;
        const streamUrl = `${API_BASE}/api/music/stream?id=${msg.track.id}`;
        toOffscreen({ type: 'PLAY', url: streamUrl, volume, track: msg.track });
        updateBadge(true);
        sendResponse({ ok: true });
        break;
      }

      case 'PAUSE': {
        isPlaying = false;
        toOffscreen({ type: 'PAUSE' });
        updateBadge(false);
        sendResponse({ ok: true });
        break;
      }

      case 'RESUME': {
        isPlaying = true;
        toOffscreen({ type: 'RESUME' });
        updateBadge(true);
        sendResponse({ ok: true });
        break;
      }

      case 'STOP': {
        isPlaying = false;
        currentTrack = null;
        toOffscreen({ type: 'STOP' });
        updateBadge(false);
        sendResponse({ ok: true });
        break;
      }

      case 'SET_VOLUME': {
        volume = msg.volume;
        toOffscreen({ type: 'SET_VOLUME', volume });
        sendResponse({ ok: true });
        break;
      }

      case 'SEEK': {
        toOffscreen({ type: 'SEEK', pct: msg.pct });
        sendResponse({ ok: true });
        break;
      }

      case 'GET_STATE': {
        sendResponse({ currentTrack, isPlaying, volume });
        break;
      }

      case 'SEARCH': {
        try {
          const token = await getStoredToken();
          const res = await fetch(
            `${API_BASE}/api/music/search?q=${encodeURIComponent(msg.query)}`,
            token ? { headers: { Authorization: `Bearer ${token}` } } : {}
          );
          const data = await res.json();
          sendResponse({ results: data.results || [] });
        } catch {
          sendResponse({ results: [] });
        }
        break;
      }

      case 'LOGIN': {
        // Store token from Firebase auth
        await chrome.storage.local.set({ auth_token: msg.token });
        sendResponse({ ok: true });
        break;
      }

      case 'LOGOUT': {
        await chrome.storage.local.remove(['auth_token']);
        toOffscreen({ type: 'STOP' });
        sendResponse({ ok: true });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();

  return true; // Keep channel open for async
});

// ── Relay progress updates from offscreen → popup ──────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.from === 'offscreen' && msg.type === 'PROGRESS') {
    // Forward to popup if open
    chrome.runtime.sendMessage({ ...msg, target: 'popup' }).catch(() => { });
  }

  if (msg.from === 'offscreen' && msg.type === 'TRACK_ENDED') {
    isPlaying = false;
    updateBadge(false);
    chrome.runtime.sendMessage({ type: 'TRACK_ENDED', target: 'popup' }).catch(() => { });
  }
});

// ── Badge (▶ indicator) ─────────────────────────────────────
function updateBadge(playing) {
  chrome.action.setBadgeText({ text: playing ? '▶' : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#c799ff' });
}

// ── Helpers ─────────────────────────────────────────────────
async function getStoredToken() {
  const data = await chrome.storage.local.get('auth_token');
  return data.auth_token || null;
}

// ── Media Session API (keyboard media keys) ─────────────────
// Handled in offscreen.js
