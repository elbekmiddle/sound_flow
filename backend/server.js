import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRoutes    from './routes/auth.js';
import musicRoutes   from './routes/music.js';
import playlistRoutes from './routes/playlist.js';
import historyRoutes from './routes/history.js';
import libraryRoutes from './routes/library.js';
import podcastRoutes from './routes/podcast.js';

import { errorHandler } from './middleware/errorHandler.js';
import { connectDB }    from './config/database.js';
import { connectRedis } from './config/redis.js';

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Allowed CORS origins ───────────────────────────────────
// Add all your frontend URLs here (http for local, https for production)
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://localhost:5173',
  ...(process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : []),
];

// ── Security ───────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── CORS — must be before routes ───────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow no-origin (curl, Postman, extension) + allowed list
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked: ${origin}`);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'X-Track-Title'],
}));

// ── Pre-flight for all routes ─────────────────────────────
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiting ─────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
const streamLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  message: { error: 'Stream rate limit exceeded.' },
});

app.use('/api/', apiLimiter);
app.use('/api/music/stream', streamLimiter);

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/music',     musicRoutes);
app.use('/api/playlist',  playlistRoutes);
app.use('/api/history',   historyRoutes);
app.use('/api/library',   libraryRoutes);
app.use('/api/podcast',   podcastRoutes);

// ── Health Check ──────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `${req.method} ${req.path} not found` });
});

// ── Error Handler ─────────────────────────────────────────
app.use(errorHandler);

// ── Bootstrap ─────────────────────────────────────────────
async function bootstrap() {
  try {
    await connectDB();
    await connectRedis();
    app.listen(PORT, () => {
      console.log(`🚀 Obsidian Audio API → port ${PORT}`);
      console.log(`🌐 Allowed CORS origins: ${ALLOWED_ORIGINS.join(', ')}`);
    });
  } catch (err) {
    console.error('❌ Startup failed:', err);
    process.exit(1);
  }
}

bootstrap();
export default app;
