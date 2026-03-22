import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { cacheGet, cacheSet } from '../config/redis.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

export async function authenticate(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    const token = auth.split(' ')[1];
    let decoded;
    try { decoded = jwt.verify(token, JWT_SECRET); }
    catch (e) { return res.status(401).json({ error: e.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token' }); }

    const cacheKey = `user:jwt:${decoded.userId}`;
    let user = await cacheGet(cacheKey);
    if (!user) {
      const result = await query('SELECT id, email, display_name, is_active FROM users WHERE id=$1', [decoded.userId]);
      user = result.rows[0];
      if (user) await cacheSet(cacheKey, user, 3600);
    }
    if (!user)           return res.status(401).json({ error: 'User not found' });
    if (!user.is_active) return res.status(403).json({ error: 'Account disabled' });

    req.user = user; req.userId = user.id;
    next();
  } catch (err) { next(err); }
}

export async function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return next();
  try { await authenticate(req, res, next); } catch { next(); }
}
