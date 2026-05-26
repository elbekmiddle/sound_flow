import { Router } from 'express';
import { query as vQuery } from 'express-validator';
import { asyncHandler }   from '../middleware/errorHandler.js';
import { optionalAuth, authenticate } from '../middleware/auth.js';
import * as mc from '../controllers/musicController.js';

const router = Router();

router.get('/search',          optionalAuth, asyncHandler(mc.search));
router.get('/suggestions',     asyncHandler(mc.getSuggestions));
router.get('/info',            asyncHandler(mc.getInfo));
router.get('/trending',        asyncHandler(mc.getTrending));
router.get('/recommendations', authenticate, asyncHandler(mc.getRecommendations));
router.get('/stream',          asyncHandler(mc.stream));

export default router;
