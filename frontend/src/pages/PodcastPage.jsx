import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Play } from 'lucide-react';
import { podcastApi, musicApi } from '../api/client.js';
import usePlayerStore from '../store/playerStore.js';
import TrackRow from '../components/TrackRow.jsx';
import useT from '../i18n/useT.js';

const GRADS = [
  'linear-gradient(135deg,rgba(245,158,11,.6),#78350f)',
  'linear-gradient(135deg,rgba(99,102,241,.5),#13124a)',
  'linear-gradient(135deg,rgba(244,63,94,.4),#3b0218)',
  'linear-gradient(135deg,rgba(16,185,129,.4),#032f21)',
  'linear-gradient(135deg,rgba(139,92,246,.5),#1e0342)',
  'linear-gradient(135deg,rgba(6,182,212,.4),#0a2a3d)',
];

export default function PodcastPage() {
  const [podcasts,  setPodcasts]  = useState(null);
  const [podSearch, setPodSearch] = useState(null);
  const { play } = usePlayerStore();
  const t = useT();

  useEffect(() => {
    // Search for podcasts from YouTube (long-form audio 5min–3hr)
    musicApi.search('podcast uzbek 2025', 20).then(d => {
      const pods = (d?.results||[]).filter(r=>r.duration>=300);
      setPodSearch(pods);
    }).catch(()=>setPodSearch([]));

    podcastApi.getAll().then(d=>setPodcasts(d)).catch(()=>setPodcasts([]));
  }, []);

  const C = { text:'var(--color-on-surface)', muted:'var(--color-on-surface-variant)',
    surf:'var(--color-surface-container)', surfH:'var(--color-surface-container-high)' };

  return (
    <div style={{padding:'20px 16px 0',maxWidth:1280,margin:'0 auto'}}>
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} style={{marginBottom:24}}>
        <h1 style={{fontFamily:'var(--font-headline)',fontWeight:900,fontSize:26,
          letterSpacing:'-0.03em',color:C.text}}>{t('podcasts')}</h1>
      </motion.div>

      {/* Podcast search results (YouTube long-form) */}
      <section style={{marginBottom:28}}>
        <h2 style={{fontFamily:'var(--font-headline)',fontWeight:800,fontSize:18,
          marginBottom:14,color:C.text}}>{t('popularShows')}</h2>

        {podSearch===null ? (
          <div style={{display:'flex',flexDirection:'column',gap:3}}>
            {Array(5).fill(0).map((_,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px'}}>
                <div className="skeleton" style={{width:26,height:12}}/>
                <div className="skeleton" style={{width:38,height:38}}/>
                <div style={{flex:1}}>
                  <div className="skeleton" style={{height:11,width:'55%',marginBottom:5}}/>
                  <div className="skeleton" style={{height:9,width:'30%'}}/>
                </div>
              </div>
            ))}
          </div>
        ) : podSearch.length===0 ? (
          <p style={{color:C.muted,fontSize:13}}>No podcasts found.</p>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:2}}>
            {podSearch.map((track,i)=>(
              <TrackRow key={track.id} track={track} index={i} queue={podSearch} isMusic={true}/>
            ))}
          </div>
        )}
      </section>

      {/* DB podcasts if any */}
      {podcasts&&podcasts.length>0&&(
        <section style={{marginBottom:28}}>
          <h2 style={{fontFamily:'var(--font-headline)',fontWeight:800,fontSize:18,
            marginBottom:14,color:C.text}}>Shows</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(148px,1fr))',gap:12}}>
            {podcasts.map((p,i)=>(
              <motion.button key={p.id}
                initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} transition={{delay:i*0.04}}
                style={{background:C.surf,borderRadius:10,overflow:'hidden',border:'none',cursor:'pointer',textAlign:'left',
                  transition:'transform 0.2s,background 0.15s'}}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.background=C.surfH;}}
                onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.background=C.surf;}}>
                <div style={{width:'100%',aspectRatio:'1',background:GRADS[i%GRADS.length],
                  display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Radio size={40} color="rgba(255,255,255,0.25)"/>
                </div>
                <div style={{padding:'8px 10px 10px'}}>
                  <p style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:C.text}}>{p.name}</p>
                  {p.episode_count&&<p style={{fontSize:10,color:C.muted,marginTop:2}}>{p.episode_count} {t('episodes')}</p>}
                </div>
              </motion.button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
