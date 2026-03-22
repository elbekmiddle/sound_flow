import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Heart, MoreHorizontal, ListMusic, Youtube, Check, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import usePlayerStore from '../store/playerStore.js';
import { playlistApi } from '../api/client.js';

/* ── Eq animation bars ──────────────────────── */
function EqBars() {
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:16 }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width:3, background:'var(--color-primary)',
          borderRadius:2, transformOrigin:'bottom',
          animation:`eq 0.8s ease-in-out infinite ${i*0.15}s`,
          height:[8,14,10][i],
        }} />
      ))}
    </div>
  );
}

/* ── Context menu: add to playlist + YouTube ── */
function ContextMenu({ track, isMusic, onClose }) {
  const [playlists, setPlaylists] = useState(null);
  const [added, setAdded]         = useState(null);

  useState(() => {
    playlistApi.getAll().then(setPlaylists).catch(() => setPlaylists([]));
  });

  async function addTo(pl) {
    try {
      await playlistApi.addTrack(pl.id, {
        youtubeId: track.id, title: track.title,
        artist: track.artist, duration: track.duration, thumbnail: track.thumbnail,
      });
      setAdded(pl.id);
      toast.success(`Added to "${pl.name}"`);
      setTimeout(onClose, 800);
    } catch (e) { toast.error(e.message); }
  }

  return (
    <motion.div
      initial={{ opacity:0, scale:0.92, y:-6 }}
      animate={{ opacity:1, scale:1, y:0 }}
      exit={{ opacity:0, scale:0.92, y:-6 }}
      transition={{ duration:0.13 }}
      onClick={e => e.stopPropagation()}
      style={{
        position:'absolute', right:0, top:36, zIndex:200,
        minWidth:200, borderRadius:12, overflow:'hidden',
        background:'var(--color-surface-container-high)',
        border:'1px solid rgba(72,72,71,0.25)',
        boxShadow:'0 16px 48px rgba(0,0,0,0.5)',
      }}
    >
      {/* "Add to playlist" — only if this is a music/podcast track */}
      {isMusic && (
        <>
          <p style={{ padding:'10px 14px 6px', fontSize:10, fontWeight:700,
            textTransform:'uppercase', letterSpacing:'0.12em',
            color:'var(--color-on-surface-variant)' }}>
            Add to playlist
          </p>

          {playlists === null ? (
            <p style={{ padding:'8px 14px', fontSize:12, color:'var(--color-on-surface-variant)' }}>Loading...</p>
          ) : playlists.length === 0 ? (
            <p style={{ padding:'8px 14px', fontSize:12, color:'var(--color-on-surface-variant)' }}>
              No playlists yet.<br/>Create one in Library.
            </p>
          ) : (
            playlists.map(pl => (
              <button key={pl.id} onClick={() => addTo(pl)}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:10,
                  padding:'9px 14px', background:'transparent', border:'none',
                  cursor:'pointer', textAlign:'left', transition:'background 0.1s',
                  color: added === pl.id ? 'var(--color-secondary)' : 'var(--color-on-surface)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-container-highest)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {added === pl.id
                  ? <Check size={16} color="var(--color-secondary)" />
                  : <ListMusic size={16} style={{ flexShrink:0 }} />
                }
                <span style={{ fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {pl.name}
                </span>
              </button>
            ))
          )}

          {/* Separator */}
          <div style={{ borderTop:'1px solid rgba(72,72,71,0.2)', margin:'4px 0' }} />
        </>
      )}

      {/* YouTube link — always visible */}
      <a
        href={`https://www.youtube.com/watch?v=${track.id}`}
        target="_blank" rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        style={{
          display:'flex', alignItems:'center', gap:10,
          padding:'9px 14px', fontSize:13, textDecoration:'none',
          color:'var(--color-on-surface-variant)',
          transition:'background 0.1s, color 0.1s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background='var(--color-surface-container-highest)'; e.currentTarget.style.color='var(--color-on-surface)'; }}
        onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--color-on-surface-variant)'; }}
      >
        <Youtube size={16} style={{ flexShrink:0 }} />
        Open on YouTube
      </a>
    </motion.div>
  );
}

/* ── TrackRow ──────────────────────────────── */
// isMusic=true → shows "Add to playlist" in context menu
// isMusic=false (default: auto-detect or passed explicitly) → only YouTube link
export default function TrackRow({ track, index, queue, showIndex = true, isMusic = true }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { play, currentTrack, isPlaying, toggleLike, isLiked } = usePlayerStore();

  const active = currentTrack?.id === track.id;
  const liked  = isLiked(track.id);

  const fmt = s => s ? `${Math.floor(s/60)}:${String(s%60|0).padStart(2,'0')}` : '';

  return (
    <motion.div
      initial={{ opacity:0, y:5 }}
      animate={{ opacity:1, y:0 }}
      transition={{ delay: Math.min(index*0.025, 0.35), duration:0.28 }}
      className="track-row group"
      style={{ position:'relative' }}
      onClick={() => { if (menuOpen) { setMenuOpen(false); return; } play(track, queue); }}
    >
      {/* Index / eq */}
      <div style={{ width:28, textAlign:'center', flexShrink:0, position:'relative', minHeight:20 }}>
        {active && isPlaying ? <EqBars /> : (
          <>
            {showIndex && (
              <span style={{ fontSize:13, color: active ? 'var(--color-primary)' : 'var(--color-on-surface-variant)' }}
                className="group-hover:invisible">
                {index+1}
              </span>
            )}
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
              opacity:0 }} className="group-hover:opacity-100">
              <Play size={16} fill="var(--color-on-surface)" color="var(--color-on-surface)" />
            </div>
          </>
        )}
      </div>

      {/* Thumbnail */}
      <div style={{ width:40, height:40, borderRadius:6, flexShrink:0,
        background:'var(--color-surface-container-high)', overflow:'hidden',
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        {track.thumbnail
          ? <img src={track.thumbnail} alt={track.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          : <ListMusic size={16} color="var(--color-on-surface-variant)" />
        }
      </div>

      {/* Title + artist */}
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:13, fontWeight:600, color: active ? 'var(--color-primary)' : 'var(--color-on-surface)',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{track.title}</p>
        <p style={{ fontSize:11, color:'var(--color-on-surface-variant)',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>{track.artist}</p>
      </div>

      {/* Duration */}
      {track.duration && (
        <span style={{ fontSize:11, color:'var(--color-on-surface-variant)', flexShrink:0, tabularNums:true }}>
          {fmt(track.duration)}
        </span>
      )}

      {/* Like */}
      <button onClick={e => { e.stopPropagation(); if (currentTrack?.id !== track.id) usePlayerStore.setState({ currentTrack:track }); toggleLike(); }}
        className="icon-btn" style={{ flexShrink:0, opacity:0, transition:'opacity 0.15s' }}
        data-hover-show title="Like">
        <Heart size={16} fill={liked ? 'var(--color-tertiary)' : 'none'}
          color={liked ? 'var(--color-tertiary)' : 'var(--color-on-surface-variant)'} strokeWidth={2} />
      </button>

      {/* More (context menu) */}
      <div style={{ position:'relative', flexShrink:0 }}>
        <button onClick={e => { e.stopPropagation(); setMenuOpen(v=>!v); }}
          className="icon-btn" style={{ opacity:0, transition:'opacity 0.15s' }}
          data-hover-show title="More">
          <MoreHorizontal size={16} />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <>
              <div style={{ position:'fixed', inset:0, zIndex:199 }}
                onClick={e => { e.stopPropagation(); setMenuOpen(false); }} />
              <ContextMenu track={track} isMusic={isMusic} onClose={() => setMenuOpen(false)} />
            </>
          )}
        </AnimatePresence>
      </div>

      {/* CSS to show hover-only elements */}
      <style>{`
        .group:hover [data-hover-show] { opacity: 1 !important; }
        .group:hover .group-hover\\:invisible { visibility: hidden; }
        .group:hover .group-hover\\:opacity-100 { opacity: 1 !important; }
      `}</style>
    </motion.div>
  );
}
