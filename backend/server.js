import 'dotenv/config';
import express     from 'express';
import http        from 'http';
import { Server }  from 'socket.io';
import cors        from 'cors';
import helmet      from 'helmet';
import compression from 'compression';
import morgan      from 'morgan';
import rateLimit   from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import cookieParser from 'cookie-parser';
import useragent    from 'express-useragent';
import jwt         from 'jsonwebtoken';

import authRoutes     from './routes/auth.js';
import musicRoutes    from './routes/music.js';
import playlistRoutes from './routes/playlist.js';
import historyRoutes  from './routes/history.js';
import libraryRoutes  from './routes/library.js';
import podcastRoutes  from './routes/podcast.js';

import { errorHandler }  from './middleware/errorHandler.js';
import { connectDB }     from './config/database.js';
import { connectRedis, getRedis }  from './config/redis.js';

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 5000;

// ── Socket.IO ──────────────────────────────────────────────────────────────
export const io = new Server(server, {
  cors: { origin: true, credentials: true, methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
  pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT) || 60000,
  pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL) || 25000,
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || 
                socket.handshake.headers?.authorization?.split(' ')[1];
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', async (socket) => {
  const redis = getRedis();
  let onlineUsers = 0;
  try {
    onlineUsers = await redis.incr('online:users');
  } catch (e) {
    console.warn('Redis incr failed:', e.message);
  }
  io.emit('user_count', { count: Math.max(0, onlineUsers) });
  console.log(`🔌 WS connected: ${socket.id} | User: ${socket.userId}`);

  // Client broadcasts what track they are playing
  socket.on('now_playing', (data) => {
    socket.broadcast.emit('friend_playing', {
      socketId: socket.id,
      userId: socket.userId,
      ...data,
    });
  });

  // Simple chat message relay
  socket.on('chat_message', (data) => {
    io.emit('chat_message', { socketId: socket.id, userId: socket.userId, ...data, ts: Date.now() });
  });

  // Join a playlist room for collaborative listening
  socket.on('join_room', async (roomId) => {
    socket.join(roomId);
    try {
      const sockets = await io.in(roomId).fetchSockets();
      const members = sockets.map(s => ({ socketId: s.id, userId: s.userId }));
      io.to(roomId).emit('room_members', { roomId, members });
    } catch {}
    socket.to(roomId).emit('peer_joined', { socketId: socket.id, userId: socket.userId });
  });

  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit('peer_left', { socketId: socket.id, userId: socket.userId });
  });

  socket.on('disconnect', async () => {
    let count = 0;
    try { count = await redis.decr('online:users'); } catch {}
    io.emit('user_count', { count: Math.max(0, count) });
    console.log(`🔌 WS disconnected: ${socket.id} | online: ${Math.max(0, count)}`);
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

const limiter = rateLimit({ 
  windowMs: 15*60*1000, 
  max: 500, 
  standardHeaders: true, 
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => getRedis().sendCommand(args),
  }),
  handler: (_,res) => res.status(429).json({ error: 'Too many requests' }) 
});
const streamLimiter = rateLimit({ 
  windowMs: 60*1000, 
  max: 60,
  store: new RedisStore({
    sendCommand: (...args) => getRedis().sendCommand(args),
  }),
  handler: (_,res) => res.status(429).json({ error: 'Stream rate limit exceeded' }) 
});
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
  
  -- Database Performance Indexes for 1000+ users
  CREATE INDEX IF NOT EXISTS idx_ph_user_date ON play_history(user_id, played_at DESC);
  CREATE INDEX IF NOT EXISTS idx_ph_completed ON play_history(user_id, played_at DESC)
    WHERE completion_pct >= 30;
  CREATE INDEX IF NOT EXISTS idx_playlist_tracks_pid_pos ON playlist_tracks(playlist_id, position);
  CREATE INDEX IF NOT EXISTS idx_liked_tracks_user_liked ON liked_tracks(user_id, liked_at DESC);
  CREATE INDEX IF NOT EXISTS idx_search_history_recent ON search_history(user_id, searched_at DESC) 
    WHERE searched_at > NOW() - INTERVAL '30 days';
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
