import 'dotenv/config';
import express     from 'express';
import cors        from 'cors';
import helmet      from 'helmet';
import compression from 'compression';
import morgan      from 'morgan';
import rateLimit   from 'express-rate-limit';

import authRoutes     from './routes/auth.js';
import musicRoutes    from './routes/music.js';
import playlistRoutes from './routes/playlist.js';
import historyRoutes  from './routes/history.js';
import libraryRoutes  from './routes/library.js';
import podcastRoutes  from './routes/podcast.js';

import { errorHandler }  from './middleware/errorHandler.js';
import { connectDB }     from './config/database.js';
import { connectRedis }  from './config/redis.js';

const app  = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors({ origin: true, credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Accept'],
  exposedHeaders: ['Content-Range','Accept-Ranges','X-Track-Title'],
  maxAge: 86400 }));
app.options('*', cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 15*60*1000, max: 500, standardHeaders: true, legacyHeaders: false,
  handler: (_,res) => res.status(429).json({ error: 'Too many requests' }) });
const streamLimiter = rateLimit({ windowMs: 60*1000, max: 60,
  handler: (_,res) => res.status(429).json({ error: 'Stream rate limit exceeded' }) });
app.use('/api/', limiter);
app.use('/api/music/stream', streamLimiter);

app.use('/api/auth',     authRoutes);
app.use('/api/music',    musicRoutes);
app.use('/api/playlist', playlistRoutes);
app.use('/api/history',  historyRoutes);
app.use('/api/library',  libraryRoutes);
app.use('/api/podcast',  podcastRoutes);

app.get('/health', (_,res) => res.json({ status: 'ok', uptime: Math.round(process.uptime()), version: '4.0.0' }));
app.get('/',       (_,res) => res.json({ name: 'Sound Flow API', version: '4.0.0' }));
app.use((req, res) => res.status(404).json({ error: `${req.method} ${req.path} not found` }));
app.use(errorHandler);

// ── Auto-migrations on every startup ─────────────────────────────────────────
const AUTO_MIGRATE = `
  ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash          TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified         BOOLEAN DEFAULT FALSE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_token     TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_expires   TIMESTAMPTZ;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token            TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires    TIMESTAMPTZ;
  CREATE INDEX IF NOT EXISTS idx_users_reset_token  ON users(reset_token)  WHERE reset_token  IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_users_verify_token ON users(email_verify_token) WHERE email_verify_token IS NOT NULL;
`;

async function bootstrap() {
  try {
    const pool = await connectDB();
    await connectRedis();
    try { await pool.query(AUTO_MIGRATE); console.log('✅ Auto-migrations applied'); }
    catch (e) { console.warn('⚠️  Migration warning:', e.message.split('\n')[0]); }
    app.listen(PORT, () => {
      console.log(`🚀 Sound Flow API → port ${PORT}`);
      console.log(`🌍 CORS: open  |  🔒 Proxy: trusted  |  🎵 ytdl: @distube`);
    });
  } catch (err) {
    console.error('❌ Startup failed:', err.message);
    process.exit(1);
  }
}

bootstrap();
export default app;
