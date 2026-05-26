import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Heart, MoreHorizontal, ListMusic, Youtube, Check, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import usePlayerStore from '../store/playerStore.js';
import { playlistApi } from '../api/client.js';
import useT from '../i18n/useT.js';

function EqBars() {
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:14 }}>
      {[0,1,2].map(i=>(
        <div key={i} style={{ width:3, background:'var(--color-primary)', borderRadius:2,
          transformOrigin:'bottom', animation:`eq 0.8s ease-in-out infinite ${i*0.15}s`,
          height:[6,12,8][i] }}/>
      ))}
    </div>
  );
}

function ContextMenu({ track, isMusic, onClose }) {
  const [playlists,  setPlaylists]  = useState(null);
  const [added,      setAdded]      = useState(new Set());
  const t = useT();

  useState(() => {
    playlistApi.getAll().then(setPlaylists).catch(()=>setPlaylists([]));
  });

  async function addTo(pl) {
    if (added.has(pl.id)) {
      toast(t('alreadyAdded'));
      return;
    }
    try {
      await playlistApi.addTrack(pl.id, {
        youtubeId: track.id, title: track.title,
        artist: track.artist, duration: track.duration, thumbnail: track.thumbnail,
      });
      setAdded(s => new Set([...s, pl.id]));
      toast.success(`"${track.title}" ${t('addedTo')} "${pl.name}"`);
      setTimeout(onClose, 1200);
    } catch (e) {
      if (e.message?.includes('already') || e.message?.includes('duplicate')) {
        setAdded(s => new Set([...s, pl.id]));
        toast(t('alreadyAdded'));
      } else {
        toast.error(e.message || 'Failed');
      }
    }
  }

  // Close on ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div initial={{opacity:0,scale:0.92,y:-6}} animate={{opacity:1,scale:1,y:0}}
      exit={{opacity:0,scale:0.92,y:-6}} transition={{duration:0.13}}
      onClick={e=>e.stopPropagation()}
      style={{
        position:'absolute', right:0, top:36, zIndex:200,
        minWidth:200, borderRadius:10, overflow:'hidden',
        background:'var(--color-surface-container-high)',
        border:'1px solid var(--color-outline-variant)',
        boxShadow:'var(--shadow-lg)',
      }}
    >
      {isMusic && (
        <>
          <p style={{ padding:'8px 12px 4px', fontSize:9, fontWeight:700,
            textTransform:'uppercase', letterSpacing:'0.12em',
            color:'var(--color-on-surface-variant)' }}>{t('addToPlaylist')}</p>

          {playlists===null ? (
            <p style={{ padding:'8px 12px', fontSize:12, color:'var(--color-on-surface-variant)' }}>Loading...</p>
          ) : playlists.length===0 ? (
            <p style={{ padding:'8px 12px', fontSize:12, color:'var(--color-on-surface-variant)' }}>{t('noPlaylists')}</p>
          ) : (
            playlists.map(pl => (
              <button key={pl.id} onClick={()=>addTo(pl)}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:9,
                  padding:'8px 12px', background:'transparent', border:'none',
                  cursor:'pointer', textAlign:'left',
                  color: added.has(pl.id) ? 'var(--color-secondary)' : 'var(--color-on-surface)',
                  transition:'background 0.1s',
                }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--color-surface-container-highest)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                {added.has(pl.id)
                  ? <Check size={14} color="var(--color-secondary)"/>
                  : <ListMusic size={14} style={{flexShrink:0}}/>
                }
                <span style={{ fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {pl.name}
                </span>
              </button>
            ))
          )}
          <div style={{ borderTop:'1px solid var(--color-outline-variant)', margin:'3px 0' }}/>
        </>
      )}
      <a href={`https://www.youtube.com/watch?v=${track.id}`} target="_blank" rel="noopener noreferrer"
        onClick={e=>e.stopPropagation()}
        style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 12px',
          fontSize:12, textDecoration:'none', color:'var(--color-on-surface-variant)',
          transition:'background 0.1s, color 0.1s' }}
        onMouseEnter={e=>{e.currentTarget.style.background='var(--color-surface-container-highest)';e.currentTarget.style.color='var(--color-on-surface)';}}
        onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--color-on-surface-variant)';}}
      >
        <Youtube size={14} style={{flexShrink:0}}/> {t('openYoutube')}
      </a>
    </motion.div>
  );
}

export default function TrackRow({ track, index, queue, showIndex=true, isMusic=true }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { play, currentTrack, isPlaying, toggleLike, isLiked } = usePlayerStore();
  const active = currentTrack?.id === track.id;
  const liked  = isLiked(track.id);
  const fmt = s => s ? `${Math.floor(s/60)}:${String(s%60|0).padStart(2,'0')}` : '';

  return (
    <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}}
      transition={{delay:Math.min(index*0.02,0.3),duration:0.26}}
      className="track-row group" style={{position:'relative'}}
      onClick={()=>{if(menuOpen){setMenuOpen(false);return;} play(track,queue);}}>

      <div style={{ width:26, textAlign:'center', flexShrink:0, position:'relative', minHeight:18 }}>
        {active && isPlaying ? <EqBars/> : (
          <>
            {showIndex && (
              <span style={{ fontSize:12, color:active?'var(--color-primary)':'var(--color-on-surface-variant)' }}
                className="group-hover:invisible">{index+1}</span>
            )}
            <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',
              justifyContent:'center',opacity:0}} className="group-hover:opacity-100">
              <Play size={14} fill="var(--color-on-surface)" color="var(--color-on-surface)"/>
            </div>
          </>
        )}
      </div>

      <div style={{ width:38, height:38, borderRadius:5, flexShrink:0,
        background:'var(--color-surface-container-high)', overflow:'hidden',
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        {track.thumbnail
          ? <img src={track.thumbnail} alt={track.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          : <ListMusic size={14} color="var(--color-on-surface-variant)"/>
        }
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          color:active?'var(--color-primary)':'var(--color-on-surface)' }}>{track.title}</p>
        <p style={{ fontSize:11, color:'var(--color-on-surface-variant)',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>{track.artist}</p>
      </div>

      {track.duration && (
        <span style={{ fontSize:11, color:'var(--color-on-surface-variant)', flexShrink:0 }}>
          {fmt(track.duration)}
        </span>
      )}

      <button onClick={e=>{e.stopPropagation();
        if(currentTrack?.id!==track.id) usePlayerStore.setState({currentTrack:track});
        toggleLike();}}
        className="icon-btn" style={{flexShrink:0,opacity:0,transition:'opacity 0.15s'}} data-hover-show>
        <Heart size={14} fill={liked?'var(--color-tertiary)':'none'}
          color={liked?'var(--color-tertiary)':'var(--color-on-surface-variant)'} strokeWidth={2}/>
      </button>

      <div style={{ position:'relative', flexShrink:0 }}>
        <button onClick={e=>{e.stopPropagation();setMenuOpen(v=>!v);}}
          className="icon-btn" style={{opacity:0,transition:'opacity 0.15s'}} data-hover-show>
          <MoreHorizontal size={14}/>
        </button>
        <AnimatePresence>
          {menuOpen && (
            <>
              <div style={{position:'fixed',inset:0,zIndex:199}} onClick={e=>{e.stopPropagation();setMenuOpen(false);}}/>
              <ContextMenu track={track} isMusic={isMusic} onClose={()=>setMenuOpen(false)}/>
            </>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .group:hover [data-hover-show]{opacity:1!important}
        .group:hover .group-hover\\:invisible{visibility:hidden}
        .group:hover .group-hover\\:opacity-100{opacity:1!important}
      `}</style>
    </motion.div>
  );
}
