import 'dotenv/config';
import express     from 'express';
import http        from 'http';
import { Server }  from 'socket.io';
import cors        from 'cors';
import helmet      from 'helmet';
import compression from 'compression';
import morgan      from 'morgan';
import rateLimit   from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import useragent    from 'express-useragent';

import authRoutes     from './routes/auth.js';
import musicRoutes    from './routes/music.js';
import playlistRoutes from './routes/playlist.js';
import historyRoutes  from './routes/history.js';
import libraryRoutes  from './routes/library.js';
import podcastRoutes  from './routes/podcast.js';

import { errorHandler }  from './middleware/errorHandler.js';
import { connectDB }     from './config/database.js';
import { connectRedis }  from './config/redis.js';

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 5000;

// ── Socket.IO ──────────────────────────────────────────────────────────────
export const io = new Server(server, {
  cors: { origin: true, credentials: true, methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

let onlineUsers = 0;

io.on('connection', (socket) => {
  onlineUsers++;
  io.emit('user_count', { count: onlineUsers });
  console.log(`🔌 WS connected: ${socket.id} | online: ${onlineUsers}`);

  // Client broadcasts what track they are playing
  socket.on('now_playing', (data) => {
    socket.broadcast.emit('friend_playing', {
      socketId: socket.id,
      ...data,
    });
  });

  // Simple chat message relay
  socket.on('chat_message', (data) => {
    io.emit('chat_message', { socketId: socket.id, ...data, ts: Date.now() });
  });

  // Join a playlist room for collaborative listening
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('peer_joined', { socketId: socket.id });
  });

  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit('peer_left', { socketId: socket.id });
  });

  socket.on('disconnect', () => {
    onlineUsers = Math.max(0, onlineUsers - 1);
    io.emit('user_count', { count: onlineUsers });
    console.log(`🔌 WS disconnected: ${socket.id} | online: ${onlineUsers}`);
  });
});

// ── Express middleware ─────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors({ origin: true, credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Accept','Range'],
  exposedHeaders: ['Content-Range','Accept-Ranges','Content-Length','X-Track-Title','X-Track-Artist','X-Track-Duration'],
  maxAge: 86400 }));
app.options('*', cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(useragent.express());

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

app.get('/health', (_,res) => res.send('pong'));
app.get('/api/health', (_,res) => res.send('pong'));
app.get('/',       (_,res) => res.json({ name: 'Sound Flow API', version: '4.0.0' }));
app.use((req, res) => res.status(404).json({ error: `${req.method} ${req.path} not found` }));
app.use(errorHandler);

// ── Auto-migrations on every startup ──────────────────────────────────────
const AUTO_MIGRATE = `
  ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash          TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified         BOOLEAN DEFAULT FALSE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_token     TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_expires   TIMESTAMPTZ;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token            TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires    TIMESTAMPTZ;
  CREATE INDEX IF NOT EXISTS idx_users_reset_token  ON users(reset_token)  WHERE reset_token  IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_users_verify_token ON users(email_verify_token) WHERE email_verify_token IS NOT NULL;
  
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,
    device_id TEXT,
    user_agent TEXT,
    ip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    is_revoked BOOLEAN DEFAULT FALSE
  );

  -- Play history: add completion tracking (Spotify standard)
  ALTER TABLE play_history ADD COLUMN IF NOT EXISTS completion_pct SMALLINT DEFAULT 0;
  CREATE INDEX IF NOT EXISTS idx_ph_user_date ON play_history(user_id, played_at DESC);
  CREATE INDEX IF NOT EXISTS idx_ph_completed ON play_history(user_id, played_at DESC)
    WHERE completion_pct >= 30;
`;

async function bootstrap() {
  try {
    const pool = await connectDB();
    await connectRedis();
    try { await pool.query(AUTO_MIGRATE); console.log('✅ Auto-migrations applied'); }
    catch (e) { console.warn('⚠️  Migration warning:', e.message.split('\n')[0]); }
    server.listen(PORT, () => {
      console.log(`🚀 Sound Flow API → port ${PORT}`);
      console.log(`🌍 CORS: open  |  🔒 Proxy: trusted  |  🎵 ytdl: yt-dlp  |  🔌 WebSocket: socket.io`);
    });
  } catch (err) {
    console.error('❌ Startup failed:', err.message);
    process.exit(1);
  }
}

bootstrap();
export default app;
