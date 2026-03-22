import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../config/database.js';
import { cacheGet, cacheSet, cacheDel } from '../config/redis.js';

const JWT_SECRET  = process.env.JWT_SECRET || 'change-me';
const JWT_EXPIRES = '30d';

function makeToken(userId, email) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// ── Register ──────────────────────────────────────────────
export async function register(req, res) {
  const { displayName, email, password } = req.body;

  if (!displayName || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // Check duplicate
  const exists = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (exists.rows[0]) return res.status(409).json({ error: 'This email is already registered' });

  const hash  = await bcrypt.hash(password, 12);
  const verifyToken = crypto.randomBytes(32).toString('hex');

  const result = await query(
    `INSERT INTO users (email, password_hash, display_name, email_verify_token)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, display_name, is_premium`,
    [email.toLowerCase(), hash, displayName, verifyToken]
  );

  const user  = result.rows[0];
  const token = makeToken(user.id, user.email);

  // In production: send verification email with verifyToken
  // await sendVerificationEmail(email, verifyToken);

  res.status(201).json({ user, token });
}

// ── Login ─────────────────────────────────────────────────
export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const result = await query(
    'SELECT id, email, display_name, password_hash, is_active, is_premium FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });
  if (!user.is_active) return res.status(403).json({ error: 'Account is disabled' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  delete user.password_hash;
  const token = makeToken(user.id, user.email);

  // Cache user profile
  await cacheSet(`user:jwt:${user.id}`, user, 3600);

  res.json({ user, token });
}

// ── Get me ────────────────────────────────────────────────
export async function getMe(req, res) {
  const cacheKey = `user:profile:${req.userId}`;
  let user = await cacheGet(cacheKey);

  if (!user) {
    const result = await query(
      `SELECT u.id, u.email, u.display_name, u.avatar_url, u.is_premium, u.preferences,
         (SELECT COUNT(*) FROM liked_tracks WHERE user_id=u.id)::int AS liked_count,
         (SELECT COUNT(*) FROM playlists     WHERE user_id=u.id)::int AS playlist_count,
         (SELECT COUNT(*) FROM play_history  WHERE user_id=u.id)::int AS plays_count
       FROM users u WHERE u.id=$1`,
      [req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    user = result.rows[0];
    await cacheSet(cacheKey, user, 300);
  }

  res.json(user);
}

// ── Update profile ────────────────────────────────────────
export async function updateProfile(req, res) {
  const { displayName, preferences } = req.body;

  const result = await query(
    `UPDATE users SET
       display_name = COALESCE($1, display_name),
       preferences  = COALESCE($2, preferences),
       updated_at   = NOW()
     WHERE id=$3
     RETURNING id, email, display_name, preferences`,
    [displayName, preferences ? JSON.stringify(preferences) : null, req.userId]
  );

  await cacheDel(`user:profile:${req.userId}`);
  await cacheDel(`user:jwt:${req.userId}`);
  res.json(result.rows[0]);
}

// ── Forgot password ───────────────────────────────────────
export async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const result = await query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
  // Always respond OK to prevent user enumeration
  if (!result.rows[0]) return res.json({ message: 'If that email exists, a reset link was sent.' });

  const token   = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000); // 1 hour

  await query(
    'UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE id=$3',
    [token, expires, result.rows[0].id]
  );

  // TODO: send email with reset link
  // await sendResetEmail(email, token);

  res.json({ message: 'If that email exists, a reset link was sent.' });
}

// ── Reset password ────────────────────────────────────────
export async function resetPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and new password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const result = await query(
    'SELECT id FROM users WHERE reset_token=$1 AND reset_token_expires > NOW()',
    [token]
  );

  if (!result.rows[0]) return res.status(400).json({ error: 'Invalid or expired reset token' });

  const hash = await bcrypt.hash(password, 12);
  await query(
    'UPDATE users SET password_hash=$1, reset_token=NULL, reset_token_expires=NULL WHERE id=$2',
    [hash, result.rows[0].id]
  );

  res.json({ message: 'Password reset successfully' });
}

// ── Verify email ──────────────────────────────────────────
export async function verifyEmail(req, res) {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const result = await query(
    'UPDATE users SET email_verified=TRUE, email_verify_token=NULL WHERE email_verify_token=$1 RETURNING id',
    [token]
  );

  if (!result.rows[0]) return res.status(400).json({ error: 'Invalid verification token' });
  res.json({ message: 'Email verified successfully' });
}

// ── Delete account ────────────────────────────────────────
export async function deleteAccount(req, res) {
  await query('UPDATE users SET is_active=FALSE WHERE id=$1', [req.userId]);
  await cacheDel(`user:profile:${req.userId}`);
  await cacheDel(`user:jwt:${req.userId}`);
  res.json({ message: 'Account deleted' });
}
