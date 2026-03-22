/**
 * musicController.js — Sound Flow
 * @distube/ytdl-core with proper headers to bypass age/sign-in restrictions
 */
import ytdl from '@distube/ytdl-core';
import { cacheGet, cacheSet } from '../config/redis.js';
import { query }              from '../config/database.js';

let _ytSearch;
async function ytSearch(opts) {
  if (!_ytSearch) {
    const m = await import('yt-search');
    _ytSearch = m.default ?? m;
  }
  return _ytSearch(opts);
}

// ── Request headers to look like a real browser ────────────────────────────
const YT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
};

const YTDL_OPTS = {
  requestOptions: { headers: YT_HEADERS },
};

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

// ── Search ─────────────────────────────────────────────────────────────────
export async function search(req, res) {
  const q     = req.query.q?.trim();
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const off   = Math.max(parseInt(req.query.offset) || 0, 0);
  if (!q) return res.status(400).json({ error: 'Query required' });

  const ck = `search:v5:${q.toLowerCase()}:${limit}:${off}`;
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
  const ck = `sugg:v5:${q.toLowerCase()}`;
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
  const ck = 'trend:v5';
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

// ── Recommendations (based on search history) ─────────────────────────────
export async function getRecommendations(req, res) {
  if (!req.userId) return res.json([]);
  const hist = await query(
    'SELECT query FROM search_history WHERE user_id=$1 ORDER BY searched_at DESC LIMIT 5',
    [req.userId]
  ).catch(() => ({ rows: [] }));

  const queries = hist.rows.map(r => r.query);
  if (!queries.length) return getTrending(req, res);

  const ck = `rec:v5:${req.userId}:${queries[0]}`;
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

  const url = `https://www.youtube.com/watch?v=${id}`;

  try {
    const info = await ytdl.getInfo(url, YTDL_OPTS);
    const details = info.videoDetails;

    // Check duration — skip videos that are too short (likely not music)
    const duration = parseInt(details.lengthSeconds || '0');
    if (duration < 30) {
      return res.status(400).json({ error: 'Video too short to stream as audio' });
    }

    // Format priority: opus (best for streaming) → webm audio → mp4 audio → any audio
    const formats = info.formats.filter(f => f.hasAudio);
    let format =
      formats.find(f => f.audioCodec?.includes('opus') && !f.hasVideo)   ||
      formats.find(f => f.container === 'webm' && !f.hasVideo)            ||
      formats.find(f => f.container === 'mp4'  && !f.hasVideo)            ||
      formats.find(f => !f.hasVideo)                                       ||
      formats.sort((a,b) => (parseInt(b.audioBitrate)||0) - (parseInt(a.audioBitrate)||0))[0];

    if (!format) {
      return res.status(451).json({ error: 'No streamable audio format for this video' });
    }

    const mimeType  = format.mimeType?.split(';')[0] || 'audio/webm';
    const cLen      = format.contentLength ? parseInt(format.contentLength) : null;

    res.setHeader('Content-Type',   mimeType);
    res.setHeader('Accept-Ranges',  'bytes');
    res.setHeader('Cache-Control',  'public, max-age=1800');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Track-Title',  encodeURIComponent(details.title));
    res.setHeader('X-Track-Artist', encodeURIComponent(details.author?.name || ''));
    res.setHeader('X-Track-Duration', details.lengthSeconds || '0');
    if (cLen) res.setHeader('Content-Length', cLen);

    // Range support for seeking
    const rangeHeader = req.headers.range;
    let dlOpts = { ...YTDL_OPTS, format };

    if (rangeHeader && cLen) {
      const [s, e] = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(s, 10);
      const end   = e ? parseInt(e, 10) : cLen - 1;
      res.status(206);
      res.setHeader('Content-Range',  `bytes ${start}-${end}/${cLen}`);
      res.setHeader('Content-Length', end - start + 1);
      dlOpts.range = { start, end };
    }

    const audioStream = ytdl.downloadFromInfo(info, dlOpts);
    audioStream.on('error', err => {
      console.error('Stream pipe error:', err.message);
      if (!res.headersSent) res.status(500).end();
    });
    req.on('close', () => audioStream.destroy());
    audioStream.pipe(res);

  } catch (err) {
    console.error('Stream error:', err.message);
    if (err.message.includes('unavailable') || err.message.includes('private'))
      return res.status(404).json({ error: 'Video unavailable or private' });
    if (err.message.includes('playable') || err.message.includes('extract') || err.message.includes('formats'))
      return res.status(451).json({ error: 'Video cannot be streamed (restricted)' });
    if (!res.headersSent) res.status(500).json({ error: 'Stream failed' });
  }
}

// ── Info ──────────────────────────────────────────────────────────────────
export async function getInfo(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID required' });
  const cached = await cacheGet(`info:v5:${id}`);
  if (cached) return res.json(cached);
  try {
    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${id}`, YTDL_OPTS);
    const d    = info.videoDetails;
    const track = { id, title: d.title, artist: d.author.name,
      duration: parseInt(d.lengthSeconds), thumbnail: d.thumbnails?.at(-1)?.url };
    query(`INSERT INTO tracks (youtube_id,title,artist,duration,thumbnail_url)
      VALUES ($1,$2,$3,$4,$5) ON CONFLICT (youtube_id) DO UPDATE SET updated_at=NOW()`,
      [id, track.title, track.artist, track.duration, track.thumbnail]).catch(()=>{});
    await cacheSet(`info:v5:${id}`, track, 3600);
    res.json(track);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get info' });
  }
}
