import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { verifyFirebaseToken } from '../config/firebase.js';
import { cacheGet, cacheSet, cacheDel } from '../config/redis.js';

// ─── Sync Firebase user to our DB ────────────────────────
export async function syncFirebaseUser(idToken, displayName) {
  const decoded = await verifyFirebaseToken(idToken);

  const { uid, email, name } = decoded;
  const finalName = displayName || name || email.split('@')[0];

  // Upsert user
  const result = await query(
    `INSERT INTO users (firebase_uid, email, display_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (firebase_uid) DO UPDATE
     SET email = EXCLUDED.email,
         display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), users.display_name),
         updated_at = NOW()
     RETURNING id, email, display_name, is_premium, preferences`,
    [uid, email, finalName]
  );

  const user = result.rows[0];

  // Issue our JWT (for API calls)
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  // Cache user
  await cacheSet(`user:firebase:${uid}`, user, 3600);
  await cacheSet(`user:jwt:${user.id}`, user, 3600);

  return { user, token };
}

// ─── Get current user profile ─────────────────────────────
export async function getMe(userId) {
  const cacheKey = `user:profile:${userId}`;
  let user = await cacheGet(cacheKey);

  if (!user) {
    const result = await query(
      `SELECT
         u.id, u.email, u.display_name, u.avatar_url, u.is_premium, u.preferences, u.created_at,
         (SELECT COUNT(*) FROM liked_tracks WHERE user_id = u.id) AS liked_count,
         (SELECT COUNT(*) FROM playlists WHERE user_id = u.id) AS playlist_count,
         (SELECT COUNT(*) FROM play_history WHERE user_id = u.id) AS plays_count
       FROM users u WHERE u.id = $1`,
      [userId]
    );

    if (!result.rows[0]) throw { status: 404, message: 'User not found' };
    user = result.rows[0];
    await cacheSet(cacheKey, user, 300);
  }

  return user;
}

// ─── Update profile ───────────────────────────────────────
export async function updateProfile(userId, updates) {
  const { displayName, preferences } = updates;

  const result = await query(
    `UPDATE users SET
       display_name = COALESCE($1, display_name),
       preferences = COALESCE($2, preferences),
       updated_at = NOW()
     WHERE id = $3
     RETURNING id, email, display_name, preferences`,
    [displayName, preferences ? JSON.stringify(preferences) : null, userId]
  );

  // Invalidate cache
  await cacheDel(`user:profile:${userId}`);
  await cacheDel(`user:jwt:${userId}`);

  return result.rows[0];
}

// ─── Delete account ───────────────────────────────────────
export async function deleteAccount(userId) {
  await query('UPDATE users SET is_active = FALSE WHERE id = $1', [userId]);
  await cacheDel(`user:profile:${userId}`);
}
