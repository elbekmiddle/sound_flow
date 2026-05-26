import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import { query } from '../config/database.js';
import { cacheGet, cacheSet, cacheDel } from '../config/redis.js';

const router = Router();
router.use(authenticate);

// ─── GET /api/library/liked ───────────────────────────────
router.get('/liked', asyncHandler(async (req, res) => {
  const cacheKey = `liked:${req.userId}`;
  let tracks = await cacheGet(cacheKey);

  if (!tracks) {
    const result = await query(
      `SELECT t.youtube_id AS id, t.title, t.artist, t.duration, t.thumbnail_url, lt.liked_at
       FROM liked_tracks lt
       JOIN tracks t ON t.id = lt.track_id
       WHERE lt.user_id = $1
       ORDER BY lt.liked_at DESC`,
      [req.userId]
    );
    tracks = result.rows;
    await cacheSet(cacheKey, tracks, 120);
  }

  res.json(tracks);
}));

// ─── POST /api/library/liked/:youtubeId ───────────────────
router.post('/liked/:youtubeId', asyncHandler(async (req, res) => {
  const { youtubeId } = req.params;
  const { title, artist, duration, thumbnail } = req.body;

  // Upsert track
  const trackResult = await query(
    `INSERT INTO tracks (youtube_id, title, artist, duration, thumbnail_url)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (youtube_id) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [youtubeId, title, artist, duration, thumbnail]
  );

  await query(
    `INSERT INTO liked_tracks (user_id, track_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [req.userId, trackResult.rows[0].id]
  );

  await cacheDel(`liked:${req.userId}`);
  res.status(201).json({ liked: true });
}));

// ─── DELETE /api/library/liked/:youtubeId ─────────────────
router.delete('/liked/:youtubeId', asyncHandler(async (req, res) => {
  await query(
    `DELETE FROM liked_tracks
     WHERE user_id = $1
       AND track_id = (SELECT id FROM tracks WHERE youtube_id = $2)`,
    [req.userId, req.params.youtubeId]
  );
  await cacheDel(`liked:${req.userId}`);
  res.json({ liked: false });
}));

// ─── GET /api/library/liked/:youtubeId/status ─────────────
router.get('/liked/:youtubeId/status', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT 1 FROM liked_tracks lt
     JOIN tracks t ON t.id = lt.track_id
     WHERE lt.user_id = $1 AND t.youtube_id = $2`,
    [req.userId, req.params.youtubeId]
  );
  res.json({ liked: result.rowCount > 0 });
}));

export default router;
