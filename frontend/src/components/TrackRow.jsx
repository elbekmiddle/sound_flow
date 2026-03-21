import { motion } from 'framer-motion';
import usePlayerStore from '../store/playerStore.js';

function EqualizerBars() {
  return (
    <div className="flex items-end gap-[2px] h-4">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className={`eq-bar w-[3px] bg-primary rounded-sm origin-bottom animate-bar-eq-${i}`}
          style={{ height: `${[8, 14, 10][i - 1]}px` }}
        />
      ))}
    </div>
  );
}

export default function TrackRow({ track, index, queue, showIndex = true }) {
  const { play, currentTrack, isPlaying, toggleLike, isLiked } = usePlayerStore();

  const isActive = currentTrack?.id === track.id;
  const liked    = isLiked(track.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      onClick={() => play(track, queue)}
      className="track-row"
    >
      {/* Index / equalizer / play icon */}
      <div className="w-8 text-center flex-shrink-0 relative">
        {isActive && isPlaying ? (
          <EqualizerBars />
        ) : (
          <>
            {showIndex && (
              <span className={`text-sm group-hover:hidden ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
                {index + 1}
              </span>
            )}
            <span className="material-symbols-outlined text-on-surface text-[18px] hidden group-hover:block"
              style={{ fontVariationSettings: "'FILL' 1" }}>
              play_arrow
            </span>
          </>
        )}
      </div>

      {/* Thumbnail */}
      <div className="w-10 h-10 rounded flex-shrink-0 bg-surface-container-high overflow-hidden">
        {track.thumbnail ? (
          <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">music_note</span>
          </div>
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isActive ? 'text-primary' : ''}`}>
          {track.title}
        </p>
        <p className="text-xs text-on-surface-variant truncate">{track.artist}</p>
      </div>

      {/* Duration */}
      {track.duration && (
        <span className="text-xs text-on-surface-variant flex-shrink-0 tabular-nums">
          {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
        </span>
      )}

      {/* Like */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          // Temporarily play this track to allow like toggle
          if (currentTrack?.id !== track.id) {
            usePlayerStore.setState({ currentTrack: track });
          }
          toggleLike();
        }}
        className="icon-btn opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity"
      >
        <span
          className="material-symbols-outlined text-[18px]"
          style={{
            fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0",
            color: liked ? '#ff94a4' : undefined,
          }}
        >
          favorite
        </span>
      </button>
    </motion.div>
  );
}
