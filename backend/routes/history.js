import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import { query } from '../config/database.js';

const router = Router();
router.use(authenticate);

// ─── GET /api/history ─────────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;

  const result = await query(
    `SELECT DISTINCT ON (t.youtube_id)
       t.youtube_id AS id, t.title, t.artist, t.duration, t.thumbnail_url AS thumbnail,
       ph.played_at, ph.play_duration, ph.device_type, ph.completion_pct
     FROM play_history ph
     JOIN tracks t ON t.id = ph.track_id
     WHERE ph.user_id = $1
     ORDER BY t.youtube_id, ph.played_at DESC
     LIMIT $2`,
    [req.userId, limit]
  );

  res.json(result.rows);
}));

// ─── POST /api/history ────────────────────────────────────────────────────
router.post('/', asyncHandler(async (req, res) => {
  const {
    youtubeId, title, artist, duration, thumbnail,
    playDuration, deviceType, completionPct,
  } = req.body;

  if (!youtubeId) return res.status(400).json({ error: 'youtubeId required' });

  // Upsert track
  const trackResult = await query(
    `INSERT INTO tracks (youtube_id, title, artist, duration, thumbnail_url)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (youtube_id) DO UPDATE
       SET title = COALESCE(EXCLUDED.title, tracks.title),
           updated_at = NOW()
     RETURNING id`,
    [youtubeId, title || 'Unknown', artist || 'Unknown', duration || 0, thumbnail || '']
  );

  // Insert play history with completion %
  await query(
    `INSERT INTO play_history (user_id, track_id, play_duration, device_type, completion_pct)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      req.userId,
      trackResult.rows[0].id,
      playDuration || 0,
      deviceType   || 'web',
      Math.min(Math.max(Math.floor(completionPct || 0), 0), 100),
    ]
  );

  res.status(201).json({ ok: true });
}));

// ─── GET /api/history/stats ───────────────────────────────────────────────
router.get('/stats', asyncHandler(async (req, res) => {
  const [counts, topTrack] = await Promise.all([
    query(
      `SELECT
         COUNT(*)                        AS total_plays,
         COUNT(DISTINCT track_id)        AS unique_tracks,
         COALESCE(SUM(play_duration), 0) AS total_seconds,
         COUNT(*) FILTER (WHERE completion_pct >= 80) AS completed_plays
       FROM play_history WHERE user_id = $1`,
      [req.userId]
    ),
    query(
      `SELECT t.title, t.artist, COUNT(*) AS play_count
       FROM play_history ph
       JOIN tracks t ON t.id = ph.track_id
       WHERE ph.user_id = $1
       GROUP BY t.id, t.title, t.artist
       ORDER BY play_count DESC
       LIMIT 1`,
      [req.userId]
    ),
  ]);

  const row = counts.rows[0] || {};
  res.json({
    totalPlays:     parseInt(row.total_plays)     || 0,
    uniqueTracks:   parseInt(row.unique_tracks)   || 0,
    totalSeconds:   parseInt(row.total_seconds)   || 0,
    completedPlays: parseInt(row.completed_plays) || 0,
    topTrack:       topTrack.rows[0]              || null,
  });
}));

// ─── GET /api/history/search ──────────────────────────────────────────────
router.get('/search', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT query, searched_at FROM search_history
     WHERE user_id = $1
     ORDER BY searched_at DESC
     LIMIT 20`,
    [req.userId]
  );
  res.json(result.rows);
}));

// ─── DELETE /api/history ──────────────────────────────────────────────────
router.delete('/', asyncHandler(async (req, res) => {
  await query('DELETE FROM play_history WHERE user_id = $1', [req.userId]);
  res.json({ ok: true, message: 'History cleared' });
}));

export default router;
