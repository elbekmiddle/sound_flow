import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import usePlayerStore from '../store/playerStore.js';
import { playlistApi } from '../api/client.js';

/* ── Equalizer animation bars (shown when track is active) ── */
function EqBars() {
  return (
    <div className="flex items-end gap-[2px] h-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="w-[3px] rounded-sm origin-bottom"
          style={{
            background: 'var(--color-primary)',
            animation: `bar-eq 0.8s ease-in-out infinite ${(i - 1) * 0.15}s`,
            height: `${[8, 14, 10][i - 1]}px`,
          }}
        />
      ))}
    </div>
  );
}

/* ── "Add to playlist" context menu ─────────────────────── */
function PlaylistMenu({ track, onClose }) {
  const [playlists, setPlaylists] = useState(null);
  const [loading, setLoading]     = useState(false);

  useState(() => {
    playlistApi.getAll()
      .then(setPlaylists)
      .catch(() => setPlaylists([]));
  }, []);

  async function addTo(pl) {
    setLoading(true);
    try {
      await playlistApi.addTrack(pl.id, {
        youtubeId: track.id,
        title:     track.title,
        artist:    track.artist,
        duration:  track.duration,
        thumbnail: track.thumbnail,
      });
      toast.success(`Added to "${pl.name}"`);
      onClose();
    } catch (e) {
      toast.error(e.message || 'Failed to add');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -6 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-8 z-50 min-w-[180px] rounded-lg overflow-hidden shadow-2xl"
      style={{
        background:   'var(--color-surface-container-high)',
        border:       '1px solid rgba(72,72,71,0.25)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="px-3 py-2 text-xs font-bold uppercase tracking-widest"
        style={{ color: 'var(--color-on-surface-variant)' }}
      >
        Add to playlist
      </div>

      {playlists === null ? (
        <div className="px-3 py-3 text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
          Loading...
        </div>
      ) : playlists.length === 0 ? (
        <div className="px-3 py-3 text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
          No playlists yet.<br />Create one in Library.
        </div>
      ) : (
        playlists.map((pl) => (
          <button
            key={pl.id}
            onClick={() => !loading && addTo(pl)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-left transition-all"
            style={{ color: 'var(--color-on-surface)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-container-highest)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>queue_music</span>
            <span className="truncate">{pl.name}</span>
          </button>
        ))
      )}

      {/* YouTube link */}
      <div
        className="mt-1 border-t"
        style={{ borderColor: 'rgba(72,72,71,0.2)' }}
      >
        <a
          href={`https://www.youtube.com/watch?v=${track.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-all"
          style={{ color: 'var(--color-on-surface-variant)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-surface-container-highest)';
            e.currentTarget.style.color = 'var(--color-on-surface)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-on-surface-variant)';
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* YouTube SVG logo */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          Open on YouTube
        </a>
      </div>
    </motion.div>
  );
}

/* ── Main TrackRow component ─────────────────────────────── */
export default function TrackRow({ track, index, queue, showIndex = true }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { play, currentTrack, isPlaying, toggleLike, isLiked } = usePlayerStore();

  const isActive = currentTrack?.id === track.id;
  const liked    = isLiked(track.id);

  const fmt = (s) => s
    ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
    : '';

  function handleMore(e) {
    e.stopPropagation();
    setMenuOpen((v) => !v);
  }

  function closeMenu() { setMenuOpen(false); }

  // Close menu when clicking outside
  const handleRowClick = () => {
    if (menuOpen) { closeMenu(); return; }
    play(track, queue);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.4), duration: 0.3 }}
      className="track-row group relative"
      onClick={handleRowClick}
    >
      {/* Index / Eq bars */}
      <div className="w-8 text-center flex-shrink-0 relative" style={{ minHeight: '20px' }}>
        {isActive && isPlaying ? (
          <EqBars />
        ) : (
          <>
            {showIndex && (
              <span
                className="text-sm group-hover:invisible"
                style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-on-surface-variant)' }}
              >
                {index + 1}
              </span>
            )}
            <span
              className="material-symbols-outlined ms-fill absolute inset-0 flex items-center justify-center
                         opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ fontSize: 18, color: 'var(--color-on-surface)' }}
            >
              play_arrow
            </span>
          </>
        )}
      </div>

      {/* Thumbnail */}
      <div
        className="w-10 h-10 rounded flex-shrink-0 overflow-hidden flex items-center justify-center"
        style={{ background: 'var(--color-surface-container-high)' }}
      >
        {track.thumbnail ? (
          <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', fontSize: 18 }}>
            music_note
          </span>
        )}
      </div>

      {/* Title + Artist */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold truncate"
          style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-on-surface)' }}
        >
          {track.title}
        </p>
        <p className="text-xs truncate" style={{ color: 'var(--color-on-surface-variant)' }}>
          {track.artist}
        </p>
      </div>

      {/* Duration */}
      {track.duration && (
        <span
          className="text-xs flex-shrink-0 tabular-nums"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          {fmt(track.duration)}
        </span>
      )}

      {/* Like button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (currentTrack?.id !== track.id) {
            usePlayerStore.setState({ currentTrack: track });
          }
          toggleLike();
        }}
        className="icon-btn flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Like"
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 18,
            fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0",
            color: liked ? 'var(--color-tertiary)' : undefined,
          }}
        >
          favorite
        </span>
      </button>

      {/* More / Add to playlist */}
      <div className="relative flex-shrink-0">
        <button
          onClick={handleMore}
          className="icon-btn opacity-0 group-hover:opacity-100 transition-opacity"
          title="More options"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>more_horiz</span>
        </button>

        <AnimatePresence>
          {menuOpen && (
            <>
              {/* Backdrop to close */}
              <div
                className="fixed inset-0 z-40"
                onClick={(e) => { e.stopPropagation(); closeMenu(); }}
              />
              <PlaylistMenu track={track} onClose={closeMenu} />
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
