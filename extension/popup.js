// ============================================================
// Obsidian Audio — Popup Script
// ============================================================

const API_BASE = 'http://localhost:5001';

let state = {
  isPlaying: false,
  currentTrack: null,
  queue: [],
  queueIndex: 0,
  shuffle: false,
  liked: new Set(),
};

// ── DOM refs ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const views = {
  login: $('view-login'),
  player: $('view-player'),
  search: $('view-search'),
};

// ── Init ─────────────────────────────────────────────────────
async function init() {
  const { auth_token, liked_ids } = await chrome.storage.local.get(['auth_token', 'liked_ids']);

  if (liked_ids) state.liked = new Set(liked_ids);

  if (auth_token) {
    showView('player');
    // Get current playback state from background
    const bgState = await sendMsg({ type: 'GET_STATE' });
    if (bgState) {
      state.isPlaying = bgState.isPlaying;
      state.currentTrack = bgState.currentTrack;
      updatePlayerUI();
    }
    loadRecentSearches();
  } else {
    showView('login');
  }
}

// ── View management ──────────────────────────────────────────
function showView(name) {
  Object.values(views).forEach(v => v.classList.remove('show'));
  views[name]?.classList.add('show');
}

function switchTab(tab) {
  ['home', 'search', 'queue'].forEach(t => {
    $(`tab-${t}`)?.classList.toggle('active', t === tab);
  });
  if (tab === 'search') showView('search');
  else showView('player');
}

// ── LOGIN ────────────────────────────────────────────────────
$('login-btn').addEventListener('click', handleLogin);
$('login-password').addEventListener('keydown', e => e.key === 'Enter' && handleLogin());

async function handleLogin() {
  const email = $('login-email').value.trim();
  const password = $('login-password').value;
  const errEl = $('login-err');
  const btn = $('login-btn');

  if (!email || !password) { errEl.textContent = 'Please fill in all fields'; return; }
  errEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Signing in...';

  try {
    // Use our backend JWT directly (no Firebase SDK in extension)
    const res = await fetch(`${API_BASE}/api/auth/login-jwt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Login failed');

    await chrome.storage.local.set({ auth_token: data.token });
    await sendMsg({ type: 'LOGIN', token: data.token });
    showView('player');
  } catch (err) {
    errEl.textContent = err.message || 'Sign in failed';
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

// ── LOGOUT ───────────────────────────────────────────────────
$('logout-btn').addEventListener('click', async () => {
  await chrome.storage.local.remove(['auth_token']);
  await sendMsg({ type: 'LOGOUT' });
  showView('login');
});

// ── PLAY CONTROLS ────────────────────────────────────────────
$('play-btn').addEventListener('click', async () => {
  if (!state.currentTrack) return;
  if (state.isPlaying) {
    await sendMsg({ type: 'PAUSE' });
    state.isPlaying = false;
  } else {
    await sendMsg({ type: 'RESUME' });
    state.isPlaying = true;
  }
  updatePlayButton();
});

$('prev-btn').addEventListener('click', async () => {
  if (state.queue.length === 0) return;
  state.queueIndex = Math.max(0, state.queueIndex - 1);
  playTrack(state.queue[state.queueIndex]);
});

$('next-btn').addEventListener('click', async () => {
  if (state.queue.length === 0) return;
  const next = state.shuffle
    ? Math.floor(Math.random() * state.queue.length)
    : (state.queueIndex + 1) % state.queue.length;
  state.queueIndex = next;
  playTrack(state.queue[next]);
});

$('shuffle-btn').addEventListener('click', () => {
  state.shuffle = !state.shuffle;
  $('shuffle-btn').classList.toggle('active', state.shuffle);
});

$('like-btn').addEventListener('click', toggleLike);

$('progress-bar').addEventListener('input', (e) => {
  sendMsg({ type: 'SEEK', pct: parseFloat(e.target.value) });
});

// ── Play a track ─────────────────────────────────────────────
async function playTrack(track, queue) {
  if (queue) { state.queue = queue; state.queueIndex = queue.findIndex(t => t.id === track.id); }
  state.currentTrack = track;
  state.isPlaying = true;
  updatePlayerUI();
  await sendMsg({ type: 'PLAY', track });
}

// ── SEARCH ───────────────────────────────────────────────────
let searchTimeout;
$('search-input').addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  const q = e.target.value.trim();
  if (!q) { $('search-results').innerHTML = ''; return; }

  searchTimeout = setTimeout(() => doSearch(q), 350);
});

async function doSearch(q) {
  const container = $('search-results');
  container.innerHTML = '<div style="text-align:center;padding:20px;color:#adaaaa">Searching...</div>';

  try {
    const results = await sendMsg({ type: 'SEARCH', query: q });
    renderResults(results.results || []);

    // Save to recent
    const { recent } = await chrome.storage.local.get('recent');
    const newRecent = [q, ...(recent || []).filter(x => x !== q)].slice(0, 8);
    await chrome.storage.local.set({ recent: newRecent });
  } catch {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:#ff6e84">Search failed</div>';
  }
}

function renderResults(results) {
  const container = $('search-results');

  if (!results.length) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:#adaaaa">No results found</div>';
    return;
  }

  container.innerHTML = '';
  results.forEach(track => {
    const row = document.createElement('div');
    row.className = 'result-row';
    row.innerHTML = `
      <div class="result-thumb">
        ${track.thumbnail
        ? `<img src="${track.thumbnail}" alt="${track.title}">`
        : '<span class="icon fill" style="color:#adaaaa;font-size:18px">music_note</span>'
      }
      </div>
      <div class="result-info">
        <div class="result-title">${track.title}</div>
        <div class="result-artist">${track.artist}</div>
      </div>
      <div class="result-dur">${formatTime(track.duration)}</div>`;

    row.addEventListener('click', () => {
      playTrack(track, results);
      switchTab('home');
    });
    container.appendChild(row);
  });
}

async function loadRecentSearches() {
  const { recent } = await chrome.storage.local.get('recent');
  if (!recent?.length) return;
  // Show recent in search on focus
}

// ── UI Updates ───────────────────────────────────────────────
function updatePlayerUI() {
  const track = state.currentTrack;

  $('track-name').textContent = track?.title || 'Not playing';
  $('track-artist').textContent = track?.artist || 'Select a track to play';

  const artContainer = $('art-container');
  if (track?.thumbnail) {
    artContainer.innerHTML = `<img src="${track.thumbnail}" alt="${track.title}"/>`;
  } else {
    artContainer.innerHTML = `<div class="placeholder"><span class="icon fill">album</span></div>`;
  }

  updatePlayButton();
  updateLikeButton();
}

function updatePlayButton() {
  const icon = $('play-btn').querySelector('.icon');
  icon.textContent = state.isPlaying ? 'pause' : 'play_arrow';
}

function updateLikeButton() {
  const track = state.currentTrack;
  if (!track) return;
  const liked = state.liked.has(track.id);
  const icon = $('like-btn').querySelector('.icon');
  icon.textContent = liked ? 'favorite' : 'favorite_border';
  icon.style.color = liked ? '#ff94a4' : '';
  $('like-btn').classList.toggle('active', liked);
}

async function toggleLike() {
  if (!state.currentTrack) return;
  const id = state.currentTrack.id;
  if (state.liked.has(id)) {
    state.liked.delete(id);
  } else {
    state.liked.add(id);
  }
  await chrome.storage.local.set({ liked_ids: [...state.liked] });
  updateLikeButton();
}

// ── Progress listener ────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.target !== 'popup') return;

  if (msg.type === 'PROGRESS') {
    const pct = Math.round(msg.pct || 0);
    const bar = $('progress-bar');
    bar.value = pct;
    bar.style.setProperty('--p', pct + '%');
    $('time-cur').textContent = formatTime(msg.currentTime);
    $('time-tot').textContent = formatTime(msg.duration);
  }

  if (msg.type === 'TRACK_ENDED') {
    state.isPlaying = false;
    updatePlayButton();
  }
});

// ── Helpers ──────────────────────────────────────────────────
function sendMsg(msg) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (response) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve(response);
    });
  });
}

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
}

// ── Boot ─────────────────────────────────────────────────────
init();
