import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../config/database.js';
import { cacheGet, cacheSet, cacheDel } from '../config/redis.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';

const JWT_SECRET  = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES = '30d';

function makeToken(userId, email) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// ─── Register ──────────────────────────────────────────────────────────────
export async function register(req, res) {
  const { displayName, email, password } = req.body;

  if (!displayName?.trim() || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows[0]) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const hash         = await bcrypt.hash(password, 12);
  const verifyToken  = crypto.randomBytes(32).toString('hex');
  const verifyExpiry = new Date(Date.now() + 24 * 3600 * 1000); // 24h

  const result = await query(
    `INSERT INTO users (email, password_hash, display_name, email_verify_token, email_verify_expires)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, display_name, is_premium`,
    [email.toLowerCase(), hash, displayName.trim(), verifyToken, verifyExpiry]
  );

  const user  = result.rows[0];
  const token = makeToken(user.id, user.email);

  // Send verification email (non-blocking — don't fail registration if email fails)
  sendVerificationEmail(email, verifyToken).catch(e =>
    console.error('Verification email failed:', e.message)
  );

  console.log(`✅ New user registered: ${email}`);
  res.status(201).json({ user, token });
}

// ─── Login ─────────────────────────────────────────────────────────────────
export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const result = await query(
    `SELECT id, email, display_name, password_hash, is_active, is_premium
     FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );

  const user = result.rows[0];
  if (!user)          return res.status(401).json({ error: 'Invalid email or password' });
  if (!user.is_active) return res.status(403).json({ error: 'Your account has been disabled' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  // Update last_login
  await query('UPDATE users SET updated_at = NOW() WHERE id = $1', [user.id]);

  delete user.password_hash;
  const token = makeToken(user.id, user.email);
  await cacheSet(`user:jwt:${user.id}`, user, 3600);

  res.json({ user, token });
}

// ─── Get current user ──────────────────────────────────────────────────────
export async function getMe(req, res) {
  const cacheKey = `user:profile:${req.userId}`;
  let user = await cacheGet(cacheKey);

  if (!user) {
    const result = await query(
      `SELECT u.id, u.email, u.display_name, u.avatar_url, u.is_premium,
         u.email_verified, u.preferences,
         (SELECT COUNT(*) FROM liked_tracks WHERE user_id=u.id)::int AS liked_count,
         (SELECT COUNT(*) FROM playlists     WHERE user_id=u.id)::int AS playlist_count,
         (SELECT COUNT(*) FROM play_history  WHERE user_id=u.id)::int AS plays_count
       FROM users u WHERE u.id = $1 AND u.is_active = TRUE`,
      [req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    user = result.rows[0];
    await cacheSet(cacheKey, user, 300);
  }

  res.json(user);
}

// ─── Update profile ────────────────────────────────────────────────────────
export async function updateProfile(req, res) {
  const { displayName, preferences } = req.body;

  const result = await query(
    `UPDATE users SET
       display_name = COALESCE($1, display_name),
       preferences  = COALESCE($2::jsonb, preferences),
       updated_at   = NOW()
     WHERE id = $3
     RETURNING id, email, display_name, preferences`,
    [
      displayName?.trim() || null,
      preferences ? JSON.stringify(preferences) : null,
      req.userId,
    ]
  );

  await cacheDel(`user:profile:${req.userId}`);
  await cacheDel(`user:jwt:${req.userId}`);
  res.json(result.rows[0]);
}

// ─── Forgot password ────────────────────────────────────────────────────────
export async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  // Always return 200 to prevent user enumeration
  const result = await query('SELECT id FROM users WHERE email = $1 AND is_active = TRUE', [email.toLowerCase()]);

  if (result.rows[0]) {
    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600 * 1000); // 1 hour

    await query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [token, expires, result.rows[0].id]
    );

    // Send reset email
    const { ok, preview } = await sendPasswordResetEmail(email, token);
    if (!ok) console.error(`Reset email failed for ${email}`);
    if (preview) console.log(`📧 Reset email preview: ${preview}`);
  }

  // Always same response
  res.json({ message: 'If that email is registered, a password reset link has been sent.' });
}

// ─── Reset password ─────────────────────────────────────────────────────────
export async function resetPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const result = await query(
    `SELECT id FROM users
     WHERE reset_token = $1 AND reset_token_expires > NOW() AND is_active = TRUE`,
    [token]
  );

  if (!result.rows[0]) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired' });
  }

  const hash = await bcrypt.hash(password, 12);
  await query(
    `UPDATE users SET
       password_hash       = $1,
       reset_token         = NULL,
       reset_token_expires = NULL,
       updated_at          = NOW()
     WHERE id = $2`,
    [hash, result.rows[0].id]
  );

  await cacheDel(`user:profile:${result.rows[0].id}`);
  await cacheDel(`user:jwt:${result.rows[0].id}`);

  res.json({ message: 'Password has been reset successfully. You can now sign in.' });
}

// ─── Verify email ────────────────────────────────────────────────────────────
export async function verifyEmail(req, res) {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required' });

  const result = await query(
    `UPDATE users
     SET email_verified = TRUE, email_verify_token = NULL, email_verify_expires = NULL
     WHERE email_verify_token = $1
       AND (email_verify_expires IS NULL OR email_verify_expires > NOW())
     RETURNING id`,
    [token]
  );

  if (!result.rows[0]) {
    return res.status(400).json({ error: 'Invalid or expired verification link' });
  }

  await cacheDel(`user:profile:${result.rows[0].id}`);
  res.json({ message: 'Email verified successfully! You can now sign in.' });
}

// ─── Resend verification email ───────────────────────────────────────────────
export async function resendVerification(req, res) {
  const userId = req.userId;

  const result = await query(
    'SELECT email, email_verified FROM users WHERE id = $1',
    [userId]
  );
  const user = result.rows[0];
  if (!user)               return res.status(404).json({ error: 'User not found' });
  if (user.email_verified) return res.status(400).json({ error: 'Email is already verified' });

  const token   = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 3600 * 1000);

  await query(
    'UPDATE users SET email_verify_token = $1, email_verify_expires = $2 WHERE id = $3',
    [token, expires, userId]
  );

  await sendVerificationEmail(user.email, token);
  res.json({ message: 'Verification email resent.' });
}

// ─── Delete account ──────────────────────────────────────────────────────────
export async function deleteAccount(req, res) {
  await query('UPDATE users SET is_active = FALSE WHERE id = $1', [req.userId]);
  await cacheDel(`user:profile:${req.userId}`);
  await cacheDel(`user:jwt:${req.userId}`);
  res.json({ message: 'Account deleted successfully' });
}
