import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import musicRoutes from './routes/music.js';
import playlistRoutes from './routes/playlist.js';
import historyRoutes from './routes/history.js';
import libraryRoutes from './routes/library.js';
import podcastRoutes from './routes/podcast.js';

import { errorHandler } from './middleware/errorHandler.js';
import { connectDB } from './config/database.js';
import { connectRedis } from './config/redis.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security & Middleware ─────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(compression());
app.use(morgan('dev'));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ─────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const streamLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1 minute
  max: 30,
  message: { error: 'Stream rate limit exceeded.' },
});

app.use('/api/', apiLimiter);
app.use('/api/music/stream', streamLimiter);

// ─── Routes ───────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/music',    musicRoutes);
app.use('/api/playlist', playlistRoutes);
app.use('/api/history',  historyRoutes);
app.use('/api/library',  libraryRoutes);
app.use('/api/podcast',  podcastRoutes);

// ─── Health Check ─────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── 404 ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Error Handler ────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────
async function bootstrap() {
  try {
    await connectDB();
    await connectRedis();
    app.listen(PORT, () => {
      console.log(`🚀 Obsidian Audio API running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();

export default app;
