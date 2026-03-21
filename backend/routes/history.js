import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import { query } from '../config/database.js';
import { cacheGet, cacheSet, cacheDel } from '../config/redis.js';

const router = Router();
router.use(authenticate);

// ─── GET /api/history ────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;

  const result = await query(
    `SELECT DISTINCT ON (t.youtube_id)
       t.youtube_id AS id, t.title, t.artist, t.duration, t.thumbnail_url,
       ph.played_at, ph.play_duration, ph.device_type
     FROM play_history ph
     JOIN tracks t ON t.id = ph.track_id
     WHERE ph.user_id = $1
     ORDER BY t.youtube_id, ph.played_at DESC
     LIMIT $2`,
    [req.userId, limit]
  );

  res.json(result.rows);
}));

// ─── POST /api/history ───────────────────────────────────
router.post('/', asyncHandler(async (req, res) => {
  const { youtubeId, title, artist, duration, thumbnail, playDuration, deviceType } = req.body;

  // Upsert track
  const trackResult = await query(
    `INSERT INTO tracks (youtube_id, title, artist, duration, thumbnail_url)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (youtube_id) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [youtubeId, title, artist, duration, thumbnail]
  );

  await query(
    `INSERT INTO play_history (user_id, track_id, play_duration, device_type)
     VALUES ($1, $2, $3, $4)`,
    [req.userId, trackResult.rows[0].id, playDuration || 0, deviceType || 'web']
  );

  res.status(201).json({ message: 'History saved' });
}));

// ─── GET /api/history/search ─────────────────────────────
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

// ─── DELETE /api/history ─────────────────────────────────
router.delete('/', asyncHandler(async (req, res) => {
  await query('DELETE FROM play_history WHERE user_id = $1', [req.userId]);
  res.json({ message: 'History cleared' });
}));

export default router;
