/**
 * Obsidian Audio — Email Utility
 *
 * Transport priority:
 *   1. SendGrid   (set SENDGRID_API_KEY)
 *   2. Gmail      (set GMAIL_USER + GMAIL_APP_PASSWORD)
 *   3. Custom SMTP (set SMTP_HOST + SMTP_USER + SMTP_PASS)
 *   4. Ethereal   (automatic fallback for dev — prints preview URL to console)
 *
 * Required env vars for production: set ONE of the above groups.
 * Optional: EMAIL_FROM, APP_URL
 */

import nodemailer from 'nodemailer';

const FROM    = process.env.EMAIL_FROM || '"Obsidian Audio" <noreply@obsidian-audio.app>';
const APP_URL = (process.env.APP_URL || 'https://sound-flow-six.vercel.app').replace(/\/$/, '');

// ── Build transporter ─────────────────────────────────────────────────────────
function buildTransporter() {
  const {
    SENDGRID_API_KEY,
    GMAIL_USER, GMAIL_APP_PASSWORD,
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE,
  } = process.env;

  if (SENDGRID_API_KEY) {
    console.log('📧 Email: using SendGrid');
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: { user: 'apikey', pass: SENDGRID_API_KEY },
    });
  }

  if (GMAIL_USER && GMAIL_APP_PASSWORD) {
    console.log('📧 Email: using Gmail');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });
  }

  if (SMTP_HOST) {
    console.log(`📧 Email: using SMTP (${SMTP_HOST})`);
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '587'),
      secure: SMTP_SECURE === 'true' || SMTP_PORT === '465',
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
  }

  // No config — will use Ethereal on first send
  return null;
}

let _transporter = buildTransporter();
let _etherealWarned = false;

async function getTransporter() {
  if (_transporter) return _transporter;

  // Auto-create Ethereal test account (free, no signup needed)
  if (!_etherealWarned) {
    console.log('⚠️  No email provider configured. Using Ethereal test account.');
    console.log('   Set SENDGRID_API_KEY or GMAIL_USER+GMAIL_APP_PASSWORD for real emails.');
    _etherealWarned = true;
  }

  const account = await nodemailer.createTestAccount();
  _transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: account.user, pass: account.pass },
  });
  return _transporter;
}

// ── Core send function ────────────────────────────────────────────────────────
export async function sendEmail({ to, subject, html, text }) {
  try {
    const t    = await getTransporter();
    const info = await t.sendMail({ from: FROM, to, subject, html, text });

    // Ethereal preview link (only works with test account)
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) {
      console.log(`📧 [DEV] Email preview → ${preview}`);
    } else {
      console.log(`📧 Email sent to ${to} (${info.messageId})`);
    }

    return { ok: true, messageId: info.messageId, preview: preview || null };
  } catch (err) {
    console.error('❌ Email failed:', err.message);
    return { ok: false, error: err.message, preview: null };
  }
}

// ── HTML template ─────────────────────────────────────────────────────────────
function template(body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Obsidian Audio</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0e0e0e;font-family:Arial,sans-serif;padding:32px 16px}
  .card{max-width:520px;margin:0 auto;background:#1a1919;border-radius:16px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.5)}
  .hdr{background:linear-gradient(135deg,rgba(199,153,255,.15),#0e0e0e);padding:28px 32px;border-bottom:1px solid rgba(72,72,71,.2)}
  .logo{font-size:22px;font-weight:900;color:#fff;letter-spacing:-.03em}
  .logo span{color:#c799ff}
  .sub{color:#adaaaa;font-size:11px;letter-spacing:.18em;text-transform:uppercase;margin-top:4px}
  .body{padding:32px;color:#adaaaa;font-size:15px;line-height:1.65}
  .body h2{color:#fff;font-size:19px;font-weight:700;margin-bottom:14px}
  .body p{margin-bottom:14px}
  .btn{display:inline-block;padding:13px 28px;background:#c799ff;color:#340064;font-weight:800;font-size:14px;border-radius:8px;text-decoration:none;letter-spacing:.02em;margin:6px 0 20px}
  .link{word-break:break-all;color:#c799ff;font-size:12px}
  .note{color:#777575;font-size:12px;margin-top:16px}
  .foot{padding:16px 32px 20px;color:#484847;font-size:11px;text-align:center;border-top:1px solid rgba(72,72,71,.15)}
</style>
</head>
<body>
<div class="card">
  <div class="hdr">
    <div class="logo">Obsidian<span>.</span></div>
    <div class="sub">Premium Audio</div>
  </div>
  <div class="body">${body}</div>
  <div class="foot">© ${new Date().getFullYear()} Obsidian Audio &nbsp;·&nbsp; If you did not request this, please ignore.</div>
</div>
</body>
</html>`;
}

// ── Email: Verify email address ───────────────────────────────────────────────
export async function sendVerificationEmail(email, token) {
  const link = `${APP_URL}/verify-email?token=${token}`;
  return sendEmail({
    to: email,
    subject: 'Verify your Obsidian Audio email',
    html: template(`
      <h2>Verify your email address</h2>
      <p>Welcome to Obsidian Audio! Click the button below to verify your email and activate your account.</p>
      <a href="${link}" class="btn">Verify Email Address</a>
      <p>Or copy this link into your browser:</p>
      <a href="${link}" class="link">${link}</a>
      <p class="note">⏱ This link expires in <strong>24 hours</strong>.</p>
    `),
    text: `Welcome to Obsidian Audio!\n\nVerify your email:\n${link}\n\nExpires in 24 hours.`,
  });
}

// ── Email: Password reset ─────────────────────────────────────────────────────
export async function sendPasswordResetEmail(email, token) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  return sendEmail({
    to: email,
    subject: 'Reset your Obsidian Audio password',
    html: template(`
      <h2>Reset your password</h2>
      <p>We received a request to reset your password. Click the button below to choose a new password.</p>
      <a href="${link}" class="btn">Reset Password</a>
      <p>Or copy this link:</p>
      <a href="${link}" class="link">${link}</a>
      <p class="note">⏱ This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
    `),
    text: `Reset your Obsidian Audio password:\n${link}\n\nExpires in 1 hour.`,
  });
}

// ── Email: Welcome (optional) ─────────────────────────────────────────────────
export async function sendWelcomeEmail(email, displayName) {
  return sendEmail({
    to: email,
    subject: 'Welcome to Obsidian Audio 🎵',
    html: template(`
      <h2>Welcome, ${displayName}!</h2>
      <p>Your Obsidian Audio account is ready. Start discovering music, building playlists, and listening everywhere.</p>
      <a href="${APP_URL}" class="btn">Open Obsidian Audio</a>
      <p class="note">Enjoy the music. 🎵</p>
    `),
    text: `Welcome to Obsidian Audio, ${displayName}!\n\nOpen the app: ${APP_URL}`,
  });
}
