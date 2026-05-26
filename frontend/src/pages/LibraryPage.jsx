import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Heart, ListMusic, History } from 'lucide-react';
import Modal from '../components/Modal.jsx';
import toast from 'react-hot-toast';
import useT from '../i18n/useT.js';
import { playlistApi, libraryApi, historyApi } from '../api/client.js';
import TrackRow from '../components/TrackRow.jsx';

function CreateModal({ onClose, onCreate }) {
  const [name, setName]     = useState('');
  const [loading, setLoad]  = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoad(true);
    try { const pl = await playlistApi.create({ name }); onCreate(pl); toast.success(`Created "${name}"`); onClose(); }
    catch { toast.error('Failed'); }
    finally { setLoad(false); }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center',
      justifyContent:'center', background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)' }}
      onClick={onClose}>
      <motion.div initial={{ opacity:0, scale:0.93 }} animate={{ opacity:1, scale:1 }}
        onClick={e=>e.stopPropagation()}
        style={{ background:'var(--color-surface-container)', width:'100%', maxWidth:360,
          borderRadius:16, padding:28, margin:'0 16px', boxShadow:'0 24px 80px rgba(0,0,0,0.5)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <h3 style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:20 }}>Create Playlist</h3>
          <button onClick={onClose} className="icon-btn"><X size={18}/></button>
        </div>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em',
              color:'var(--color-on-surface-variant)', display:'block', marginBottom:6 }}>Name</label>
            <input autoFocus type="text" value={name} onChange={e=>setName(e.target.value)}
              placeholder="My playlist" className="input-field" />
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button type="button" onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
              color:'var(--color-on-surface-variant)', fontSize:13, padding:'8px 16px' }}>Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary"
              style={{ padding:'8px 20px', fontSize:13, borderRadius:8 }}>
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

const TABS = ['playlists','liked','history'];

export default function LibraryPage() {
  const { tab: pt } = useParams();
  const navigate    = useNavigate();
  const [tab, setTab]             = useState(pt||'playlists');
  const [playlists, setPlaylists] = useState(null);
  const [liked,     setLiked]     = useState(null);
  const [history,   setHistory]   = useState(null);
  const [modal, setModal]         = useState(false);

  const go = t => { setTab(t); navigate(`/library/${t}`, { replace:true }); };

  useEffect(() => {
    playlistApi.getAll().then(setPlaylists).catch(()=>setPlaylists([]));
    libraryApi.getLiked().then(setLiked).catch(()=>setLiked([]));
    historyApi.get().then(setHistory).catch(()=>setHistory([]));
  }, []);

  const C = { text:'var(--color-on-surface)', muted:'var(--color-on-surface-variant)',
    surf:'var(--color-surface-container)', surfH:'var(--color-surface-container-high)',
    prim:'var(--color-primary)', tert:'var(--color-tertiary)' };

  function PLCard({ pl, onClick }) {
    return (
      <motion.button initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
        onClick={onClick}
        style={{ background:C.surf, borderRadius:12, padding:14, border:'none', cursor:'pointer', textAlign:'left',
          transition:'transform 0.2s, background 0.2s' }}
        onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.background=C.surfH; }}
        onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)';    e.currentTarget.style.background=C.surf; }}
      >
        <div style={{ width:'100%', aspectRatio:'1', borderRadius:8, marginBottom:10,
          background: pl.isLiked ? 'rgba(255,148,164,0.1)' : 'rgba(199,153,255,0.08)',
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          {pl.isLiked
            ? <Heart size={36} fill={C.tert} color={C.tert} />
            : <ListMusic size={36} color={C.prim} />
          }
        </div>
        <p style={{ fontSize:13, fontWeight:600, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pl.name}</p>
        <p style={{ fontSize:11, color:C.muted, marginTop:2 }}>{pl.track_count||0} songs</p>
      </motion.button>
    );
  }

  return (
    <div style={{ padding:'24px 16px 0', maxWidth:1280, margin:'0 auto' }}>
      {/* Header */}
      <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
        style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <h1 style={{ fontFamily:'var(--font-headline)', fontWeight:900, fontSize:28, letterSpacing:'-0.03em' }}>Library</h1>
        <button onClick={()=>setModal(true)}
          style={{ display:'flex', alignItems:'center', gap:8, background:C.surf, padding:'9px 16px',
            borderRadius:99, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, color:C.text,
            transition:'background 0.15s' }}
          onMouseEnter={e=>e.currentTarget.style.background=C.surfH}
          onMouseLeave={e=>e.currentTarget.style.background=C.surf}>
          <Plus size={16}/> New Playlist
        </button>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.04 }}
        style={{ display:'flex', gap:8, marginBottom:20, overflowX:'auto' }} className="no-scrollbar">
        {TABS.map(t=>(
          <button key={t} onClick={()=>go(t)}
            className={`chip${tab===t?' active':''}`}
            style={{ flexShrink:0, textTransform:'capitalize' }}>{t}</button>
        ))}
      </motion.div>

      {/* Playlists */}
      {tab==='playlists' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:14 }}>
          {/* Liked songs */}
          <PLCard pl={{ name:'Liked Songs', track_count: liked?.length||0, isLiked:true }}
            onClick={()=>navigate('/playlist/liked')} />

          {playlists===null
            ? Array(3).fill(0).map((_,i)=><div key={i} className="skeleton" style={{ aspectRatio:'0.9', borderRadius:12 }} />)
            : playlists.map((pl,i)=>(
                <PLCard key={pl.id} pl={pl} onClick={()=>navigate(`/playlist/${pl.id}`)} />
              ))
          }

          {/* New playlist card */}
          <motion.button initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
            onClick={()=>setModal(true)}
            style={{ background:'transparent', borderRadius:12, padding:14, border:'2px dashed rgba(72,72,71,0.25)',
              cursor:'pointer', textAlign:'left', transition:'border-color 0.15s' }}
            onMouseEnter={e=> { e.currentTarget.style.borderColor='rgba(199,153,255,0.35)'; }}
            onMouseLeave={e=> { e.currentTarget.style.borderColor='rgba(72,72,71,0.25)'; }}
          >
            <div style={{ width:'100%', aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center',
              color:'rgba(173,170,170,0.35)', marginBottom:10 }}>
              <Plus size={38} />
            </div>
            <p style={{ fontSize:13, fontWeight:600, color:C.muted }}>New Playlist</p>
          </motion.button>
        </motion.div>
      )}

      {/* Liked */}
      {tab==='liked' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
          {liked===null ? <p style={{ color:C.muted, fontSize:13 }}>Loading...</p>
          : liked.length===0 ? (
            <div style={{ textAlign:'center', padding:'56px 0', color:C.muted }}>
              <Heart size={52} style={{ display:'block', margin:'0 auto 14px', opacity:0.25 }} />
              <p style={{ fontWeight:600, fontSize:15 }}>No liked songs yet</p>
              <p style={{ fontSize:13, marginTop:4 }}>Tap ♥ on any track to save it here.</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              {liked.map((t,i)=><TrackRow key={t.id} track={t} index={i} queue={liked} isMusic={true} />)}
            </div>
          )}
        </motion.div>
      )}

      {/* History */}
      {tab==='history' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
          {history===null ? <p style={{ color:C.muted, fontSize:13 }}>Loading...</p>
          : history.length===0 ? (
            <div style={{ textAlign:'center', padding:'56px 0', color:C.muted }}>
              <History size={52} style={{ display:'block', margin:'0 auto 14px', opacity:0.25 }} />
              <p style={{ fontWeight:600, fontSize:15 }}>No listening history</p>
              <p style={{ fontSize:13, marginTop:4 }}>Start playing music to build your history.</p>
            </div>
          ) : (
            <>
              <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
                <button onClick={()=>{ historyApi.clear(); setHistory([]); toast('History cleared'); }}
                  style={{ background:'none', border:'none', cursor:'pointer', color:C.muted,
                    fontSize:12, fontWeight:600, transition:'color 0.15s' }}
                  onMouseEnter={e=> { e.currentTarget.style.color='var(--color-error)'; }}
                  onMouseLeave={e=>e.currentTarget.style.color=C.muted}>
                  Clear history
                </button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                {history.map((t,i)=><TrackRow key={t.id+i} track={t} index={i} queue={history} isMusic={true} />)}
              </div>
            </>
          )}
        </motion.div>
      )}

      {modal && <CreateModal onClose={()=>setModal(false)} onCreate={pl=>setPlaylists(p=>[pl,...(p||[])])} />}
    </div>
  );
}
