import jwt from 'jsonwebtoken';
import { verifyFirebaseToken } from '../config/firebase.js';
import { query } from '../config/database.js';
import { cacheGet, cacheSet } from '../config/redis.js';

// ─── JWT Auth ─────────────────────────────────────────────
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    let userId;

    // Try Firebase token first
    try {
      const decoded = await verifyFirebaseToken(token);
      userId = decoded.uid;

      // Ensure user exists in our DB (sync on first call)
      const cacheKey = `user:firebase:${userId}`;
      let user = await cacheGet(cacheKey);

      if (!user) {
        const result = await query(
          'SELECT id, email, display_name, is_active FROM users WHERE firebase_uid = $1',
          [userId]
        );
        user = result.rows[0];
        if (user) await cacheSet(cacheKey, user, 3600);
      }

      if (!user) {
        return res.status(401).json({ error: 'User not found. Please register.' });
      }

      if (!user.is_active) {
        return res.status(403).json({ error: 'Account is disabled.' });
      }

      req.user = { ...user, firebaseUid: userId };
      req.userId = user.id;

    } catch (firebaseError) {
      // Fall back to JWT
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const cacheKey = `user:jwt:${decoded.userId}`;
        let user = await cacheGet(cacheKey);

        if (!user) {
          const result = await query(
            'SELECT id, email, display_name, is_active FROM users WHERE id = $1',
            [decoded.userId]
          );
          user = result.rows[0];
          if (user) await cacheSet(cacheKey, user, 3600);
        }

        if (!user) return res.status(401).json({ error: 'User not found' });
        if (!user.is_active) return res.status(403).json({ error: 'Account disabled' });

        req.user = user;
        req.userId = user.id;
      } catch (jwtError) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}

// ─── Optional Auth (doesn't fail if no token) ─────────────
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  try {
    await authenticate(req, res, next);
  } catch {
    next();
  }
}
