import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Shuffle, Trash2, Heart, ListMusic } from 'lucide-react';
import toast from 'react-hot-toast';
import { playlistApi, libraryApi } from '../api/client.js';
import usePlayerStore from '../store/playerStore.js';
import TrackRow from '../components/TrackRow.jsx';

export default function PlaylistPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { play }  = usePlayerStore();
  const [data, setData]     = useState(null);
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    setLoad(true); setData(null);
    const fetch = id==='liked'
      ? libraryApi.getLiked().then(tracks => ({
          id:'liked', name:'Liked Songs', description:'All your favourite tracks.',
          track_count:tracks.length, tracks, isLiked:true,
        }))
      : playlistApi.getOne(id);

    fetch.then(setData)
      .catch(()=>{ toast.error('Playlist not found'); navigate('/library'); })
      .finally(()=>setLoad(false));
  }, [id]);

  const C = { text:'var(--color-on-surface)', muted:'var(--color-on-surface-variant)',
    prim:'var(--color-primary)', tert:'var(--color-tertiary)' };

  if (loading) return (
    <div style={{ padding:'24px 16px' }}>
      <div style={{ display:'flex', flexWrap:'wrap', gap:24, marginBottom:32 }}>
        <div className="skeleton" style={{ width:180, height:180, borderRadius:12, flexShrink:0 }} />
        <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-end', gap:10, minWidth:200 }}>
          <div className="skeleton" style={{ width:56, height:10 }} />
          <div className="skeleton" style={{ width:240, height:32 }} />
          <div className="skeleton" style={{ width:120, height:10 }} />
          <div style={{ display:'flex', gap:12, marginTop:6 }}>
            <div className="skeleton" style={{ width:110, height:40, borderRadius:99 }} />
            <div className="skeleton" style={{ width:110, height:40, borderRadius:99 }} />
          </div>
        </div>
      </div>
      {Array(6).fill(0).map((_,i)=>(
        <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px' }}>
          <div className="skeleton" style={{ width:28, height:14 }} />
          <div className="skeleton" style={{ width:40, height:40 }} />
          <div style={{ flex:1 }}><div className="skeleton" style={{ height:12, width:'55%', marginBottom:6 }} />
            <div className="skeleton" style={{ height:10, width:'30%' }} /></div>
        </div>
      ))}
    </div>
  );

  if (!data) return null;

  const total  = data.tracks?.reduce((a,t)=>a+(t.duration||0),0)||0;
  const durStr = total>3600
    ? `${Math.floor(total/3600)}h ${Math.floor((total%3600)/60)}m`
    : `${Math.floor(total/60)} min`;

  return (
    <div style={{ padding:'24px 16px 0', maxWidth:1280, margin:'0 auto' }}>
      {/* Header */}
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
        style={{ display:'flex', flexWrap:'wrap', gap:22, marginBottom:36 }}>
        {/* Cover */}
        <div style={{
          width:180, height:180, borderRadius:14, flexShrink:0,
          background: data.isLiked
            ? 'linear-gradient(135deg,rgba(255,148,164,.3),#3b0218)'
            : 'linear-gradient(135deg,rgba(199,153,255,.3),#1e0342)',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 16px 60px rgba(199,153,255,0.12)',
        }}>
          {data.isLiked
            ? <Heart size={64} fill={C.tert} color={C.tert} />
            : <ListMusic size={64} color={C.prim} />
          }
        </div>

        {/* Meta */}
        <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end', minWidth:0 }}>
          <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.15em',
            color:C.muted, marginBottom:8 }}>Playlist</p>
          <h1 style={{ fontFamily:'var(--font-headline)', fontWeight:900, fontSize:32,
            letterSpacing:'-0.03em', marginBottom:6, color:C.text }}>{data.name}</h1>
          {data.description && <p style={{ color:C.muted, fontSize:13, marginBottom:6 }}>{data.description}</p>}
          <p style={{ color:C.muted, fontSize:12, marginBottom:18 }}>
            {data.track_count||data.tracks?.length||0} songs{total>0 && ` · ${durStr}`}
          </p>

          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <button
              onClick={() => data.tracks?.length && play(data.tracks[0], data.tracks)}
              disabled={!data.tracks?.length}
              style={{
                display:'flex', alignItems:'center', gap:8,
                background:C.prim, color:'var(--color-on-primary-container)',
                fontFamily:'var(--font-headline)', fontWeight:700,
                padding:'10px 20px', borderRadius:99, border:'none', cursor:'pointer',
                fontSize:14, transition:'all 0.15s', opacity:!data.tracks?.length?0.4:1,
              }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--color-primary-container)'}
              onMouseLeave={e=>e.currentTarget.style.background=C.prim}
            >
              <Play size={20} fill="var(--color-on-primary-container)" color="var(--color-on-primary-container)" />
              Play All
            </button>

            <button
              onClick={() => {
                if (!data.tracks?.length) return;
                const s = [...data.tracks].sort(()=>Math.random()-0.5);
                play(s[0], s);
                usePlayerStore.setState({ shuffle:true });
              }}
              style={{ display:'flex', alignItems:'center', gap:8,
                background:'var(--color-surface-container)',
                color:C.text, fontFamily:'var(--font-headline)', fontWeight:600,
                padding:'10px 18px', borderRadius:99, border:'none', cursor:'pointer',
                fontSize:14, transition:'background 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--color-surface-container-high)'}
              onMouseLeave={e=>e.currentTarget.style.background='var(--color-surface-container)'}
            >
              <Shuffle size={18}/> Shuffle
            </button>

            {!data.isLiked && (
              <button onClick={async()=>{
                if(confirm(`Delete "${data.name}"?`)){
                  await playlistApi.delete(id);
                  toast.success('Playlist deleted');
                  navigate('/library');
                }
              }}
              className="icon-btn" title="Delete playlist">
                <Trash2 size={20} />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tracks */}
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.15 }}>
        {!data.tracks?.length ? (
          <div style={{ textAlign:'center', padding:'56px 0', color:C.muted }}>
            <ListMusic size={52} style={{ display:'block', margin:'0 auto 14px', opacity:0.25 }} />
            <p style={{ fontWeight:600, fontSize:15 }}>No tracks yet</p>
            <p style={{ fontSize:13, marginTop:4 }}>Search for music and add tracks here.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {data.tracks.map((t,i) => <TrackRow key={t.id+i} track={t} index={i} queue={data.tracks} isMusic={true} />)}
          </div>
        )}
      </motion.div>
    </div>
  );
}
