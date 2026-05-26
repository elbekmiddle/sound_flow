import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Heart, Sparkles, History } from 'lucide-react';
import useAuthStore from '../store/authStore.js';
import usePlayerStore from '../store/playerStore.js';
import { musicApi, historyApi } from '../api/client.js';
import TrackRow from '../components/TrackRow.jsx';
import useT from '../i18n/useT.js';

const GRADS = [
  'linear-gradient(135deg,rgba(139,92,246,.5),#1e0342)',
  'linear-gradient(135deg,rgba(6,182,212,.4),#0a2a3d)',
  'linear-gradient(135deg,rgba(244,63,94,.4),#3b0218)',
  'linear-gradient(135deg,rgba(245,158,11,.4),#3b1a03)',
  'linear-gradient(135deg,rgba(16,185,129,.4),#032f21)',
  'linear-gradient(135deg,rgba(99,102,241,.5),#13124a)',
];

function Skel({ w, h, style={} }) {
  return <div className="skeleton" style={{ width:w, height:h, ...style }}/>;
}

export default function HomePage() {
  const { profile }   = useAuthStore();
  const { play }      = usePlayerStore();
  const t             = useT();
  const [trending,  setTrending]  = useState(null);
  const [history,   setHistory]   = useState(null);
  const [recs,      setRecs]      = useState(null);

  const hr = new Date().getHours();
  const greeting = hr<12 ? t('goodMorning') : hr<17 ? t('goodAfternoon') : t('goodEvening');
  const name = profile?.display_name || '';

  useEffect(() => {
    musicApi.trending().then(setTrending).catch(()=>setTrending([]));
    historyApi.get().then(d=>setHistory(d.slice(0,6))).catch(()=>setHistory([]));
    musicApi.recommendations().then(setRecs).catch(()=>setRecs([]));
  }, []);

  const C = { text:'var(--color-on-surface)', muted:'var(--color-on-surface-variant)',
    surf:'var(--color-surface-container)', surfH:'var(--color-surface-container-high)',
    surfB:'var(--color-surface-bright)', prim:'var(--color-primary)' };

  const quickPicks = [
    { label:t('likedSongs'),     Icon:Heart,    color:'var(--color-tertiary)',  grad:'linear-gradient(135deg,rgba(255,148,164,.25),#3b0218)' },
    { label:t('recentlyPlayed'), Icon:History,  color:'var(--color-secondary)', grad:'linear-gradient(135deg,rgba(74,248,227,.2),#032f21)' },
    { label:t('recommended'),    Icon:Sparkles, color:'var(--color-primary)',   grad:'linear-gradient(135deg,rgba(199,153,255,.25),#1e0342)' },
  ];

  return (
    <div style={{ padding:'20px 16px 0', maxWidth:1280, margin:'0 auto' }}>

      {/* Header */}
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} style={{ marginBottom:24 }}>
        <p style={{ color:C.muted, fontSize:13 }}>{greeting}</p>
        <h1 style={{ fontFamily:'var(--font-headline)', fontWeight:900, fontSize:26,
          letterSpacing:'-0.03em', marginTop:2, color:C.text }}>{name}</h1>
      </motion.div>

      {/* Quick picks */}
      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.05}}
        style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',
          gap:8, marginBottom:28 }}>
        {quickPicks.map(({ label, Icon, color, grad }, i) => (
          <button key={i}
            onClick={()=>{ if(trending?.length) play(trending[i%trending.length], trending); }}
            style={{ display:'flex', alignItems:'center', gap:10,
              background:C.surfH, borderRadius:8, border:'none', cursor:'pointer',
              overflow:'hidden', transition:'background 0.15s' }}
            onMouseEnter={e=>e.currentTarget.style.background=C.surfB}
            onMouseLeave={e=>e.currentTarget.style.background=C.surfH}
          >
            <div style={{ width:50, height:50, flexShrink:0, background:grad,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon size={20} color={color} fill={i===0?color:'none'}/>
            </div>
            <span style={{ fontWeight:600, fontSize:12, color:C.text }}>{label}</span>
          </button>
        ))}
      </motion.div>

      {/* Trending */}
      <section style={{ marginBottom:28 }}>
        <motion.h2 initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.1}}
          style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:18,
            letterSpacing:'-0.02em', marginBottom:14, color:C.text }}>
          {t('trending')}
        </motion.h2>
        <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:8 }} className="no-scrollbar">
          {trending===null
            ? Array(6).fill(0).map((_,i)=><Skel key={i} w={156} h={200} style={{flexShrink:0}}/>)
            : trending.length===0
              ? <p style={{color:C.muted,fontSize:13}}>{t('noResults')}</p>
              : trending.slice(0,10).map((track,i)=>(
                  <motion.button key={track.id}
                    initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                    transition={{delay:0.06+i*0.04}}
                    onClick={()=>play(track,trending)}
                    style={{ width:156, flexShrink:0, background:C.surf, borderRadius:10,
                      overflow:'hidden', border:'none', cursor:'pointer', textAlign:'left',
                      transition:'transform 0.2s, background 0.15s' }}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.background=C.surfH;}}
                    onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.background=C.surf;}}
                  >
                    <div style={{ height:156, background:GRADS[i%GRADS.length], position:'relative', overflow:'hidden' }}>
                      {track.thumbnail && <img src={track.thumbnail} alt={track.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
                      <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0)',
                        display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.15s'}}
                        onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,0,0,0.4)';e.currentTarget.querySelector('svg').style.opacity='1';}}
                        onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,0,0,0)';e.currentTarget.querySelector('svg').style.opacity='0';}}>
                        <Play size={44} fill="#fff" color="#fff" style={{opacity:0,transition:'opacity 0.15s'}}/>
                      </div>
                    </div>
                    <div style={{padding:'8px 10px 10px'}}>
                      <p style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:C.text}}>{track.title}</p>
                      <p style={{fontSize:11,color:C.muted,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{track.artist}</p>
                    </div>
                  </motion.button>
                ))
          }
        </div>
      </section>

      {/* Recently Played */}
      <section style={{ marginBottom:28 }}>
        <h2 style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:18,
          letterSpacing:'-0.02em', marginBottom:12, color:C.text }}>{t('recentlyPlayed')}</h2>
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {history===null
            ? Array(4).fill(0).map((_,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px'}}>
                  <Skel w={26} h={12}/> <Skel w={38} h={38}/>
                  <div style={{flex:1}}><Skel w="55%" h={11} style={{marginBottom:5}}/><Skel w="30%" h={9}/></div>
                </div>
              ))
            : history.length===0
              ? <p style={{color:C.muted,fontSize:13,padding:'16px 0',textAlign:'center'}}>{t('noHistory')}</p>
              : history.map((t2,i)=><TrackRow key={t2.id} track={t2} index={i} queue={history} isMusic={true}/>)
          }
        </div>
      </section>

      {/* Recommendations */}
      {recs && recs.length>0 && (
        <section style={{ marginBottom:28 }}>
          <div style={{ marginBottom:12 }}>
            <h2 style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:18,
              letterSpacing:'-0.02em', color:C.text }}>{t('forYou')}</h2>
            <p style={{ fontSize:11, color:C.muted, marginTop:2 }}>{t('basedOnHistory')}</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(148px,1fr))', gap:12 }}>
            {recs.map((track,i)=>(
              <motion.button key={track.id}
                initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
                transition={{delay:0.05+i*0.04}}
                onClick={()=>play(track,recs)}
                style={{ background:C.surf, borderRadius:10, padding:10, border:'none', cursor:'pointer',
                  textAlign:'left', transition:'transform 0.2s, background 0.15s' }}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.background=C.surfH;}}
                onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.background=C.surf;}}
              >
                <div style={{ width:'100%', aspectRatio:'1', borderRadius:7, overflow:'hidden',
                  background:GRADS[i%GRADS.length], marginBottom:8 }}>
                  {track.thumbnail && <img src={track.thumbnail} alt={track.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
                </div>
                <p style={{fontSize:11,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:C.text}}>{track.title}</p>
                <p style={{fontSize:10,color:C.muted,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{track.artist}</p>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {/* Created by footer */}
      <div style={{ padding:'16px 0 8px', textAlign:'center',
        borderTop:'1px solid var(--color-outline-variant)', marginTop:8 }}>
        <p style={{ fontSize:11, color:C.muted, opacity:0.5 }}>
          {useT()('createdBy')}
        </p>
      </div>
    </div>
  );
}
