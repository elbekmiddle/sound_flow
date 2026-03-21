// ============================================================
// Obsidian Audio — Offscreen Audio Engine
// Runs in persistent offscreen document for MV3 background audio
// ============================================================

const audio = new Audio();
audio.preload = 'metadata';
let currentTrack = null;

// ── Receive commands from background.js ────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.target !== 'offscreen') return;

  switch (msg.type) {

    case 'PLAY':
      currentTrack = msg.track;
      audio.src    = msg.url;
      audio.volume = msg.volume ?? 0.8;
      audio.play().then(() => {
        updateMediaSession(msg.track);
      }).catch(err => {
        console.error('Offscreen play error:', err);
      });
      break;

    case 'PAUSE':
      audio.pause();
      break;

    case 'RESUME':
      audio.play().catch(() => {});
      break;

    case 'STOP':
      audio.pause();
      audio.src    = '';
      currentTrack = null;
      clearMediaSession();
      break;

    case 'SET_VOLUME':
      audio.volume = msg.volume;
      break;

    case 'SEEK':
      if (audio.duration) {
        audio.currentTime = (msg.pct / 100) * audio.duration;
      }
      break;
  }
});

// ── Progress updates → background.js ───────────────────────
audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  chrome.runtime.sendMessage({
    from:     'offscreen',
    type:     'PROGRESS',
    currentTime: audio.currentTime,
    duration:    audio.duration,
    pct:         (audio.currentTime / audio.duration) * 100,
  });
});

audio.addEventListener('ended', () => {
  chrome.runtime.sendMessage({ from: 'offscreen', type: 'TRACK_ENDED' });
  clearMediaSession();
});

audio.addEventListener('error', (e) => {
  console.error('Audio error:', e);
  chrome.runtime.sendMessage({ from: 'offscreen', type: 'AUDIO_ERROR' });
});

// ── Media Session API (keyboard / OS media controls) ───────
function updateMediaSession(track) {
  if (!navigator.mediaSession || !track) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title:  track.title  || 'Unknown Track',
    artist: track.artist || 'Unknown Artist',
    artwork: track.thumbnail ? [{ src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' }] : [],
  });

  navigator.mediaSession.playbackState = 'playing';

  navigator.mediaSession.setActionHandler('play',         () => { audio.play(); });
  navigator.mediaSession.setActionHandler('pause',        () => { audio.pause(); });
  navigator.mediaSession.setActionHandler('previoustrack', () => {
    chrome.runtime.sendMessage({ from: 'offscreen', type: 'PREV' });
  });
  navigator.mediaSession.setActionHandler('nexttrack', () => {
    chrome.runtime.sendMessage({ from: 'offscreen', type: 'NEXT' });
  });
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (details.seekTime && audio.duration) {
      audio.currentTime = details.seekTime;
    }
  });
}

function clearMediaSession() {
  if (!navigator.mediaSession) return;
  navigator.mediaSession.playbackState  = 'none';
  navigator.mediaSession.metadata       = null;
}
