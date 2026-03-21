import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { playlistApi, libraryApi } from '../api/client.js';
import usePlayerStore from '../store/playerStore.js';
import TrackRow from '../components/TrackRow.jsx';

export default function PlaylistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { play } = usePlayerStore();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    setLoading(true);

    if (id === 'liked') {
      libraryApi.getLiked().then(tracks => {
        setPlaylist({
          id: 'liked',
          name: 'Liked Songs',
          description: 'All your favourite tracks in one place.',
          track_count: tracks.length,
          tracks,
          isLiked: true,
        });
      }).catch(() => setPlaylist(null))
        .finally(() => setLoading(false));
      return;
    }

    playlistApi.getOne(id)
      .then(setPlaylist)
      .catch(() => { toast.error('Playlist not found'); navigate('/library'); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        {/* Skeleton header */}
        <div className="flex gap-6 mb-8">
          <div className="w-48 h-48 skeleton flex-shrink-0 rounded-lg" />
          <div className="flex flex-col justify-end space-y-3 flex-1">
            <div className="h-3 skeleton w-16" />
            <div className="h-8 skeleton w-64" />
            <div className="h-3 skeleton w-40" />
            <div className="flex gap-3 mt-2">
              <div className="h-10 w-28 skeleton rounded-full" />
              <div className="h-10 w-28 skeleton rounded-full" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="flex gap-3 px-3 py-2.5">
              <div className="w-8 h-4 skeleton" />
              <div className="w-10 h-10 skeleton" />
              <div className="flex-1 space-y-2">
                <div className="h-3 skeleton w-2/3" />
                <div className="h-2.5 skeleton w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!playlist) return null;

  const totalDuration = playlist.tracks?.reduce((a, t) => a + (t.duration || 0), 0) || 0;
  const durationStr = totalDuration > 3600
    ? `${Math.floor(totalDuration / 3600)}h ${Math.floor((totalDuration % 3600) / 60)}m`
    : `${Math.floor(totalDuration / 60)} min`;

  const isLiked = id === 'liked';

  return (
    <div className="p-6 md:p-8 max-w-screen-xl mx-auto">
      {/* ── Header ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col sm:flex-row gap-6 mb-10"
      >
        {/* Cover */}
        <div
          className={`w-44 h-44 md:w-48 md:h-48 rounded-lg flex-shrink-0 flex items-center justify-center shadow-2xl
            ${isLiked
              ? 'bg-gradient-to-br from-tertiary/30 to-rose-950'
              : 'bg-gradient-to-br from-primary/30 to-purple-950'
            }`}
          style={{ boxShadow: '0 16px 60px rgba(199,153,255,0.15)' }}
        >
          <span
            className={`material-symbols-outlined text-6xl`}
            style={{
              fontVariationSettings: "'FILL' 1",
              color: isLiked ? '#ff94a4' : '#c799ff',
            }}
          >
            {isLiked ? 'favorite' : 'queue_music'}
          </span>
        </div>

        {/* Info */}
        <div className="flex flex-col justify-end">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-2">Playlist</p>
          <h1 className="font-headline font-black text-4xl tracking-tighter mb-2">{playlist.name}</h1>
          {playlist.description && (
            <p className="text-on-surface-variant text-sm mb-3">{playlist.description}</p>
          )}
          <p className="text-on-surface-variant text-xs mb-5">
            {playlist.track_count || playlist.tracks?.length || 0} songs
            {totalDuration > 0 && ` · ${durationStr}`}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => playlist.tracks?.length && play(playlist.tracks[0], playlist.tracks)}
              disabled={!playlist.tracks?.length}
              className="flex items-center gap-2 bg-primary hover:bg-primary-container
                         text-on-primary-container font-bold px-6 py-3 rounded-full
                         transition-all active:scale-95 text-sm disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[22px]"
                style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              Play All
            </button>
            <button
              onClick={() => {
                if (!playlist.tracks?.length) return;
                const shuffled = [...playlist.tracks].sort(() => Math.random() - 0.5);
                play(shuffled[0], shuffled);
                usePlayerStore.setState({ shuffle: true });
              }}
              className="flex items-center gap-2 bg-surface-container hover:bg-surface-container-high
                         px-5 py-3 rounded-full transition-all text-sm font-semibold"
            >
              <span className="material-symbols-outlined text-[20px]">shuffle</span>
              Shuffle
            </button>

            {!isLiked && (
              <button
                onClick={async () => {
                  if (confirm(`Delete "${playlist.name}"?`)) {
                    await playlistApi.delete(id);
                    toast.success('Playlist deleted');
                    navigate('/library');
                  }
                }}
                className="icon-btn ml-2"
                title="Delete playlist"
              >
                <span className="material-symbols-outlined text-[22px]">delete_outline</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Track list ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        {!playlist.tracks?.length ? (
          <div className="text-center py-16 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl mb-3 block opacity-30">music_note</span>
            <p className="font-semibold">No tracks yet</p>
            <p className="text-sm mt-1">Search for music and add tracks to this playlist.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {playlist.tracks.map((track, i) => (
              <TrackRow
                key={track.id + i}
                track={track}
                index={i}
                queue={playlist.tracks}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
