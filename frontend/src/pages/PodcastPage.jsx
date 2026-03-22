import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Play } from 'lucide-react';
import { podcastApi } from '../api/client.js';

const GRADS = [
  'linear-gradient(135deg,rgba(245,158,11,.6),#78350f)',
  'linear-gradient(135deg,rgba(99,102,241,.5),#13124a)',
  'linear-gradient(135deg,rgba(244,63,94,.4),#3b0218)',
  'linear-gradient(135deg,rgba(16,185,129,.4),#032f21)',
  'linear-gradient(135deg,rgba(139,92,246,.5),#1e0342)',
  'linear-gradient(135deg,rgba(6,182,212,.4),#0a2a3d)',
];

const DEMO = [
  { id:'p1', name:'Lex Fridman Podcast', description:'AI, science, technology, history & philosophy.', episode_count:380 },
  { id:'p2', name:'The Joe Rogan Experience', description:'Long-form conversations on comedy, politics, science.', episode_count:2100 },
  { id:'p3', name:'How I Built This', description:'Guy Raz explores the stories behind great companies.', episode_count:450 },
  { id:'p4', name:'Darknet Diaries', description:'True stories from the dark side of the internet.', episode_count:140 },
  { id:'p5', name:'My First Million', description:'Brainstorming business ideas and discussing trends.', episode_count:600 },
  { id:'p6', name:'The Diary of a CEO', description:'Deep insights from world-class entrepreneurs.', episode_count:200 },
];

export default function PodcastPage() {
  const [podcasts, setPodcasts] = useState(null);
  const [cont, setCont]         = useState([]);

  useEffect(() => {
    podcastApi.getAll().then(d => setPodcasts(d.length ? d : DEMO)).catch(() => setPodcasts(DEMO));
    setCont(DEMO.slice(0,2).map(p => ({ ...p, ep:`Episode ${Math.floor(Math.random()*80)+20}`, pct: Math.random()*75+10 })));
  }, []);

  const C = { text:'var(--color-on-surface)', muted:'var(--color-on-surface-variant)',
    surf:'var(--color-surface-container)', surfH:'var(--color-surface-container-high)',
    sec:'var(--color-secondary)' };

  return (
    <div style={{ padding:'24px 16px 0', maxWidth:1280, margin:'0 auto' }}>
      <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
        style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:'var(--font-headline)', fontWeight:900, fontSize:28, letterSpacing:'-0.03em' }}>Podcasts</h1>
        <p style={{ color:C.muted, fontSize:13, marginTop:4 }}>Discover and follow shows</p>
      </motion.div>

      {/* Continue listening */}
      <section style={{ marginBottom:32 }}>
        <h2 style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:18, letterSpacing:'-0.02em', marginBottom:14 }}>
          Continue Listening
        </h2>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {cont.map((p,i) => (
            <motion.div key={p.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.06 }}
              style={{ display:'flex', alignItems:'center', gap:14, padding:14,
                background:C.surf, borderRadius:12, cursor:'pointer', transition:'background 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.background=C.surfH}
              onMouseLeave={e=>e.currentTarget.style.background=C.surf}
            >
              <div style={{ width:56, height:56, borderRadius:10, flexShrink:0,
                background:GRADS[i%GRADS.length], display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Radio size={22} color="rgba(255,255,255,0.7)" />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</p>
                <p style={{ fontSize:11, color:C.muted, marginTop:2 }}>{p.ep}</p>
                <div style={{ marginTop:8, height:3, background:'var(--color-surface-container-highest)', borderRadius:99, overflow:'hidden' }}>
                  <div style={{ height:'100%', background:C.sec, borderRadius:99, width:`${p.pct}%`, transition:'width 0.3s' }} />
                </div>
              </div>
              <button style={{ width:38, height:38, borderRadius:'50%', flexShrink:0,
                background:'var(--color-surface-container-high)', border:'none', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s' }}
                onMouseEnter={e=> { e.currentTarget.style.background='rgba(199,153,255,0.15)'; }}
                onMouseLeave={e=> { e.currentTarget.style.background='var(--color-surface-container-high)'; }}>
                <Play size={16} fill="var(--color-on-surface)" color="var(--color-on-surface)" style={{ marginLeft:2 }} />
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Popular shows */}
      <section style={{ marginBottom:32 }}>
        <h2 style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:18, letterSpacing:'-0.02em', marginBottom:14 }}>
          Popular Shows
        </h2>
        {podcasts===null ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:14 }}>
            {Array(6).fill(0).map((_,i)=><div key={i} className="skeleton" style={{ aspectRatio:'0.85', borderRadius:12 }} />)}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:14 }}>
            {podcasts.map((p,i) => (
              <motion.button key={p.id}
                initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.06+i*0.04 }}
                style={{ background:C.surf, borderRadius:12, overflow:'hidden', border:'none', cursor:'pointer', textAlign:'left',
                  transition:'transform 0.2s, background 0.2s' }}
                onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.background=C.surfH; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)';    e.currentTarget.style.background=C.surf; }}
              >
                <div style={{ width:'100%', aspectRatio:'1', background:GRADS[i%GRADS.length],
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Radio size={44} color="rgba(255,255,255,0.25)" />
                </div>
                <div style={{ padding:'10px 12px 12px' }}>
                  <p style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</p>
                  {p.episode_count && (
                    <p style={{ fontSize:11, color:C.muted, marginTop:2 }}>{p.episode_count} episodes</p>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
