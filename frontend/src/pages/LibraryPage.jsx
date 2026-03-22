import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { playlistApi, libraryApi, historyApi } from '../api/client.js';
import TrackRow from '../components/TrackRow.jsx';

function CreateModal({ onClose, onCreated }) {
  const [name, setName]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const pl = await playlistApi.create({ name });
      onCreated(pl);
      toast.success(`Created "${name}"`);
      onClose();
    } catch { toast.error('Failed to create playlist'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }}
        style={{
          background: 'var(--color-surface-container)',
          width: '100%', maxWidth: 360,
          padding: 24, borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          margin: '0 16px',
        }}
      >
        <h3 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: 20, marginBottom: 20 }}>
          Create Playlist
        </h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.12em', color: 'var(--color-on-surface-variant)' }}>Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My playlist"
              className="input-field"
              style={{ marginTop: 6, padding: '10px 12px', fontSize: 13 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-on-surface-variant)', fontSize: 13, padding: '8px 16px' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              style={{
                background: 'var(--color-primary)', color: 'var(--color-on-primary-container)',
                fontFamily: 'var(--font-headline)', fontWeight: 700,
                border: 'none', cursor: 'pointer',
                padding: '8px 20px', borderRadius: 8, fontSize: 13,
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.15s',
              }}>
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

const TABS = ['playlists', 'liked', 'history'];

export default function LibraryPage() {
  const { tab: paramTab } = useParams();
  const navigate          = useNavigate();
  const [tab, setTab]           = useState(paramTab || 'playlists');
  const [playlists, setPlaylists] = useState(null);
  const [liked, setLiked]       = useState(null);
  const [history, setHistory]   = useState(null);
  const [showModal, setShowModal] = useState(false);

  const switchTab = (t) => {
    setTab(t);
    navigate(`/library/${t}`, { replace: true });
  };

  useEffect(() => {
    playlistApi.getAll().then(setPlaylists).catch(() => setPlaylists([]));
    libraryApi.getLiked().then(setLiked).catch(() => setLiked([]));
    historyApi.get().then(setHistory).catch(() => setHistory([]));
  }, []);

  const C = {
    text:    'var(--color-on-surface)',
    muted:   'var(--color-on-surface-variant)',
    surf:    'var(--color-surface-container)',
    surfH:   'var(--color-surface-container-high)',
    primary: 'var(--color-primary)',
    tertiary:'var(--color-tertiary)',
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1280, margin: '0 auto' }}>

      {/* ── Header ─────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 900, fontSize: 30, letterSpacing: '-0.03em' }}>
          Library
        </h1>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: C.surf, padding: '10px 18px',
            borderRadius: 99, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: C.text,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = C.surfH}
          onMouseLeave={(e) => e.currentTarget.style.background = C.surf}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          New Playlist
        </button>
      </motion.div>

      {/* ── Tabs ───────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto' }} className="no-scrollbar">
        {TABS.map((t) => (
          <button key={t} onClick={() => switchTab(t)}
            className={`chip${tab === t ? ' active' : ''}`}
            style={{ flexShrink: 0, textTransform: 'capitalize' }}>
            {t}
          </button>
        ))}
      </motion.div>

      {/* ── Playlists ──────────────────────────────── */}
      {tab === 'playlists' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 16 }}>

          {/* Liked Songs default card */}
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            onClick={() => navigate('/library/liked')}
            style={{
              background: C.surf, borderRadius: 12, padding: 16,
              border: 'none', cursor: 'pointer', textAlign: 'left',
              transition: 'transform 0.2s, background 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.background = C.surfH; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.background = C.surf; }}
          >
            <div style={{
              width: '100%', aspectRatio: '1', borderRadius: 8, marginBottom: 12,
              background: 'rgba(255,148,164,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined ms-fill"
                style={{ fontSize: 40, color: C.tertiary }}>favorite</span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Liked Songs</p>
            <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{liked?.length || 0} songs</p>
          </motion.button>

          {/* User playlists */}
          {playlists === null
            ? Array(3).fill(0).map((_, i) => (
                <div key={i} className="skeleton" style={{ aspectRatio: '0.85', borderRadius: 12 }} />
              ))
            : playlists.map((pl, i) => (
                <motion.button key={pl.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (i + 1) * 0.04 }}
                  onClick={() => navigate(`/playlist/${pl.id}`)}
                  style={{
                    background: C.surf, borderRadius: 12, padding: 16,
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    transition: 'transform 0.2s, background 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.background = C.surfH; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.background = C.surf; }}
                >
                  <div style={{
                    width: '100%', aspectRatio: '1', borderRadius: 8, marginBottom: 12,
                    background: 'rgba(199,153,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-outlined"
                      style={{ fontSize: 40, color: C.primary }}>queue_music</span>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.name}</p>
                  <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{pl.track_count || 0} songs</p>
                </motion.button>
              ))
          }

          {/* New playlist card */}
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: (playlists?.length ?? 0 + 1) * 0.04 }}
            onClick={() => setShowModal(true)}
            style={{
              background: 'transparent', borderRadius: 12, padding: 16,
              border: '2px dashed rgba(72,72,71,0.25)',
              cursor: 'pointer', textAlign: 'left',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(199,153,255,0.35)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(72,72,71,0.25)'}
          >
            <div style={{
              width: '100%', aspectRatio: '1', borderRadius: 8, marginBottom: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(173,170,170,0.4)',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40 }}>add</span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>New Playlist</p>
          </motion.button>
        </motion.div>
      )}

      {/* ── Liked ──────────────────────────────────── */}
      {tab === 'liked' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {liked === null
            ? <p style={{ color: C.muted, fontSize: 13 }}>Loading...</p>
            : liked.length === 0
              ? (
                  <div style={{ textAlign: 'center', padding: '64px 0', color: C.muted }}>
                    <span className="material-symbols-outlined ms-fill"
                      style={{ fontSize: 56, display: 'block', marginBottom: 12,
                        color: 'rgba(255,148,164,0.3)' }}>favorite</span>
                    <p style={{ fontWeight: 600, fontSize: 15 }}>No liked songs yet</p>
                    <p style={{ fontSize: 13, marginTop: 4 }}>Tap ♥ on any track to save it here.</p>
                  </div>
                )
              : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {liked.map((t, i) => <TrackRow key={t.id} track={t} index={i} queue={liked} />)}
                  </div>
                )
          }
        </motion.div>
      )}

      {/* ── History ────────────────────────────────── */}
      {tab === 'history' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {history === null
            ? <p style={{ color: C.muted, fontSize: 13 }}>Loading...</p>
            : history.length === 0
              ? (
                  <div style={{ textAlign: 'center', padding: '64px 0', color: C.muted }}>
                    <span className="material-symbols-outlined"
                      style={{ fontSize: 56, display: 'block', marginBottom: 12, opacity: 0.3 }}>history</span>
                    <p style={{ fontWeight: 600, fontSize: 15 }}>No listening history</p>
                    <p style={{ fontSize: 13, marginTop: 4 }}>Start playing music to build your history.</p>
                  </div>
                )
              : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                      <button
                        onClick={() => { historyApi.clear(); setHistory([]); toast('History cleared'); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer',
                          color: C.muted, fontSize: 12, fontWeight: 600,
                          transition: 'color 0.15s' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-error)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = C.muted}
                      >
                        Clear history
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {history.map((t, i) => <TrackRow key={t.id + i} track={t} index={i} queue={history} />)}
                    </div>
                  </>
                )
          }
        </motion.div>
      )}

      {showModal && (
        <CreateModal
          onClose={() => setShowModal(false)}
          onCreated={(pl) => setPlaylists((p) => [pl, ...(p || [])])}
        />
      )}
    </div>
  );
}
