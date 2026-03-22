import 'dotenv/config';
import express from 'express';
import cors    from 'cors';
import helmet  from 'helmet';
import compression from 'compression';
import morgan  from 'morgan';
import rateLimit from 'express-rate-limit';

import authRoutes     from './routes/auth.js';
import musicRoutes    from './routes/music.js';
import playlistRoutes from './routes/playlist.js';
import historyRoutes  from './routes/history.js';
import libraryRoutes  from './routes/library.js';
import podcastRoutes  from './routes/podcast.js';

import { errorHandler } from './middleware/errorHandler.js';
import { connectDB }    from './config/database.js';
import { connectRedis } from './config/redis.js';

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CRITICAL: Trust reverse proxy (Render, Railway, Heroku, Vercel, etc.) ──
// Fixes: ERR_ERL_UNEXPECTED_X_FORWARDED_FOR from express-rate-limit
// Must be set BEFORE any middleware that reads IP addresses
app.set('trust proxy', 1);

// ── Security ────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── CORS — OPEN TO ALL ORIGINS ──────────────────────────────────────────────
// Allows: Vercel preview URLs, custom domains, localhost, Chrome extension
// Setting origin:true reflects whatever Origin header is sent → always allowed
app.use(cors({
  origin: true,
  credentials: true,
  methods:         ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders:  ['Content-Type','Authorization','X-Requested-With','Accept'],
  exposedHeaders:  ['Content-Range','Accept-Ranges','X-Track-Title'],
  maxAge: 86400,   // cache pre-flight 24h
}));

// Handle pre-flight OPTIONS for ALL routes
app.options('*', cors({ origin: true, credentials: true }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiting (safe now that trust proxy is set) ─────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 500,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many requests, please try again later.' },
  // Skip rate limit errors crashing the app
  skip: () => false,
  handler: (req, res) => res.status(429).json({ error: 'Too many requests, please try again later.' }),
});

const streamLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Stream rate limit exceeded.' },
  handler: (req, res) => res.status(429).json({ error: 'Stream rate limit exceeded.' }),
});

app.use('/api/', apiLimiter);
app.use('/api/music/stream', streamLimiter);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/music',    musicRoutes);
app.use('/api/playlist', playlistRoutes);
app.use('/api/history',  historyRoutes);
app.use('/api/library',  libraryRoutes);
app.use('/api/podcast',  podcastRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    uptime:    Math.round(process.uptime()),
    version:   '3.0.0',
  });
});

// ── Root ────────────────────────────────────────────────────────────────────
app.get('/', (_, res) => {
  res.json({ name: 'Obsidian Audio API', version: '3.0.0', status: 'running' });
});

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `${req.method} ${req.path} not found` });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ── Bootstrap ────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await connectDB();
    await connectRedis();
    app.listen(PORT, () => {
      console.log(`🚀 Obsidian Audio API → port ${PORT}`);
      console.log(`🌍 CORS: open to all origins`);
      console.log(`🔒 Trust proxy: enabled`);
      console.log(`🔧 Node.js: ${process.version}`);
    });
  } catch (err) {
    console.error('❌ Startup failed:', err.message);
    process.exit(1);
  }
}

bootstrap();
export default app;
