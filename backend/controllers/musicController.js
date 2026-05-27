/**
 * musicController.js — Sound Flow
 * Primary:  Piped.video API (no cookies, no bot detection)
 * Fallback: yt-dlp with cookies (if all Piped instances fail)
 * Strategy: redirect to direct URL (audio does NOT pass through Render RAM)
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import { cacheGet, cacheSet } from '../config/redis.js';
import { query }              from '../config/database.js';

import fs   from 'fs';
import path from 'path';
import os   from 'os';

const execFileAsync = promisify(execFile);

// ── yt-dlp binary (local Render build or global) ──────────────────────────
const YTDLP_BIN = fs.existsSync(path.resolve('./yt-dlp'))
  ? path.resolve('./yt-dlp')
  : 'yt-dlp';

// ── Cookie file setup (base64 or plain Netscape format) ───────────────────
let COOKIE_FILE = null;
if (process.env.YOUTUBE_COOKIES) {
  COOKIE_FILE = path.join(os.tmpdir(), 'yt_cookies.txt');
  let content = process.env.YOUTUBE_COOKIES.trim();
  if (!content.startsWith('#') && !content.startsWith('.') && !content.includes('\t')) {
    try {
      content = Buffer.from(content, 'base64').toString('utf-8');
      console.log('🍪 YouTube cookies decoded from base64');
    } catch { console.warn('⚠️  Cookie base64 decode failed, using raw'); }
  }
  fs.writeFileSync(COOKIE_FILE, content, 'utf-8');
  console.log('🍪 Cookies loaded from env →', COOKIE_FILE);
} else if (fs.existsSync(path.resolve('./cookies.txt'))) {
  COOKIE_FILE = path.resolve('./cookies.txt');
  console.log('🍪 Cookies loaded from local cookies.txt');
} else {
  console.warn('⚠️  No YouTube cookies — yt-dlp fallback may be blocked on cloud');
}

// ── yt-dlp base args ──────────────────────────────────────────────────────
const ytdlpBaseArgs = () => [
  '-4',
  ...(COOKIE_FILE ? ['--cookies', COOKIE_FILE] : []),
  '--extractor-args', 'youtube:player_client=tv_embedded,android',
  '--no-check-certificates',
  '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

// ── Piped.video instances (public, no auth, no bot detection) ─────────────
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://piped-api.garudalinux.org',
  'https://api.piped.projectsegfau.lt',
  'https://pipedapi.in.projectsegfau.lt',
];

async function getAudioUrlViaPiped(videoId) {
  for (const base of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${base}/streams/${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data = await res.json();

      const streams = (data.audioStreams || [])
        .filter(s => s.mimeType?.includes('audio'))
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      const best = streams[0];
      if (!best?.url) continue;

      console.log(`✅ Piped [${base}] → ${videoId}`);
      return {
        audioUrl:  best.url,
        mimeType:  best.mimeType || 'audio/webm',
        title:     data.title     || '',
        uploader:  data.uploader  || '',
        duration:  data.duration  || 0,
        thumbnail: data.thumbnailUrl || '',
      };
    } catch (e) {
      console.warn(`⚠️  Piped [${base}] failed:`, e.message);
    }
  }
  throw new Error('All Piped instances failed');
}

// ── yt-dlp audio URL extraction ───────────────────────────────────────────
async function getAudioUrlViaYtdlp(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const { stdout } = await execFileAsync(YTDLP_BIN, [
    ...ytdlpBaseArgs(),
    '--no-playlist', '--no-warnings',
    '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
    '--get-url', '--get-filename',
    '-o', '%(title)s|||%(uploader)s|||%(duration)s|||%(thumbnail)s',
    url,
  ], { timeout: 25000 });

  const lines = stdout.trim().split('\n').filter(Boolean);
  const audioUrl = lines[lines.length - 1];
  const meta     = lines.length >= 2 ? lines[lines.length - 2] : '';
  const [title, uploader, duration, thumbnail] = meta.split('|||');
  return { audioUrl, mimeType: 'audio/webm', title, uploader, duration, thumbnail };
}

// ── Helper: set stream redirect headers ───────────────────────────────────
function setStreamHeaders(res, { title, uploader, duration, mimeType } = {}) {
  const origin = res.req?.headers?.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Expose-Headers',
    'X-Track-Title,X-Track-Artist,X-Track-Duration,X-Audio-Type');
  res.setHeader('Vary', 'Origin');
  if (title)    res.setHeader('X-Track-Title',    encodeURIComponent(title));
  if (uploader) res.setHeader('X-Track-Artist',   encodeURIComponent(uploader));
  if (duration) res.setHeader('X-Track-Duration', String(duration));
  if (mimeType) res.setHeader('X-Audio-Type',     mimeType);
}

// ── yt-search lazy loader ─────────────────────────────────────────────────
let _ytSearch;
async function ytSearch(opts) {
  if (!_ytSearch) {
    const m = await import('yt-search');
    _ytSearch = m.default ?? m;
  }
  return _ytSearch(opts);
}

// Duration filters
const MIN_MUSIC = 60, MAX_MUSIC = 900;
const MIN_PODCAST = 300, MAX_PODCAST = 10800;
const isAudio   = v => (v.seconds >= MIN_MUSIC && v.seconds <= MAX_MUSIC) ||
                       (v.seconds >= MIN_PODCAST && v.seconds <= MAX_PODCAST);
const trackType = v => v.seconds > MAX_MUSIC ? 'podcast' : 'music';
const mapVideo  = v => ({
  id: v.videoId, title: v.title,
  artist: v.author?.name || 'Unknown',
  duration: v.seconds, durationStr: v.timestamp,
  thumbnail: v.thumbnail, views: v.views,
  type: trackType(v),
});

// ── Search ────────────────────────────────────────────────────────────────
export async function search(req, res) {
  const q     = req.query.q?.trim();
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const off   = Math.max(parseInt(req.query.offset) || 0, 0);
  if (!q) return res.status(400).json({ error: 'Query required' });

  const ck = `search:v6:${q.toLowerCase()}:${limit}:${off}`;
  const cached = await cacheGet(ck);
  if (cached) return res.json({ results: cached, source: 'cache' });

  try {
    const r = await ytSearch({ query: q, pageStart: 1, pageEnd: 2 });
    const results = (r.videos || []).filter(isAudio).slice(off, off + limit).map(mapVideo);
    await cacheSet(ck, results, 600);
    if (req.userId) {
      query('INSERT INTO search_history (user_id, query, result_count) VALUES ($1,$2,$3)',
        [req.userId, q, results.length]).catch(() => {});
    }
    res.json({ results, total: results.length, query: q });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Search failed. Try again.' });
  }
}

// ── Suggestions ───────────────────────────────────────────────────────────
export async function getSuggestions(req, res) {
  const q = req.query.q?.trim();
  if (!q) return res.json([]);
  const ck = `sugg:v6:${q.toLowerCase()}`;
  const cached = await cacheGet(ck);
  if (cached) return res.json(cached);
  try {
    const r = await ytSearch({ query: q, pageStart: 1, pageEnd: 1 });
    const s = (r.videos || []).filter(isAudio).slice(0, 8)
      .map(v => ({ id: v.videoId, title: v.title, artist: v.author?.name || 'Unknown' }));
    await cacheSet(ck, s, 300);
    res.json(s);
  } catch { res.json([]); }
}

// ── Trending ──────────────────────────────────────────────────────────────
export async function getTrending(req, res) {
  const ck = 'trend:v6';
  const cached = await cacheGet(ck);
  if (cached) return res.json(cached);
  try {
    const r = await ytSearch('trending music 2025');
    const results = (r.videos || [])
      .filter(v => v.seconds >= MIN_MUSIC && v.seconds <= MAX_MUSIC)
      .slice(0, 24).map(mapVideo);
    await cacheSet(ck, results, 1800);
    res.json(results);
  } catch { res.status(500).json({ error: 'Failed to get trending.' }); }
}

// ── Recommendations ───────────────────────────────────────────────────────
export async function getRecommendations(req, res) {
  if (!req.userId) return res.json([]);
  const hist = await query(
    'SELECT query FROM search_history WHERE user_id=$1 ORDER BY searched_at DESC LIMIT 5',
    [req.userId]
  ).catch(() => ({ rows: [] }));

  const queries = hist.rows.map(r => r.query);
  if (!queries.length) return getTrending(req, res);

  const ck = `rec:v6:${req.userId}:${queries[0]}`;
  const cached = await cacheGet(ck);
  if (cached) return res.json(cached);

  try {
    const r = await ytSearch(`${queries[0]} music`);
    const results = (r.videos || [])
      .filter(v => v.seconds >= MIN_MUSIC && v.seconds <= MAX_MUSIC)
      .slice(0, 12).map(mapVideo);
    await cacheSet(ck, results, 1200);
    res.json(results);
  } catch { res.json([]); }
}

// ── Stream — Piped primary → yt-dlp fallback → 302 redirect ──────────────
export async function stream(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID required' });
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return res.status(400).json({ error: 'Invalid ID' });

  // 1. Try cache first
  const urlKey = `audio_url:v3:${id}`;
  const cached = await cacheGet(urlKey);
  if (cached?.audioUrl) {
    console.log(`🎵 Stream [cache] → ${id}`);
    setStreamHeaders(res, cached);
    return res.redirect(302, cached.audioUrl);
  }

  // 2. Try Piped instances (primary — no YouTube bot detection)
  try {
    const info = await getAudioUrlViaPiped(id);
    await cacheSet(urlKey, info, 3600 * 4); // cache 4 hours
    console.log(`🎵 Stream [piped] → ${id}`);
    setStreamHeaders(res, info);
    return res.redirect(302, info.audioUrl);
  } catch (pipedErr) {
    console.warn(`⚠️  Piped failed for ${id}:`, pipedErr.message);
  }

  // 3. Fallback: yt-dlp (requires valid cookies on cloud)
  try {
    const info = await getAudioUrlViaYtdlp(id);
    await cacheSet(urlKey, info, 3600 * 4);
    console.log(`🎵 Stream [yt-dlp] → ${id}`);
    setStreamHeaders(res, info);
    return res.redirect(302, info.audioUrl);
  } catch (ytErr) {
    console.error(`❌ All sources failed for ${id}:`, ytErr.message);
    return res.status(451).json({
      error: 'Track unavailable — bot detection or geo-restriction',
      hint:  'Set YOUTUBE_COOKIES env var on Render for yt-dlp fallback',
    });
  }
}

// ── Info ──────────────────────────────────────────────────────────────────
export async function getInfo(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID required' });

  const ck = `info:v6:${id}`;
  const cached = await cacheGet(ck);
  if (cached) return res.json(cached);

  // Try Piped first for metadata (faster, no bot detection)
  for (const base of PIPED_INSTANCES) {
    try {
      const r = await fetch(`${base}/streams/${id}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok) continue;
      const d = await r.json();
      const track = {
        id,
        title:     d.title     || 'Unknown',
        artist:    d.uploader  || 'Unknown',
        duration:  d.duration  || 0,
        thumbnail: d.thumbnailUrl || '',
      };
      query(`INSERT INTO tracks (youtube_id,title,artist,duration,thumbnail_url)
        VALUES ($1,$2,$3,$4,$5) ON CONFLICT (youtube_id) DO UPDATE SET updated_at=NOW()`,
        [id, track.title, track.artist, track.duration, track.thumbnail]).catch(() => {});
      await cacheSet(ck, track, 3600);
      return res.json(track);
    } catch { continue; }
  }

  // Fallback: yt-dlp
  try {
    const { stdout } = await execFileAsync(YTDLP_BIN, [
      ...ytdlpBaseArgs(),
      '--no-playlist', '--no-warnings',
      '-j', `https://www.youtube.com/watch?v=${id}`,
    ], { timeout: 15000 });
    const d = JSON.parse(stdout.trim());
    const track = {
      id,
      title:     d.title,
      artist:    d.uploader || d.channel || 'Unknown',
      duration:  d.duration || 0,
      thumbnail: d.thumbnail,
    };
    query(`INSERT INTO tracks (youtube_id,title,artist,duration,thumbnail_url)
      VALUES ($1,$2,$3,$4,$5) ON CONFLICT (youtube_id) DO UPDATE SET updated_at=NOW()`,
      [id, track.title, track.artist, track.duration, track.thumbnail]).catch(() => {});
    await cacheSet(ck, track, 3600);
    res.json(track);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get track info' });
  }
}
