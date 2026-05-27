/**
 * musicController.js — Sound Flow
 * Streaming via yt-dlp (direct pipe, piped removed)
 */
import { spawn, execFile } from 'child_process';
import { promisify }       from 'util';
import { cacheGet, cacheSet } from '../config/redis.js';
import { query }              from '../config/database.js';

import fs from 'fs';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

// Check if local yt-dlp exists (for Render), otherwise use global
const YTDLP_BIN = fs.existsSync(path.resolve('./yt-dlp')) ? path.resolve('./yt-dlp') : 'yt-dlp';

// Write YouTube cookies from env var to a temp file (once at startup)
let COOKIE_FILE = null;
if (process.env.YOUTUBE_COOKIES) {
  COOKIE_FILE = path.join(os.tmpdir(), 'yt_cookies.txt');
  let cookieContent = process.env.YOUTUBE_COOKIES.trim();
  if (!cookieContent.startsWith('#') && !cookieContent.startsWith('.') && !cookieContent.includes('\t')) {
    try {
      cookieContent = Buffer.from(cookieContent, 'base64').toString('utf-8');
      console.log('🍪 YouTube cookies decoded from base64');
    } catch {
      console.warn('⚠️  Cookie base64 decode failed, using raw value');
    }
  }
  fs.writeFileSync(COOKIE_FILE, cookieContent, 'utf-8');
  console.log('🍪 YouTube cookies loaded from env →', COOKIE_FILE);
} else if (fs.existsSync(path.resolve('./cookies.txt'))) {
  COOKIE_FILE = path.resolve('./cookies.txt');
  console.log('🍪 YouTube cookies loaded from local file');
} else {
  console.warn('⚠️  No YouTube cookies found — bot detection may block streams on cloud');
}

// Build base yt-dlp args (with cookies + strong bot-bypass settings)
const ytdlpBaseArgs = () => [
  '-4',
  ...(COOKIE_FILE ? ['--cookies', COOKIE_FILE] : []),
  '--extractor-args', 'youtube:player_client=tv_embedded,android',
  '--no-check-certificates',
  '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

let _ytSearch;
async function ytSearch(opts) {
  if (!_ytSearch) {
    const m = await import('yt-search');
    _ytSearch = m.default ?? m;
  }
  return _ytSearch(opts);
}

// Duration filters (seconds)
const MIN_MUSIC = 60, MAX_MUSIC = 900;
const MIN_PODCAST = 300, MAX_PODCAST = 10800;

const isAudio   = v => (v.seconds >= MIN_MUSIC && v.seconds <= MAX_MUSIC) ||
                       (v.seconds >= MIN_PODCAST && v.seconds <= MAX_PODCAST);
const trackType = v => v.seconds > MAX_MUSIC ? 'podcast' : 'music';

const mapVideo = v => ({
  id: v.videoId, title: v.title,
  artist: v.author?.name || 'Unknown',
  duration: v.seconds, durationStr: v.timestamp,
  thumbnail: v.thumbnail, views: v.views,
  type: trackType(v),
});

// ── Search ───────────────────────────────────────────────────────────────
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

// ── Suggestions ──────────────────────────────────────────────────────────
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

// ── Trending ─────────────────────────────────────────────────────────────
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
  } catch (err) {
    res.status(500).json({ error: 'Failed to get trending.' });
  }
}

// ── Recommendations ──────────────────────────────────────────────────────
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

// ── Get Audio URL (for redirect) ──────────────────────────────────────────
async function getAudioUrl(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const { stdout } = await execFileAsync(YTDLP_BIN, [
    ...ytdlpBaseArgs(),
    '--no-playlist', '--no-warnings',
    '-f', 'bestaudio/best',
    '--get-url', '--get-filename',
    '-o', '%(title)s|||%(uploader)s|||%(duration)s',
    url,
  ], { timeout: 25000 });

  const lines = stdout.trim().split('\n').filter(Boolean);
  const audioUrl = lines[lines.length - 1];
  const meta     = lines.length >= 2 ? lines[lines.length - 2] : '';
  const [title, uploader, duration] = meta.split('|||');
  return { audioUrl, title, uploader, duration };
}

// ── Stream ────────────────────────────────────────────────────────────────
export async function stream(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID required' });
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return res.status(400).json({ error: 'Invalid ID' });

  const ytUrl = `https://www.youtube.com/watch?v=${id}`;
  
  // 1. Check cached URL
  const urlCacheKey = `audio_url:v5:${id}`;
  const cachedUrl = await cacheGet(urlCacheKey);
  if (cachedUrl?.url) {
    console.log(`🎵 Stream [cache redirect] → ${id}`);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.redirect(302, cachedUrl.url);
  }

  // 2. Fetch new URL and redirect
  try {
    const { audioUrl, title, uploader, duration } = await getAudioUrl(id);
    console.log(`🎵 Stream [yt-dlp redirect] → ${id}`);
    // YouTube URLs expire in ~6 hours, cache for 5 hours
    await cacheSet(urlCacheKey, { url: audioUrl }, 3600 * 5);
    
    // Also cache metadata for getInfo / next stream calls
    if (title) await cacheSet(`meta:v3:${id}`, { title, uploader, duration }, 3600 * 6);
    
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.redirect(302, audioUrl);
  } catch (err) {
    console.warn(`⚠️  yt-dlp URL fetch failed for ${id}, falling back to direct pipe:`, err.message);
  }

  // 3. Fallback: direct pipe (legacy mode if URL extraction fails)
  const metaKey = `meta:v3:${id}`;
  let title = '', uploader = '', duration = '';
  try {
    const cached = await cacheGet(metaKey);
    if (cached) ({ title, uploader, duration } = cached);
  } catch {}

  // Set response headers
  const origin = req.headers.origin || '*';
  res.setHeader('Content-Type', 'audio/webm');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
  if (title)    res.setHeader('X-Track-Title',    encodeURIComponent(title));
  if (uploader) res.setHeader('X-Track-Artist',   encodeURIComponent(uploader));
  if (duration) res.setHeader('X-Track-Duration', duration);

  const ytdlpArgs = [
    ...ytdlpBaseArgs(),
    '--quiet', '--no-warnings', '--no-playlist',
    '-f', 'bestaudio/best',
    '-o', '-',
    ytUrl,
  ];

  console.log(`🎵 Stream [fallback pipe]: ${id}`);
  const ytdlp = spawn(YTDLP_BIN, ytdlpArgs);

  ytdlp.stdout.pipe(res);

  ytdlp.stderr.on('data', (chunk) => {
    const msg = chunk.toString().trim();
    if (msg && !msg.startsWith('[download]')) console.error(`yt-dlp [${id}]:`, msg);
  });

  ytdlp.on('close', (code) => {
    if (code !== 0 && code !== null && !res.writableEnded) {
      if (!res.headersSent) res.status(451).json({ error: 'Video cannot be streamed' });
    }
  });

  req.on('close', () => {
    try { ytdlp.kill('SIGTERM'); } catch {}
  });
}

// ── Info ─────────────────────────────────────────────────────────────────
export async function getInfo(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID required' });
  const cached = await cacheGet(`info:v6:${id}`);
  if (cached) return res.json(cached);
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
      [id, track.title, track.artist, track.duration, track.thumbnail]).catch(()=>{});
    await cacheSet(`info:v6:${id}`, track, 3600);
    res.json(track);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get info' });
  }
}
