import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import usePlayerStore from '../store/playerStore.js';
import ExpandedPlayer from './ExpandedPlayer.jsx';

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlayerBar() {
  const [expanded, setExpanded] = useState(false);

  const {
    currentTrack, isPlaying, isLoading,
    progress, currentTime, duration,
    volume, shuffle, repeat,
    togglePlay, next, prev,
    seek, setVolume,
    toggleShuffle, toggleRepeat,
    toggleLike, isLiked,
  } = usePlayerStore();

  const handleProgressChange = useCallback((e) => {
    seek(parseFloat(e.target.value));
  }, [seek]);

  const handleVolumeChange = useCallback((e) => {
    setVolume(parseFloat(e.target.value) / 100);
  }, [setVolume]);

  const repeatIcon = repeat === 'one' ? 'repeat_one' : 'repeat';
  const liked = currentTrack ? isLiked(currentTrack.id) : false;

  return (
    <>
      {/* ── Mini Player Bar ─────────────────────────────── */}
      <div
        className="flex-shrink-0 glass border-t border-outline-variant/10 px-4 py-2.5"
        style={{ boxShadow: '0 -4px 40px rgba(199,153,255,0.06)' }}
      >
        <div className="flex items-center gap-4 max-w-screen-xl mx-auto">

          {/* ── Track info ──────────────────────────────── */}
          <div
            className="flex items-center gap-3 w-64 flex-shrink-0 cursor-pointer"
            onClick={() => currentTrack && setExpanded(true)}
          >
            <div className="w-12 h-12 rounded-md bg-surface-container-high flex-shrink-0
                            flex items-center justify-center overflow-hidden relative">
              {currentTrack?.thumbnail ? (
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="material-symbols-outlined text-on-surface-variant">music_note</span>
              )}
              {isLoading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">
                {currentTrack?.title || 'Not playing'}
              </p>
              <p className="text-xs text-on-surface-variant truncate">
                {currentTrack?.artist || 'Select a track'}
              </p>
            </div>

            {currentTrack && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleLike(); }}
                className="icon-btn flex-shrink-0 ml-1"
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{
                    fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0",
                    color: liked ? '#ff94a4' : undefined,
                  }}
                >
                  favorite
                </span>
              </button>
            )}
          </div>

          {/* ── Controls + Progress ─────────────────────── */}
          <div className="flex-1 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-5">
              <button
                onClick={toggleShuffle}
                className={`icon-btn ${shuffle ? 'active' : ''}`}
              >
                <span className="material-symbols-outlined text-[20px]">shuffle</span>
              </button>

              <button onClick={prev} className="icon-btn">
                <span className="material-symbols-outlined text-[26px]">skip_previous</span>
              </button>

              <button
                onClick={togglePlay}
                disabled={isLoading}
                className="w-10 h-10 bg-on-surface rounded-full flex items-center justify-center
                           hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                <span
                  className="material-symbols-outlined text-background text-[22px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {isLoading ? 'hourglass_empty' : isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>

              <button onClick={next} className="icon-btn">
                <span className="material-symbols-outlined text-[26px]">skip_next</span>
              </button>

              <button
                onClick={toggleRepeat}
                className={`icon-btn ${repeat !== 'none' ? 'active' : ''}`}
              >
                <span className="material-symbols-outlined text-[20px]">{repeatIcon}</span>
              </button>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-3 w-full max-w-lg">
              <span className="text-xs text-on-surface-variant w-8 text-right tabular-nums">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min="0" max="100"
                value={progress}
                onChange={handleProgressChange}
                className="range-progress flex-1"
                style={{ '--pct': `${progress}%` }}
              />
              <span className="text-xs text-on-surface-variant w-8 tabular-nums">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* ── Volume & Expand ─────────────────────────── */}
          <div className="flex items-center gap-3 w-52 justify-end flex-shrink-0">
            <button
              onClick={() => currentTrack && setExpanded(true)}
              className="icon-btn hidden md:flex"
            >
              <span className="material-symbols-outlined text-[20px]">open_in_full</span>
            </button>

            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
              {volume === 0 ? 'volume_off' : volume < 0.4 ? 'volume_down' : 'volume_up'}
            </span>
            <input
              type="range"
              min="0" max="100"
              value={Math.round(volume * 100)}
              onChange={handleVolumeChange}
              className="range-volume w-24"
              style={{ '--vol': `${volume * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Expanded Player overlay ──────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <ExpandedPlayer onClose={() => setExpanded(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
