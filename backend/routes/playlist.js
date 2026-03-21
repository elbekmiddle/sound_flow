import { Router } from 'express';
import { body, param } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import { query } from '../config/database.js';
import { cacheGet, cacheSet, cacheDel } from '../config/redis.js';

const router = Router();
router.use(authenticate);

// ─── GET /api/playlist ────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const cacheKey = `playlists:${req.userId}`;
  let playlists = await cacheGet(cacheKey);

  if (!playlists) {
    const result = await query(
      `SELECT id, name, description, cover_url, is_public, track_count, created_at
       FROM playlists WHERE user_id = $1 ORDER BY updated_at DESC`,
      [req.userId]
    );
    playlists = result.rows;
    await cacheSet(cacheKey, playlists, 120);
  }

  res.json(playlists);
}));

// ─── GET /api/playlist/:id ────────────────────────────────
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const plResult = await query(
    `SELECT p.*, u.display_name AS owner_name
     FROM playlists p JOIN users u ON u.id = p.user_id
     WHERE p.id = $1 AND (p.user_id = $2 OR p.is_public = TRUE)`,
    [id, req.userId]
  );

  if (!plResult.rows[0]) return res.status(404).json({ error: 'Playlist not found' });

  const tracksResult = await query(
    `SELECT t.youtube_id AS id, t.title, t.artist, t.duration, t.thumbnail_url,
            pt.position, pt.added_at
     FROM playlist_tracks pt
     JOIN tracks t ON t.id = pt.track_id
     WHERE pt.playlist_id = $1
     ORDER BY pt.position ASC`,
    [id]
  );

  res.json({ ...plResult.rows[0], tracks: tracksResult.rows });
}));

// ─── POST /api/playlist ───────────────────────────────────
router.post(
  '/',
  [body('name').notEmpty().trim().isLength({ min: 1, max: 100 })],
  asyncHandler(async (req, res) => {
    const { name, description, isPublic } = req.body;

    const result = await query(
      `INSERT INTO playlists (user_id, name, description, is_public)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.userId, name, description || null, isPublic || false]
    );

    await cacheDel(`playlists:${req.userId}`);
    res.status(201).json(result.rows[0]);
  })
);

// ─── PUT /api/playlist/:id ────────────────────────────────
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, description, isPublic } = req.body;

  const result = await query(
    `UPDATE playlists SET
       name = COALESCE($1, name),
       description = COALESCE($2, description),
       is_public = COALESCE($3, is_public),
       updated_at = NOW()
     WHERE id = $4 AND user_id = $5 RETURNING *`,
    [name, description, isPublic, req.params.id, req.userId]
  );

  if (!result.rows[0]) return res.status(404).json({ error: 'Playlist not found' });
  await cacheDel(`playlists:${req.userId}`);
  res.json(result.rows[0]);
}));

// ─── DELETE /api/playlist/:id ─────────────────────────────
router.delete('/:id', asyncHandler(async (req, res) => {
  await query(
    'DELETE FROM playlists WHERE id = $1 AND user_id = $2',
    [req.params.id, req.userId]
  );
  await cacheDel(`playlists:${req.userId}`);
  res.json({ message: 'Playlist deleted' });
}));

// ─── POST /api/playlist/:id/tracks ───────────────────────
router.post('/:id/tracks', asyncHandler(async (req, res) => {
  const { youtubeId, title, artist, duration, thumbnail } = req.body;
  if (!youtubeId) return res.status(400).json({ error: 'youtubeId required' });

  // Verify playlist ownership
  const pl = await query(
    'SELECT id FROM playlists WHERE id = $1 AND user_id = $2',
    [req.params.id, req.userId]
  );
  if (!pl.rows[0]) return res.status(404).json({ error: 'Playlist not found' });

  // Upsert track
  const trackResult = await query(
    `INSERT INTO tracks (youtube_id, title, artist, duration, thumbnail_url)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (youtube_id) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [youtubeId, title, artist, duration, thumbnail]
  );

  const trackId = trackResult.rows[0].id;

  // Get next position
  const posResult = await query(
    'SELECT COALESCE(MAX(position), 0) + 1 AS next_pos FROM playlist_tracks WHERE playlist_id = $1',
    [req.params.id]
  );

  await query(
    `INSERT INTO playlist_tracks (playlist_id, track_id, position)
     VALUES ($1, $2, $3) ON CONFLICT (playlist_id, track_id) DO NOTHING`,
    [req.params.id, trackId, posResult.rows[0].next_pos]
  );

  await cacheDel(`playlists:${req.userId}`);
  res.status(201).json({ message: 'Track added' });
}));

// ─── DELETE /api/playlist/:id/tracks/:trackId ────────────
router.delete('/:id/tracks/:trackId', asyncHandler(async (req, res) => {
  await query(
    `DELETE FROM playlist_tracks
     WHERE playlist_id = $1
       AND track_id = (SELECT id FROM tracks WHERE youtube_id = $2)`,
    [req.params.id, req.params.trackId]
  );
  await cacheDel(`playlists:${req.userId}`);
  res.json({ message: 'Track removed' });
}));

export default router;
