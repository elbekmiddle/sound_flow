import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';

const router = Router();

// POST /api/auth/sync
// Called after Firebase login — syncs user to our DB, returns JWT
router.post(
  '/sync',
  [body('idToken').notEmpty().withMessage('Firebase ID token required')],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { idToken, displayName } = req.body;
    const result = await authController.syncFirebaseUser(idToken, displayName);
    res.json(result);
  })
);

// GET /api/auth/me
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await authController.getMe(req.userId);
  res.json(user);
}));

// PUT /api/auth/profile
router.put(
  '/profile',
  authenticate,
  [
    body('displayName').optional().isLength({ min: 1, max: 50 }),
    body('preferences').optional().isObject(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const result = await authController.updateProfile(req.userId, req.body);
    res.json(result);
  })
);

// DELETE /api/auth/account
router.delete('/account', authenticate, asyncHandler(async (req, res) => {
  await authController.deleteAccount(req.userId);
  res.json({ message: 'Account deleted successfully' });
}));

export default router;
