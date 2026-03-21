import ytdl from 'ytdl-core';
import ytSearch from 'yt-search';
import { query } from '../config/database.js';
import { cacheGet, cacheSet } from '../config/redis.js';

const SEARCH_CACHE_TTL = 600;   // 10 minutes
const INFO_CACHE_TTL  = 3600;   // 1 hour
const STREAM_CACHE_TTL = 1800;  // 30 minutes

// ─── Search ───────────────────────────────────────────────
export async function search(req, res) {
  const q = req.query.q?.trim();
  const limit = req.query.limit || 20;
  const offset = req.query.offset || 0;

  if (!q) return res.status(400).json({ error: 'Query required' });

  const cacheKey = `search:${q.toLowerCase()}:${limit}:${offset}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ results: cached, source: 'cache' });

  try {
    const { videos } = await ytSearch({ query: q, pageStart: 1, pageEnd: 2 });

    const results = videos
      .filter(v => v.seconds > 0 && v.seconds < 3600) // skip >1h (lectures etc)
      .slice(offset, offset + limit)
      .map(v => ({
        id:           v.videoId,
        title:        v.title,
        artist:       v.author?.name || 'Unknown',
        duration:     v.seconds,
        durationStr:  v.timestamp,
        thumbnail:    v.thumbnail,
        views:        v.views,
        url:          v.url,
      }));

    await cacheSet(cacheKey, results, SEARCH_CACHE_TTL);

    // Save search history if authenticated
    if (req.userId) {
      await query(
        `INSERT INTO search_history (user_id, query, result_count)
         VALUES ($1, $2, $3)`,
        [req.userId, q, results.length]
      ).catch(() => {});
    }

    res.json({ results, total: videos.length, query: q });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Search failed. Try again.' });
  }
}

// ─── Stream Audio ─────────────────────────────────────────
export async function stream(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID required' });

  // Validate YouTube ID format
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid video ID format' });
  }

  const url = `https://www.youtube.com/watch?v=${id}`;

  try {
    // Check if video is available
    const info = await ytdl.getInfo(url);
    const videoTitle = info.videoDetails.title;

    // Choose best audio format
    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: 'audioonly',
    });

    if (!format) {
      return res.status(404).json({ error: 'No audio stream available' });
    }

    // Set response headers
    res.setHeader('Content-Type', format.mimeType || 'audio/webm');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', `public, max-age=${STREAM_CACHE_TTL}`);
    res.setHeader('X-Track-Title', encodeURIComponent(videoTitle));

    if (format.contentLength) {
      res.setHeader('Content-Length', format.contentLength);
    }

    // Handle range requests (for seek)
    const rangeHeader = req.headers.range;
    const stream = ytdl.downloadFromInfo(info, {
      format,
      range: rangeHeader ? parseRange(rangeHeader, format.contentLength) : undefined,
    });

    if (rangeHeader && format.contentLength) {
      const { start, end } = parseRange(rangeHeader, format.contentLength);
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${format.contentLength}`);
      res.setHeader('Content-Length', end - start + 1);
    }

    stream.on('error', (err) => {
      console.error('Stream error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream failed' });
      }
    });

    req.on('close', () => stream.destroy());
    stream.pipe(res);

  } catch (err) {
    console.error('Stream error:', err.message);
    if (err.message.includes('Video unavailable')) {
      return res.status(404).json({ error: 'Video not available' });
    }
    res.status(500).json({ error: 'Failed to stream audio' });
  }
}

// ─── Get Track Info ───────────────────────────────────────
export async function getInfo(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID required' });

  const cacheKey = `track:info:${id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  try {
    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${id}`);
    const details = info.videoDetails;

    const track = {
      id,
      title:     details.title,
      artist:    details.author.name,
      duration:  parseInt(details.lengthSeconds),
      thumbnail: details.thumbnails[details.thumbnails.length - 1]?.url,
      views:     parseInt(details.viewCount),
    };

    // Cache in DB
    await query(
      `INSERT INTO tracks (youtube_id, title, artist, duration, thumbnail_url)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (youtube_id) DO UPDATE
       SET title = EXCLUDED.title, artist = EXCLUDED.artist,
           duration = EXCLUDED.duration, thumbnail_url = EXCLUDED.thumbnail_url,
           updated_at = NOW()`,
      [id, track.title, track.artist, track.duration, track.thumbnail]
    ).catch(() => {});

    await cacheSet(cacheKey, track, INFO_CACHE_TTL);
    res.json(track);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get track info' });
  }
}

// ─── Trending ─────────────────────────────────────────────
export async function getTrending(req, res) {
  const cacheKey = 'trending:music';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  try {
    const { videos } = await ytSearch('trending music 2025');
    const results = videos
      .filter(v => v.seconds > 60 && v.seconds < 600)
      .slice(0, 20)
      .map(v => ({
        id:        v.videoId,
        title:     v.title,
        artist:    v.author?.name || 'Unknown',
        duration:  v.seconds,
        thumbnail: v.thumbnail,
      }));

    await cacheSet(cacheKey, results, 1800); // 30 min
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get trending' });
  }
}

// ─── Suggestions ──────────────────────────────────────────
export async function getSuggestions(req, res) {
  const q = req.query.q?.trim();
  if (!q || q.length < 2) return res.json([]);

  const cacheKey = `suggest:${q.toLowerCase()}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  try {
    const { videos } = await ytSearch({ query: q, pageStart: 1, pageEnd: 1 });
    const suggestions = videos
      .slice(0, 8)
      .map(v => ({
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

// ─── Helpers ──────────────────────────────────────────────
function parseRange(rangeHeader, contentLength) {
  const [, range] = rangeHeader.replace(/bytes=/, '').split('=');
  const [startStr, endStr] = range.split('-');
  const start = parseInt(startStr, 10);
  const end = endStr ? parseInt(endStr, 10) : contentLength - 1;
  return { start, end };
}
