/**
 * musicController.js — Sound Flow
 * Streaming via yt-dlp (more reliable than ytdl-core against YouTube bot detection)
 */
import { spawn, execFile } from 'child_process';
import { promisify }       from 'util';
import { cacheGet, cacheSet } from '../config/redis.js';
import { query }              from '../config/database.js';

import fs from 'fs';
import path from 'path';

const execFileAsync = promisify(execFile);

// Check if local yt-dlp exists (for Render), otherwise use global
const YTDLP_BIN = fs.existsSync(path.resolve('./yt-dlp')) ? path.resolve('./yt-dlp') : 'yt-dlp';

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

// ── Get best audio URL via yt-dlp ────────────────────────────────────────
async function getAudioUrl(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const { stdout } = await execFileAsync(YTDLP_BIN, [
      '--no-playlist',
      '--no-warnings',
      '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
      '--get-url',
      '--get-filename',
      '-o', '%(title)s|||%(uploader)s|||%(duration)s|||%(thumbnail)s',
      url,
    ], { timeout: 20000 });

    const lines = stdout.trim().split('\n').filter(Boolean);
    // Last line is the URL, second to last may be filename
    const audioUrl = lines[lines.length - 1];
    const meta     = lines.length >= 2 ? lines[lines.length - 2] : '';
    const [title, uploader, duration, thumbnail] = meta.split('|||');
    return { audioUrl, title, uploader, duration, thumbnail };
  } catch (err) {
    throw new Error(`yt-dlp failed: ${err.message}`);
  }
}

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

// ── Stream ────────────────────────────────────────────────────────────────
export async function stream(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID required' });
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return res.status(400).json({ error: 'Invalid ID' });

  const ytUrl = `https://www.youtube.com/watch?v=${id}`;

  // Fetch metadata for headers (cached)
  const metaKey = `meta:v3:${id}`;
  let title = '', uploader = '', duration = '';
  try {
    const cached = await cacheGet(metaKey);
    if (cached) {
      ({ title, uploader, duration } = cached);
    } else {
      const { stdout: metaOut } = await execFileAsync(YTDLP_BIN, [
        '--quiet', '--no-warnings', '--no-playlist',
        '--print', '%(title)s\n%(uploader)s\n%(duration)s',
        ytUrl,
      ], { timeout: 12000 });
      const [t, u, d] = metaOut.trim().split('\n');
      title = t || ''; uploader = u || ''; duration = d || '';
      await cacheSet(metaKey, { title, uploader, duration }, 3600 * 6);
    }
  } catch { /* metadata is optional, continue streaming */ }

  // Set response headers
  res.setHeader('Content-Type', 'audio/webm');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (title)    res.setHeader('X-Track-Title',    encodeURIComponent(title));
  if (uploader) res.setHeader('X-Track-Artist',   encodeURIComponent(uploader));
  if (duration) res.setHeader('X-Track-Duration', duration);

  // Spawn yt-dlp and pipe audio directly to response
  const ytdlpArgs = [
    '--quiet',
    '--no-warnings',
    '--no-playlist',
    '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/bestaudio*',
    '-o', '-',
    ytUrl,
  ];

  console.log(`🎵 Streaming: ${id}`);
  const ytdlp = spawn(YTDLP_BIN, ytdlpArgs);

  let headersSent = false;
  ytdlp.stdout.once('data', () => {
    if (!headersSent) { headersSent = true; }
  });

  ytdlp.stdout.pipe(res);

  ytdlp.stderr.on('data', (chunk) => {
    const msg = chunk.toString().trim();
    if (msg && !msg.startsWith('[download]')) {
      console.error(`yt-dlp [${id}]:`, msg);
    }
  });

  ytdlp.on('close', (code) => {
    if (code !== 0 && code !== null && !res.writableEnded) {
      console.error(`yt-dlp exited with code ${code} for ${id}`);
      if (!res.headersSent) res.status(451).json({ error: 'Video cannot be streamed' });
    }
  });

  ytdlp.on('error', (err) => {
    console.error('yt-dlp spawn error:', err.message);
    if (!res.headersSent) res.status(500).end();
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
