import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import usePlayerStore from '../store/playerStore.js';
import ExpandedPlayer from './ExpandedPlayer.jsx';

const S = {
  bar: {
    flexShrink: 0,
    background: 'rgba(20,19,19,0.92)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderTop: '1px solid rgba(72,72,71,0.12)',
    padding: '10px 16px',
    boxShadow: '0 -4px 40px rgba(199,153,255,0.06)',
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    maxWidth: 1280,
    margin: '0 auto',
  },
  trackWrap: {
    display: 'flex', alignItems: 'center', gap: 12,
    width: 256, flexShrink: 0, cursor: 'pointer',
  },
  thumb: {
    width: 48, height: 48,
    borderRadius: 8,
    background: 'var(--color-surface-container-high)',
    flexShrink: 0,
    overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  center: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
  },
  ctrlRow: { display: 'flex', alignItems: 'center', gap: 20 },
  playBtn: {
    width: 40, height: 40,
    background: 'var(--color-on-surface)',
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', cursor: 'pointer',
    transition: 'transform 0.15s',
  },
  progressRow: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 480 },
  right: {
    display: 'flex', alignItems: 'center', gap: 12,
    width: 200, justifyContent: 'flex-end', flexShrink: 0,
  },
};

function fmt(s) {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function IconBtn({ icon, active, fill, onClick, title, style }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'transparent', border: 'none',
        color: active ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
        cursor: 'pointer', padding: 4, borderRadius: '50%',
        display: 'flex', transition: 'color 0.15s',
        ...style,
      }}
      onMouseEnter={(e) => !active && (e.currentTarget.style.color = 'var(--color-on-surface)')}
      onMouseLeave={(e) => !active && (e.currentTarget.style.color = 'var(--color-on-surface-variant)')}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 22, fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0" }}
      >
        {icon}
      </span>
    </button>
  );
}

export default function PlayerBar() {
  const [expanded, setExpanded] = useState(false);
  const {
    currentTrack, isPlaying, isLoading,
    progress, currentTime, duration,
    volume, shuffle, repeat,
    togglePlay, next, prev,
    seek, setVolume, toggleShuffle, toggleRepeat,
    toggleLike, isLiked,
  } = usePlayerStore();

  const liked      = currentTrack ? isLiked(currentTrack.id) : false;
  const repeatIcon = repeat === 'one' ? 'repeat_one' : 'repeat';
  const volIcon    = volume === 0 ? 'volume_off' : volume < 0.4 ? 'volume_down' : 'volume_up';

  const onProgressChange = useCallback((e) => seek(parseFloat(e.target.value)), [seek]);
  const onVolumeChange   = useCallback((e) => setVolume(e.target.value / 100), [setVolume]);

  return (
    <>
      <div style={S.bar}>
        <div style={S.inner}>
          {/* ── Track info ──────────────────────────── */}
          <div style={S.trackWrap} onClick={() => currentTrack && setExpanded(true)}>
            <div style={S.thumb}>
              {currentTrack?.thumbnail
                ? <img src={currentTrack.thumbnail} alt={currentTrack.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', fontSize: 22 }}>music_note</span>
              }
              {isLoading && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    width: 16, height: 16,
                    border: '2px solid rgba(199,153,255,0.3)',
                    borderTopColor: 'var(--color-primary)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                </div>
              )}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{
                fontSize: 13, fontWeight: 600,
                color: 'var(--color-on-surface)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {currentTrack?.title || 'Not playing'}
              </p>
              <p style={{
                fontSize: 11,
                color: 'var(--color-on-surface-variant)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {currentTrack?.artist || 'Select a track'}
              </p>
            </div>

            {currentTrack && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleLike(); }}
                style={{
                  background: 'transparent', border: 'none',
                  color: liked ? 'var(--color-tertiary)' : 'var(--color-on-surface-variant)',
                  cursor: 'pointer', padding: 4, flexShrink: 0,
                  transition: 'color 0.15s',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 20, fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0" }}
                >
                  favorite
                </span>
              </button>
            )}
          </div>

          {/* ── Controls + Progress ─────────────────── */}
          <div style={S.center}>
            <div style={S.ctrlRow}>
              <IconBtn icon="shuffle"        active={shuffle}          onClick={toggleShuffle} title="Shuffle" />
              <IconBtn icon="skip_previous"  style={{ fontSize: 28 }}  onClick={prev}          title="Previous" />

              <button
                onClick={togglePlay}
                disabled={isLoading || !currentTrack}
                style={{
                  ...S.playBtn,
                  opacity: (!currentTrack) ? 0.4 : 1,
                }}
                onMouseEnter={(e) => { if (currentTrack) e.currentTarget.style.transform = 'scale(1.06)'; }}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <span
                  className="material-symbols-outlined ms-fill"
                  style={{ color: 'var(--color-background)', fontSize: 24 }}
                >
                  {isLoading ? 'hourglass_empty' : isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>

              <IconBtn icon="skip_next"    style={{ fontSize: 28 }}          onClick={next}         title="Next" />
              <IconBtn icon={repeatIcon}   active={repeat !== 'none'}        onClick={toggleRepeat} title="Repeat" />
            </div>

            {/* Progress bar */}
            <div style={S.progressRow}>
              <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', width: 32, textAlign: 'right', tabularNums: true }}>
                {fmt(currentTime)}
              </span>
              <input
                type="range" min="0" max="100"
                value={progress}
                onChange={onProgressChange}
                className="range-progress"
                style={{ flex: 1, '--pct': `${progress}%` }}
              />
              <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', width: 32 }}>
                {fmt(duration)}
              </span>
            </div>
          </div>

          {/* ── Volume + Expand ─────────────────────── */}
          <div style={S.right}>
            <IconBtn icon="open_in_full" onClick={() => currentTrack && setExpanded(true)} title="Expand" />
            <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', fontSize: 18 }}>
              {volIcon}
            </span>
            <input
              type="range" min="0" max="100"
              value={Math.round(volume * 100)}
              onChange={onVolumeChange}
              className="range-volume"
              style={{ width: 80, '--vol': `${volume * 100}%` }}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && <ExpandedPlayer onClose={() => setExpanded(false)} />}
      </AnimatePresence>
    </>
  );
}
