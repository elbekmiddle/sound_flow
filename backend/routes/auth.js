import { Router }          from 'express';
import { body, validationResult } from 'express-validator';
import multer              from 'multer';
import { asyncHandler }    from '../middleware/errorHandler.js';
import { authenticate }    from '../middleware/auth.js';
import { uploadAvatar }    from '../config/cloudinary.js';
import { query }           from '../config/database.js';
import { cacheDel }        from '../config/redis.js';
import * as ctrl           from '../controllers/authController.js';

const router = Router();

const ok = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
};

// multer: store file in memory (buffer), max 5 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

// ── Auth routes ───────────────────────────────────────────────────────────────
router.post('/register',
  [
    body('displayName').trim().isLength({ min:1, max:50 }).withMessage('Display name required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min:8 }).withMessage('Password min 8 characters'),
  ],
  ok, asyncHandler(ctrl.register));

router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  ok, asyncHandler(ctrl.login));

router.get('/me', authenticate, asyncHandler(ctrl.getMe));

router.put('/profile', authenticate,
  [body('displayName').optional().trim().isLength({ min:1, max:50 })],
  ok, asyncHandler(ctrl.updateProfile));

router.post('/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  ok, asyncHandler(ctrl.forgotPassword));

router.post('/reset-password',
  [body('token').notEmpty(), body('password').isLength({ min:8 })],
  ok, asyncHandler(ctrl.resetPassword));

router.post('/verify-email',
  [body('token').notEmpty()],
  ok, asyncHandler(ctrl.verifyEmail));

router.post('/resend-verification', authenticate, asyncHandler(ctrl.resendVerification));

router.delete('/account', authenticate, asyncHandler(ctrl.deleteAccount));

// ── Avatar upload ──────────────────────────────────────────────────────────────
router.post('/avatar',
  authenticate,
  upload.single('avatar'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(503).json({ error: 'Cloudinary not configured. Set CLOUDINARY_* env vars.' });
    }

    const url = await uploadAvatar(req.file.buffer, req.userId);

    const result = await query(
      'UPDATE users SET avatar_url=$1, updated_at=NOW() WHERE id=$2 RETURNING avatar_url',
      [url, req.userId]
    );

    await cacheDel(`user:profile:${req.userId}`);
    await cacheDel(`user:jwt:${req.userId}`);

    res.json({ avatarUrl: result.rows[0].avatar_url });
  })
);

export default router;
