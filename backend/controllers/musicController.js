/**
 * musicController.js — Sound Flow
 * Streaming via youtubei.js (InnerTube API — no bot detection issues)
 * Search via yt-search (scrapes YouTube search results)
 */
import { spawn, execFile } from 'child_process';
import { promisify }       from 'util';
import { cacheGet, cacheSet } from '../config/redis.js';
import { query }              from '../config/database.js';
import { Innertube }          from 'youtubei.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

// ── youtubei.js singleton ─────────────────────────────────────────────────
let _innertube = null;
async function getInnertube() {
  if (!_innertube) {
    _innertube = await Innertube.create({
      cache: undefined,
      generate_session_locally: true,
    });
    console.log('🎬 youtubei.js InnerTube initialized');
  }
  return _innertube;
}
// Initialize eagerly at startup
getInnertube().catch(err => console.error('InnerTube init error:', err.message));

// ── yt-search (for search results) ───────────────────────────────────────
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

// ── Stream via youtubei.js ────────────────────────────────────────────────
export async function stream(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID required' });
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return res.status(400).json({ error: 'Invalid ID' });

  console.log(`🎵 Streaming: ${id}`);

  try {
    const yt   = await getInnertube();
    const info = await yt.getInfo(id);

    const title    = info.basic_info?.title    || '';
    const uploader = info.basic_info?.author   || '';
    const duration = info.basic_info?.duration || '';

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
    if (duration) res.setHeader('X-Track-Duration', String(duration));

    // Stream audio directly
    const audioStream = await yt.download(id, {
      type:    'audio',
      quality: 'best',
      format:  'webm',
    });

    // Pipe ReadableStream to Express response
    const { Readable } = await import('stream');
    const nodeStream = Readable.fromWeb
      ? Readable.fromWeb(audioStream)
      : Readable.from(audioStream);

    nodeStream.pipe(res);

    req.on('close', () => {
      try { nodeStream.destroy(); } catch {}
    });

    nodeStream.on('error', (err) => {
      console.error(`Stream error [${id}]:`, err.message);
      if (!res.headersSent) res.status(500).end();
    });

  } catch (err) {
    console.error(`youtubei.js stream error [${id}]:`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream audio. Try again.' });
    }
  }
}

// ── Info via youtubei.js ──────────────────────────────────────────────────
export async function getInfo(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID required' });

  const cached = await cacheGet(`info:v6:${id}`);
  if (cached) return res.json(cached);

  try {
    const yt   = await getInnertube();
    const info = await yt.getInfo(id);
    const b    = info.basic_info;

    const track = {
      id,
      title:     b?.title    || 'Unknown',
      artist:    b?.author   || 'Unknown',
      duration:  b?.duration || 0,
      thumbnail: b?.thumbnail?.[0]?.url || '',
    };

    query(
      `INSERT INTO tracks (youtube_id,title,artist,duration,thumbnail_url)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (youtube_id) DO UPDATE SET updated_at=NOW()`,
      [id, track.title, track.artist, track.duration, track.thumbnail]
    ).catch(() => {});

    await cacheSet(`info:v6:${id}`, track, 3600);
    res.json(track);
  } catch (err) {
    console.error(`getInfo error [${id}]:`, err.message);
    res.status(500).json({ error: 'Failed to get info' });
  }
}
