import { Router } from 'express';
import { query as vQuery } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';
import { optionalAuth } from '../middleware/auth.js';
import * as musicController from '../controllers/musicController.js';

const router = Router();

// GET /api/music/search?q=...&limit=20&offset=0
router.get(
  '/search',
  optionalAuth,
  [
    vQuery('q').notEmpty().trim().isLength({ min: 1, max: 200 }),
    vQuery('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    vQuery('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  asyncHandler(musicController.search)
);

// GET /api/music/stream?id=VIDEO_ID
// Streams audio-only — handles Range requests for seeking
router.get('/stream', asyncHandler(musicController.stream));

// GET /api/music/info?id=VIDEO_ID
router.get('/info', asyncHandler(musicController.getInfo));

// GET /api/music/trending
router.get('/trending', asyncHandler(musicController.getTrending));

// GET /api/music/suggestions?q=...
router.get('/suggestions', asyncHandler(musicController.getSuggestions));

export default router;
