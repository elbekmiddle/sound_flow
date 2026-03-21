import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { playlistApi, libraryApi, historyApi } from '../api/client.js';
import TrackRow from '../components/TrackRow.jsx';

const TABS = ['playlists', 'liked', 'history'];

function CreatePlaylistModal({ onClose, onCreated }) {
  const [name, setName]   = useState('');
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
    } catch {
      toast.error('Failed to create playlist');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.93 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.93 }}
        className="bg-surface-container w-full max-w-sm p-6 rounded-lg shadow-2xl mx-4"
      >
        <h3 className="font-headline font-bold text-xl mb-5">Create Playlist</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My playlist"
              className="w-full mt-1.5 bg-surface-container-highest rounded py-2.5 px-3
                         text-sm text-on-surface border-none outline-none"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2 bg-primary text-on-primary-container rounded font-bold
                         text-sm hover:bg-primary-container transition-all active:scale-95 disabled:opacity-60">
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function LibraryPage() {
  const { tab: paramTab } = useParams();
  const navigate = useNavigate();
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

  const defaultPlaylists = [
    { id: 'liked', name: 'Liked Songs',   icon: 'favorite',     color: '#ff94a4', count: liked?.length || 0 },
  ];

  return (
    <div className="p-6 md:p-8 max-w-screen-xl mx-auto">
      {/* ── Header ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <h1 className="font-headline font-black text-3xl tracking-tight">Library</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-surface-container px-4 py-2.5 rounded-full
                     hover:bg-surface-container-high transition-colors text-sm font-semibold"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Playlist
        </button>
      </motion.div>

      {/* ── Tabs ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-2 mb-6 overflow-x-auto no-scrollbar"
      >
        {['playlists', 'liked', 'history'].map(t => (
          <button key={t} onClick={() => switchTab(t)}
            className={`chip flex-shrink-0 capitalize ${tab === t ? 'active' : ''}`}>
            {t}
          </button>
        ))}
      </motion.div>

      {/* ── Playlists Grid ──────────────────────────── */}
      {tab === 'playlists' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
        >
          {/* Default liked playlist card */}
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => navigate('/library/liked')}
            className="card p-4 text-left"
          >
            <div className="w-full aspect-square rounded-md mb-3 bg-tertiary/10
                            flex items-center justify-center">
              <span className="material-symbols-outlined text-tertiary text-4xl"
                style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
            </div>
            <p className="font-semibold text-sm truncate">Liked Songs</p>
            <p className="text-xs text-on-surface-variant mt-0.5">{liked?.length || 0} songs</p>
          </motion.button>

          {/* User playlists */}
          {playlists === null
            ? Array(3).fill(0).map((_, i) => (
                <div key={i} className="skeleton rounded-lg" style={{ aspectRatio: '1' }} />
              ))
            : playlists.map((pl, i) => (
                <motion.button
                  key={pl.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/playlist/${pl.id}`)}
                  className="card p-4 text-left"
                >
                  <div className="w-full aspect-square rounded-md mb-3 bg-primary/10
                                  flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-4xl">queue_music</span>
                  </div>
                  <p className="font-semibold text-sm truncate">{pl.name}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{pl.track_count || 0} songs</p>
                </motion.button>
              ))
          }

          {/* Create new */}
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setShowModal(true)}
            className="rounded-lg p-4 text-left border-2 border-dashed border-outline-variant/20
                       hover:border-primary/30 hover:bg-surface-container/50 transition-all"
          >
            <div className="w-full aspect-square rounded-md mb-3 flex items-center justify-center
                            text-on-surface-variant/40">
              <span className="material-symbols-outlined text-4xl">add</span>
            </div>
            <p className="font-semibold text-sm text-on-surface-variant">New Playlist</p>
          </motion.button>
        </motion.div>
      )}

      {/* ── Liked Tracks ────────────────────────────── */}
      {tab === 'liked' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {liked === null
            ? <p className="text-on-surface-variant text-sm">Loading...</p>
            : liked.length === 0
              ? (
                  <div className="text-center py-16 text-on-surface-variant">
                    <span className="material-symbols-outlined text-5xl mb-3 block text-tertiary/40"
                      style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                    <p className="font-semibold">No liked songs yet</p>
                    <p className="text-sm mt-1">Tap ♥ on any track to save it here.</p>
                  </div>
                )
              : (
                  <div className="space-y-1">
                    {liked.map((track, i) => (
                      <TrackRow key={track.id} track={track} index={i} queue={liked} />
                    ))}
                  </div>
                )
          }
        </motion.div>
      )}

      {/* ── History ─────────────────────────────────── */}
      {tab === 'history' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {history === null
            ? <p className="text-on-surface-variant text-sm">Loading...</p>
            : history.length === 0
              ? (
                  <div className="text-center py-16 text-on-surface-variant">
                    <span className="material-symbols-outlined text-5xl mb-3 block">history</span>
                    <p className="font-semibold">No listening history</p>
                    <p className="text-sm mt-1">Start playing music to build your history.</p>
                  </div>
                )
              : (
                  <>
                    <div className="flex justify-end mb-4">
                      <button
                        onClick={() => { historyApi.clear(); setHistory([]); toast('History cleared'); }}
                        className="text-xs text-on-surface-variant hover:text-error transition-colors font-semibold"
                      >
                        Clear history
                      </button>
                    </div>
                    <div className="space-y-1">
                      {history.map((track, i) => (
                        <TrackRow key={track.id + i} track={track} index={i} queue={history} />
                      ))}
                    </div>
                  </>
                )
          }
        </motion.div>
      )}

      {/* ── Create Modal ────────────────────────────── */}
      {showModal && (
        <CreatePlaylistModal
          onClose={() => setShowModal(false)}
          onCreated={(pl) => setPlaylists(p => [pl, ...(p || [])])}
        />
      )}
    </div>
  );
}
