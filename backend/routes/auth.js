import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import * as ctrl from '../controllers/authController.js';

const router = Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
};

// POST /api/auth/register
router.post('/register',
  [
    body('displayName').trim().isLength({ min:1, max:50 }).withMessage('Display name required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min:8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  asyncHandler(ctrl.register)
);

// POST /api/auth/login
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  asyncHandler(ctrl.login)
);

// GET /api/auth/me
router.get('/me', authenticate, asyncHandler(ctrl.getMe));

// PUT /api/auth/profile
router.put('/profile', authenticate,
  [body('displayName').optional().trim().isLength({ min:1, max:50 })],
  validate,
  asyncHandler(ctrl.updateProfile)
);

// POST /api/auth/forgot-password
router.post('/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  validate,
  asyncHandler(ctrl.forgotPassword)
);

// POST /api/auth/reset-password
router.post('/reset-password',
  [
    body('token').notEmpty(),
    body('password').isLength({ min:8 }),
  ],
  validate,
  asyncHandler(ctrl.resetPassword)
);

// POST /api/auth/verify-email
router.post('/verify-email',
  [body('token').notEmpty()],
  validate,
  asyncHandler(ctrl.verifyEmail)
);

// DELETE /api/auth/account
router.delete('/account', authenticate, asyncHandler(ctrl.deleteAccount));

export default router;
