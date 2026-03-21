import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import { query } from '../config/database.js';
import { cacheGet, cacheSet } from '../config/redis.js';

const router = Router();

// ─── GET /api/podcast ────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const cacheKey = 'podcasts:all';
  let podcasts = await cacheGet(cacheKey);

  if (!podcasts) {
    const result = await query(
      `SELECT p.*, COUNT(e.id) AS episode_count
       FROM podcasts p
       LEFT JOIN podcast_episodes e ON e.podcast_id = p.id
       GROUP BY p.id ORDER BY p.name ASC`
    );
    podcasts = result.rows;
    await cacheSet(cacheKey, podcasts, 3600);
  }

  res.json(podcasts);
}));

// ─── GET /api/podcast/:id/episodes ───────────────────────
router.get('/:id/episodes', asyncHandler(async (req, res) => {
  const cacheKey = `podcast:episodes:${req.params.id}`;
  let episodes = await cacheGet(cacheKey);

  if (!episodes) {
    const result = await query(
      `SELECT * FROM podcast_episodes WHERE podcast_id = $1
       ORDER BY published_at DESC LIMIT 50`,
      [req.params.id]
    );
    episodes = result.rows;
    await cacheSet(cacheKey, episodes, 1800);
  }

  res.json(episodes);
}));

// ─── GET/PUT /api/podcast/progress/:episodeId ────────────
router.get('/progress/:episodeId', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT position, completed FROM podcast_progress WHERE user_id = $1 AND episode_id = $2',
    [req.userId, req.params.episodeId]
  );
  res.json(result.rows[0] || { position: 0, completed: false });
}));

router.put('/progress/:episodeId', authenticate, asyncHandler(async (req, res) => {
  const { position, completed } = req.body;
  await query(
    `INSERT INTO podcast_progress (user_id, episode_id, position, completed)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, episode_id) DO UPDATE
     SET position = $3, completed = $4, updated_at = NOW()`,
    [req.userId, req.params.episodeId, position, completed || false]
  );
  res.json({ saved: true });
}));

export default router;
