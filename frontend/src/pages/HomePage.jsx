import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles, History, Play } from 'lucide-react';
import useAuthStore from '../store/authStore.js';
import usePlayerStore from '../store/playerStore.js';
import { musicApi, historyApi } from '../api/client.js';
import TrackRow from '../components/TrackRow.jsx';

const GRADS = [
  'linear-gradient(135deg,rgba(139,92,246,.5),#1e0342)',
  'linear-gradient(135deg,rgba(6,182,212,.4),#0a2a3d)',
  'linear-gradient(135deg,rgba(244,63,94,.4),#3b0218)',
  'linear-gradient(135deg,rgba(245,158,11,.4),#3b1a03)',
  'linear-gradient(135deg,rgba(16,185,129,.4),#032f21)',
  'linear-gradient(135deg,rgba(99,102,241,.5),#13124a)',
];

function Skel({ w, h, style={} }) {
  return <div className="skeleton" style={{ width:w, height:h, ...style }} />;
}

const stagger = { hidden:{}, show:{ transition:{ staggerChildren:0.06 } } };
const item = { hidden:{ opacity:0, y:14 }, show:{ opacity:1, y:0, transition:{ duration:0.38, ease:[0.16,1,0.3,1] } } };

export default function HomePage() {
  const { profile } = useAuthStore();
  const { play } = usePlayerStore();
  const [trending, setTrending] = useState(null);
  const [history,  setHistory]  = useState(null);

  const h = new Date().getHours();
  const greeting = h<12 ? 'Good morning' : h<17 ? 'Good afternoon' : 'Good evening';
  const name = profile?.display_name || 'there';

  useEffect(() => {
    musicApi.trending().then(setTrending).catch(() => setTrending([]));
    historyApi.get().then(t => setHistory(t.slice(0,6))).catch(() => setHistory([]));
  }, []);

  const quickPicks = [
    { label:'Liked Songs', Icon:Heart, color:'var(--color-tertiary)', grad:'linear-gradient(135deg,rgba(255,148,164,.25),#3b0218)' },
    { label:'Your Mix', Icon:Sparkles, color:'var(--color-primary)', grad:'linear-gradient(135deg,rgba(199,153,255,.25),#1e0342)' },
    { label:'Recently Played', Icon:History, color:'var(--color-secondary)', grad:'linear-gradient(135deg,rgba(74,248,227,.2),#032f21)' },
  ];

  return (
    <div style={{ padding:'24px 16px 0', maxWidth:1280, margin:'0 auto' }}
      className="md:px-32">
      <style>{`@media(min-width:768px){ .home-pad{ padding: 24px 32px 0 !important; } }`}</style>

      {/* Header */}
      <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
        style={{ marginBottom:28 }}>
        <p style={{ color:'var(--color-on-surface-variant)', fontSize:13 }}>{greeting}</p>
        <h1 style={{ fontFamily:'var(--font-headline)', fontWeight:900, fontSize:28, letterSpacing:'-0.03em', marginTop:2 }}>
          {name}
        </h1>
      </motion.div>

      {/* Quick picks */}
      <motion.div variants={stagger} initial="hidden" animate="show"
        style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:10, marginBottom:36 }}>
        {quickPicks.map(({ label, Icon, color, grad }, i) => (
          <motion.button key={i} variants={item}
            onClick={() => trending?.length && play(trending[i%trending.length], trending)}
            style={{ display:'flex', alignItems:'center', gap:12,
              background:'var(--color-surface-container-high)',
              borderRadius:10, border:'none', cursor:'pointer',
              overflow:'hidden', transition:'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background='var(--color-surface-bright)'}
            onMouseLeave={e => e.currentTarget.style.background='var(--color-surface-container-high)'}
          >
            <div style={{ width:54, height:54, flexShrink:0, background:grad,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon size={22} color={color} fill={i===0?color:'none'} />
            </div>
            <span style={{ fontWeight:600, fontSize:13, color:'var(--color-on-surface)', textAlign:'left' }}>{label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Trending */}
      <section style={{ marginBottom:36 }}>
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.12 }}
          style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <h2 style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:19, letterSpacing:'-0.02em' }}>
            Trending Now
          </h2>
        </motion.div>

        <div style={{ display:'flex', gap:14, overflowX:'auto', paddingBottom:10 }} className="no-scrollbar">
          {trending === null
            ? Array(6).fill(0).map((_,i)=><Skel key={i} w={168} h={218} style={{ flexShrink:0 }} />)
            : trending.slice(0,8).map((track,i)=>(
                <motion.button key={track.id}
                  initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                  transition={{ delay:0.08+i*0.04 }}
                  onClick={() => play(track, trending)}
                  style={{
                    width:168, flexShrink:0, background:'var(--color-surface-container)',
                    borderRadius:12, overflow:'hidden', border:'none', cursor:'pointer', textAlign:'left',
                    transition:'transform 0.2s, background 0.2s',
                  }}
                  onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.background='var(--color-surface-container-high)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)';    e.currentTarget.style.background='var(--color-surface-container)'; }}
                >
                  <div style={{ height:168, background:GRADS[i%GRADS.length], position:'relative', overflow:'hidden' }}>
                    {track.thumbnail && <img src={track.thumbnail} alt={track.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
                    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0)', display:'flex',
                      alignItems:'center', justifyContent:'center', transition:'background 0.15s' }}
                      onMouseEnter={e=>{ e.currentTarget.style.background='rgba(0,0,0,0.4)'; e.currentTarget.querySelector('svg').style.opacity='1'; }}
                      onMouseLeave={e=>{ e.currentTarget.style.background='rgba(0,0,0,0)';   e.currentTarget.querySelector('svg').style.opacity='0'; }}
                    >
                      <Play size={48} fill="#fff" color="#fff" style={{ opacity:0, transition:'opacity 0.15s' }} />
                    </div>
                  </div>
                  <div style={{ padding:'10px 12px 12px' }}>
                    <p style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{track.title}</p>
                    <p style={{ fontSize:11, color:'var(--color-on-surface-variant)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{track.artist}</p>
                  </div>
                </motion.button>
              ))
          }
        </div>
      </section>

      {/* Recently Played */}
      <section style={{ marginBottom:36 }}>
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
          style={{ marginBottom:12 }}>
          <h2 style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:19, letterSpacing:'-0.02em' }}>
            Recently Played
          </h2>
        </motion.div>

        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {history===null
            ? Array(4).fill(0).map((_,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px' }}>
                  <Skel w={28} h={14} /> <Skel w={40} h={40} />
                  <div style={{ flex:1 }}><Skel w="55%" h={12} style={{ marginBottom:6 }} /><Skel w="30%" h={10} /></div>
                </div>
              ))
            : history.length===0
              ? <p style={{ color:'var(--color-on-surface-variant)', fontSize:13, padding:'20px 0', textAlign:'center' }}>No history yet. Start listening!</p>
              : history.map((t,i)=><TrackRow key={t.id} track={t} index={i} queue={history} isMusic={true} />)
          }
        </div>
      </section>

      {/* Recommended */}
      {trending && trending.length > 8 && (
        <section style={{ marginBottom:36 }}>
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.26 }}
            style={{ marginBottom:16 }}>
            <h2 style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:19, letterSpacing:'-0.02em' }}>
              Recommended
            </h2>
          </motion.div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:14 }}>
            {trending.slice(8,16).map((track,i)=>(
              <motion.button key={track.id}
                initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.26+i*0.04 }}
                onClick={() => play(track, trending.slice(8))}
                style={{ background:'var(--color-surface-container)', borderRadius:12, padding:12,
                  border:'none', cursor:'pointer', textAlign:'left',
                  transition:'transform 0.2s, background 0.2s' }}
                onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.background='var(--color-surface-container-high)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)';    e.currentTarget.style.background='var(--color-surface-container)'; }}
              >
                <div style={{ width:'100%', aspectRatio:'1', borderRadius:8, overflow:'hidden',
                  background:GRADS[i%GRADS.length], marginBottom:10 }}>
                  {track.thumbnail && <img src={track.thumbnail} alt={track.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
                </div>
                <p style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{track.title}</p>
                <p style={{ fontSize:11, color:'var(--color-on-surface-variant)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{track.artist}</p>
              </motion.button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
