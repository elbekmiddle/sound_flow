import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { playlistApi, libraryApi } from '../api/client.js';
import usePlayerStore from '../store/playerStore.js';
import TrackRow from '../components/TrackRow.jsx';

export default function PlaylistPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { play }     = usePlayerStore();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    setPlaylist(null);

    if (id === 'liked') {
      libraryApi.getLiked().then((tracks) => {
        setPlaylist({
          id: 'liked',
          name: 'Liked Songs',
          description: 'All your favourite tracks.',
          track_count: tracks.length,
          tracks,
        });
      }).catch(() => setPlaylist(null)).finally(() => setLoading(false));
      return;
    }

    playlistApi.getOne(id)
      .then(setPlaylist)
      .catch(() => { toast.error('Playlist not found'); navigate('/library'); })
      .finally(() => setLoading(false));
  }, [id]);

  const C = {
    text:  'var(--color-on-surface)',
    muted: 'var(--color-on-surface-variant)',
    surf:  'var(--color-surface-container)',
    surfH: 'var(--color-surface-container-high)',
    prim:  'var(--color-primary)',
    tert:  'var(--color-tertiary)',
  };

  if (loading) return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
        <div className="skeleton" style={{ width: 192, height: 192, borderRadius: 12, flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 10 }}>
          <div className="skeleton" style={{ width: 64, height: 10 }} />
          <div className="skeleton" style={{ width: 260, height: 36 }} />
          <div className="skeleton" style={{ width: 140, height: 10 }} />
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <div className="skeleton" style={{ width: 110, height: 40, borderRadius: 99 }} />
            <div className="skeleton" style={{ width: 110, height: 40, borderRadius: 99 }} />
          </div>
        </div>
      </div>
      {Array(6).fill(0).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px' }}>
          <div className="skeleton" style={{ width: 32, height: 14 }} />
          <div className="skeleton" style={{ width: 40, height: 40 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 12, width: '55%', marginBottom: 6 }} />
            <div className="skeleton" style={{ height: 10, width: '30%' }} />
          </div>
        </div>
      ))}
    </div>
  );

  if (!playlist) return null;

  const isLiked = id === 'liked';
  const totalDuration = playlist.tracks?.reduce((a, t) => a + (t.duration || 0), 0) || 0;
  const durStr = totalDuration > 3600
    ? `${Math.floor(totalDuration / 3600)}h ${Math.floor((totalDuration % 3600) / 60)}m`
    : `${Math.floor(totalDuration / 60)} min`;

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1280, margin: '0 auto' }}>
      {/* ── Header ─────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 40 }}>

        {/* Cover */}
        <div style={{
          width: 192, height: 192, borderRadius: 12, flexShrink: 0,
          background: isLiked
            ? 'linear-gradient(135deg,rgba(255,148,164,.3),rgb(136,19,55))'
            : 'linear-gradient(135deg,rgba(199,153,255,.3),rgb(68,0,128))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 16px 60px rgba(199,153,255,0.12)',
        }}>
          <span className="material-symbols-outlined ms-fill"
            style={{ fontSize: 72, color: isLiked ? C.tert : C.prim }}>
            {isLiked ? 'favorite' : 'queue_music'}
          </span>
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minWidth: 0 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.15em', color: C.muted, marginBottom: 8 }}>Playlist</p>
          <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 900, fontSize: 36,
            letterSpacing: '-0.03em', marginBottom: 8, color: C.text }}>{playlist.name}</h1>
          {playlist.description && (
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>{playlist.description}</p>
          )}
          <p style={{ color: C.muted, fontSize: 12, marginBottom: 20 }}>
            {(playlist.track_count || playlist.tracks?.length || 0)} songs
            {totalDuration > 0 && ` · ${durStr}`}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => playlist.tracks?.length && play(playlist.tracks[0], playlist.tracks)}
              disabled={!playlist.tracks?.length}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: C.prim, color: 'var(--color-on-primary-container)',
                fontFamily: 'var(--font-headline)', fontWeight: 700,
                padding: '10px 22px', borderRadius: 99,
                border: 'none', cursor: 'pointer',
                fontSize: 14, transition: 'all 0.15s',
                opacity: !playlist.tracks?.length ? 0.4 : 1,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary-container)'}
              onMouseLeave={(e) => e.currentTarget.style.background = C.prim}
            >
              <span className="material-symbols-outlined ms-fill" style={{ fontSize: 22 }}>play_arrow</span>
              Play All
            </button>

            <button
              onClick={() => {
                if (!playlist.tracks?.length) return;
                const shuffled = [...playlist.tracks].sort(() => Math.random() - 0.5);
                play(shuffled[0], shuffled);
                usePlayerStore.setState({ shuffle: true });
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--color-surface-container)',
                color: C.text,
                fontFamily: 'var(--font-headline)', fontWeight: 600,
                padding: '10px 20px', borderRadius: 99,
                border: 'none', cursor: 'pointer',
                fontSize: 14, transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-container-high)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-surface-container)'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>shuffle</span>
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
                style={{ background: 'none', border: 'none', cursor: 'pointer',
                  color: C.muted, padding: 8, display: 'flex', transition: 'color 0.15s' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-error)'}
                onMouseLeave={(e) => e.currentTarget.style.color = C.muted}
                title="Delete playlist"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>delete_outline</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Tracks ─────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        {!playlist.tracks?.length ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: C.muted }}>
            <span className="material-symbols-outlined" style={{ fontSize: 56, display: 'block', marginBottom: 12, opacity: 0.3 }}>
              music_note
            </span>
            <p style={{ fontWeight: 600, fontSize: 15 }}>No tracks yet</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Search for music and add tracks here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {playlist.tracks.map((track, i) => (
              <TrackRow key={track.id + i} track={track} index={i} queue={playlist.tracks} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
