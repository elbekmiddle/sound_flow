import ytdl from 'ytdl-core';
import { cacheGet, cacheSet } from '../config/redis.js';
import { query } from '../config/database.js';

// yt-search ESM-compatible import
let ytSearch;
async function getYtSearch() {
  if (!ytSearch) {
    const mod = await import('yt-search');
    ytSearch = mod.default ?? mod;
  }
  return ytSearch;
}

const SEARCH_TTL = 600;
const INFO_TTL   = 3600;
const TREND_TTL  = 1800;

// ─── Search ───────────────────────────────────────────────
export async function search(req, res) {
  const q      = req.query.q?.trim();
  const limit  = parseInt(req.query.limit)  || 20;
  const offset = parseInt(req.query.offset) || 0;

  if (!q) return res.status(400).json({ error: 'Query required' });

  const cacheKey = `search:${q.toLowerCase()}:${limit}:${offset}`;
  const cached   = await cacheGet(cacheKey);
  if (cached) return res.json({ results: cached, source: 'cache' });

  try {
    const yt = await getYtSearch();
    const { videos } = await yt({ query: q, pageStart: 1, pageEnd: 2 });

    const results = videos
      .filter(v => v.seconds > 30 && v.seconds < 3600)
      .slice(offset, offset + limit)
      .map(v => ({
        id:          v.videoId,
        title:       v.title,
        artist:      v.author?.name || 'Unknown',
        duration:    v.seconds,
        durationStr: v.timestamp,
        thumbnail:   v.thumbnail,
        views:       v.views,
      }));

    await cacheSet(cacheKey, results, SEARCH_TTL);

    if (req.userId) {
      await query(
        'INSERT INTO search_history (user_id, query, result_count) VALUES ($1, $2, $3)',
        [req.userId, q, results.length]
      ).catch(() => {});
    }

    res.json({ results, total: videos.length, query: q });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Search failed', detail: err.message });
  }
}

// ─── Stream ───────────────────────────────────────────────
export async function stream(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID required' });
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return res.status(400).json({ error: 'Invalid video ID' });

  const url = `https://www.youtube.com/watch?v=${id}`;

  try {
    const info = await ytdl.getInfo(url);

    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter:  'audioonly',
    });

    if (!format) return res.status(404).json({ error: 'No audio format available' });

    res.setHeader('Content-Type', format.mimeType || 'audio/webm;codecs=opus');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', `public, max-age=${TREND_TTL}`);
    res.setHeader('X-Track-Title', encodeURIComponent(info.videoDetails.title));
    // Allow browser (HTTPS page) to read headers
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, X-Track-Title');

    if (format.contentLength) res.setHeader('Content-Length', format.contentLength);

    // Range request support (for seeking)
    const rangeHeader = req.headers.range;
    let streamOpts = { format };

    if (rangeHeader && format.contentLength) {
      const size  = parseInt(format.contentLength);
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end   = parts[1] ? parseInt(parts[1], 10) : size - 1;
      res.status(206);
      res.setHeader('Content-Range',  `bytes ${start}-${end}/${size}`);
      res.setHeader('Content-Length', end - start + 1);
      streamOpts.range = { start, end };
    }

    const audioStream = ytdl.downloadFromInfo(info, streamOpts);
    audioStream.on('error', (err) => {
      console.error('Stream pipe error:', err.message);
      if (!res.headersSent) res.status(500).end();
    });
    req.on('close', () => audioStream.destroy());
    audioStream.pipe(res);

  } catch (err) {
    console.error('Stream error:', err.message);
    if (err.message.includes('unavailable')) return res.status(404).json({ error: 'Video unavailable' });
    if (!res.headersSent) res.status(500).json({ error: 'Stream failed' });
  }
}

// ─── Track info ───────────────────────────────────────────
export async function getInfo(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID required' });

  const cacheKey = `track:info:${id}`;
  const cached   = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  try {
    const info    = await ytdl.getInfo(`https://www.youtube.com/watch?v=${id}`);
    const details = info.videoDetails;

    const track = {
      id,
      title:     details.title,
      artist:    details.author.name,
      duration:  parseInt(details.lengthSeconds),
      thumbnail: details.thumbnails.at(-1)?.url,
      views:     parseInt(details.viewCount),
    };

    await query(
      `INSERT INTO tracks (youtube_id, title, artist, duration, thumbnail_url)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (youtube_id) DO UPDATE
       SET title=$2, artist=$3, duration=$4, thumbnail_url=$5, updated_at=NOW()`,
      [id, track.title, track.artist, track.duration, track.thumbnail]
    ).catch(() => {});

    await cacheSet(cacheKey, track, INFO_TTL);
    res.json(track);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get info', detail: err.message });
  }
}

// ─── Trending ─────────────────────────────────────────────
export async function getTrending(req, res) {
  const cacheKey = 'trending:music:v2';
  const cached   = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  try {
    const yt = await getYtSearch();
    const { videos } = await yt('trending music 2025');

    const results = videos
      .filter(v => v.seconds > 60 && v.seconds < 600)
      .slice(0, 24)
      .map(v => ({
        id:        v.videoId,
        title:     v.title,
        artist:    v.author?.name || 'Unknown',
        duration:  v.seconds,
        thumbnail: v.thumbnail,
      }));

    await cacheSet(cacheKey, results, TREND_TTL);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get trending', detail: err.message });
  }
}

// ─── Autocomplete suggestions ─────────────────────────────
export async function getSuggestions(req, res) {
  const q = req.query.q?.trim();
  if (!q || q.length < 2) return res.json([]);

  const cacheKey = `suggest:${q.toLowerCase()}`;
  const cached   = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  try {
    const yt = await getYtSearch();
    const { videos } = await yt({ query: q, pageStart: 1, pageEnd: 1 });

    const suggestions = videos.slice(0, 8).map(v => ({
      id:     v.videoId,
      title:  v.title,
      artist: v.author?.name || 'Unknown',
    }));

    await cacheSet(cacheKey, suggestions, 300);
    res.json(suggestions);
  } catch {
    res.json([]);
  }
}
