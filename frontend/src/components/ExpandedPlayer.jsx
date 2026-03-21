import { motion } from 'framer-motion';
import usePlayerStore from '../store/playerStore.js';

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
}

export default function ExpandedPlayer({ onClose }) {
  const {
    currentTrack, isPlaying, progress, currentTime, duration,
    volume, shuffle, repeat,
    togglePlay, next, prev, seek, setVolume,
    toggleShuffle, toggleRepeat, toggleLike, isLiked,
  } = usePlayerStore();

  const liked      = currentTrack ? isLiked(currentTrack.id) : false;
  const repeatIcon = repeat === 'one' ? 'repeat_one' : 'repeat';

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-[200] bg-background flex flex-col"
    >
      {/* Background art blur */}
      {currentTrack?.thumbnail && (
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={currentTrack.thumbnail}
            alt=""
            className="w-full h-full object-cover scale-125 blur-3xl opacity-10"
          />
          <div className="absolute inset-0 bg-background/80" />
        </div>
      )}

      <div className="relative flex flex-col h-full max-w-md mx-auto w-full px-6 py-6">
        {/* ── Header ────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onClose} className="icon-btn">
            <span className="material-symbols-outlined text-[28px]">keyboard_arrow_down</span>
          </button>
          <p className="text-sm font-semibold text-on-surface-variant tracking-wide uppercase text-xs">
            Now Playing
          </p>
          <button className="icon-btn">
            <span className="material-symbols-outlined">more_horiz</span>
          </button>
        </div>

        {/* ── Album Art ─────────────────────────── */}
        <div className="flex-1 flex items-center justify-center mb-8">
          <motion.div
            key={currentTrack?.id}
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-72 h-72 rounded-2xl overflow-hidden shadow-2xl"
            style={{ boxShadow: '0 24px 80px rgba(199,153,255,0.2)' }}
          >
            {currentTrack?.thumbnail ? (
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/30 to-purple-950
                              flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-8xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}>album</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Track info ────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div className="min-w-0">
            <motion.p
              key={currentTrack?.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-headline font-black text-2xl tracking-tight truncate"
            >
              {currentTrack?.title || 'Not playing'}
            </motion.p>
            <p className="text-on-surface-variant mt-0.5 truncate">
              {currentTrack?.artist || 'Select a track'}
            </p>
          </div>
          <button onClick={toggleLike} className="icon-btn flex-shrink-0 ml-4">
            <span
              className="material-symbols-outlined text-[28px]"
              style={{
                fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0",
                color: liked ? '#ff94a4' : undefined,
              }}
            >
              favorite
            </span>
          </button>
        </div>

        {/* ── Progress ──────────────────────────── */}
        <div className="mb-5">
          <input
            type="range" min="0" max="100"
            value={progress}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="range-progress w-full mb-2"
            style={{ '--pct': `${progress}%` }}
          />
          <div className="flex justify-between">
            <span className="text-xs text-on-surface-variant tabular-nums">{formatTime(currentTime)}</span>
            <span className="text-xs text-on-surface-variant tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        {/* ── Controls ──────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={toggleShuffle} className={`icon-btn ${shuffle ? 'active' : ''}`}>
            <span className="material-symbols-outlined text-[26px]">shuffle</span>
          </button>
          <button onClick={prev} className="icon-btn">
            <span className="material-symbols-outlined text-[40px]">skip_previous</span>
          </button>
          <button
            onClick={togglePlay}
            className="w-16 h-16 bg-primary rounded-full flex items-center justify-center
                       hover:bg-primary-container active:scale-95 transition-all shadow-lg"
          >
            <span
              className="material-symbols-outlined text-on-primary text-[38px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <button onClick={next} className="icon-btn">
            <span className="material-symbols-outlined text-[40px]">skip_next</span>
          </button>
          <button onClick={toggleRepeat} className={`icon-btn ${repeat !== 'none' ? 'active' : ''}`}>
            <span className="material-symbols-outlined text-[26px]">{repeatIcon}</span>
          </button>
        </div>

        {/* ── Volume ────────────────────────────── */}
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">volume_down</span>
          <input
            type="range" min="0" max="100"
            value={Math.round(volume * 100)}
            onChange={(e) => setVolume(e.target.value / 100)}
            className="range-volume flex-1"
            style={{ '--vol': `${volume * 100}%` }}
          />
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">volume_up</span>
        </div>
      </div>
    </motion.div>
  );
}
