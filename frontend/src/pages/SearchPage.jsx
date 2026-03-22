import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, History, Clock } from 'lucide-react';
import { musicApi, historyApi } from '../api/client.js';
import TrackRow from '../components/TrackRow.jsx';

const FILTERS = ['All', 'Songs', 'Artists', 'Albums', 'Podcasts'];
const CATS = [
  { label:'Pop',        grad:'linear-gradient(135deg,rgba(236,72,153,.6),#831843)' },
  { label:'Hip Hop',    grad:'linear-gradient(135deg,rgba(245,158,11,.6),#78350f)' },
  { label:'Electronic', grad:'linear-gradient(135deg,rgba(6,182,212,.5),#1e3a5f)'  },
  { label:'R&B',        grad:'linear-gradient(135deg,rgba(139,92,246,.6),#4c1d95)' },
  { label:'Rock',       grad:'linear-gradient(135deg,rgba(239,68,68,.6),#111827)'  },
  { label:'Classical',  grad:'linear-gradient(135deg,rgba(16,185,129,.6),#064e3b)' },
  { label:'Jazz',       grad:'linear-gradient(135deg,rgba(217,119,6,.6),#1c1917)'  },
  { label:'K-Pop',      grad:'linear-gradient(135deg,rgba(217,70,239,.6),#581c87)' },
];

function SkRow() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px' }}>
      <div className="skeleton" style={{ width:28, height:14, flexShrink:0 }} />
      <div className="skeleton" style={{ width:40, height:40, flexShrink:0 }} />
      <div style={{ flex:1 }}>
        <div className="skeleton" style={{ height:12, width:'60%', marginBottom:6 }} />
        <div className="skeleton" style={{ height:10, width:'35%' }} />
      </div>
      <div className="skeleton" style={{ width:32, height:10 }} />
    </div>
  );
}

export default function SearchPage() {
  const [query,  setQuery]      = useState('');
  const [filter, setFilter]     = useState('All');
  const [results, setResults]   = useState(null);
  const [sugg,   setSugg]       = useState([]);
  const [recent, setRecent]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [showSugg, setShowSugg] = useState(false);
  const inputRef  = useRef(null);
  const debRef    = useRef(null);

  useEffect(() => {
    historyApi.getSearches()
      .then(d => setRecent((d||[]).map(x=>x.query).slice(0,8)))
      .catch(()=>{});
  }, []);

  const handleInput = useCallback(val => {
    setQuery(val);
    clearTimeout(debRef.current);
    if (!val.trim()) { setSugg([]); setShowSugg(false); setResults(null); return; }
    debRef.current = setTimeout(async () => {
      try {
        const s = await musicApi.suggestions(val);
        setSugg(s||[]); setShowSugg((s||[]).length>0);
      } catch {}
    }, 240);
  }, []);

  const doSearch = useCallback(async q => {
    if (!q.trim()) return;
    setQuery(q); setShowSugg(false); setLoading(true); setResults(null);
    try {
      const d = await musicApi.search(q);
      setResults(d?.results||[]);
      setRecent(p => [q, ...p.filter(x=>x!==q)].slice(0,8));
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  const clear = () => { setQuery(''); setResults(null); setSugg([]); setShowSugg(false); inputRef.current?.focus(); };
  const showHome = !query && !results;

  const C = { muted:'var(--color-on-surface-variant)', text:'var(--color-on-surface)',
    surf:'var(--color-surface-container)', surfH:'var(--color-surface-container-high)',
    primary:'var(--color-primary)', outline:'rgba(72,72,71,0.2)' };

  return (
    <div style={{ padding:'24px 16px 0', maxWidth:1280, margin:'0 auto' }}>
      <style>{`@media(min-width:768px){ .search-wrap{ padding:24px 32px 0!important; } }`}</style>

      <motion.h1 initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
        style={{ fontFamily:'var(--font-headline)', fontWeight:900, fontSize:28,
          letterSpacing:'-0.03em', marginBottom:20 }}>
        Search
      </motion.h1>

      {/* ── Input ──────────────────────────────── */}
      <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.05 }}
        style={{ position:'relative', marginBottom:28 }}>
        <Search size={18} color={C.muted} style={{ position:'absolute', left:14, top:'50%',
          transform:'translateY(-50%)', pointerEvents:'none' }} />
        <input
          ref={inputRef} type="text" value={query} autoComplete="off"
          onChange={e => handleInput(e.target.value)}
          onKeyDown={e => e.key==='Enter' && doSearch(query)}
          onFocus={() => sugg.length>0 && setShowSugg(true)}
          onBlur={() => setTimeout(()=>setShowSugg(false), 160)}
          placeholder="Artists, songs, podcasts..."
          style={{
            width:'100%', background:'var(--color-surface-container-high)',
            border:'none', borderRadius:12, padding:'13px 44px 13px 46px',
            color:C.text, fontSize:15, fontFamily:'var(--font-body)', outline:'none',
            transition:'background 0.15s, box-shadow 0.15s',
          }}
          onFocus={e => e.target.style.boxShadow='0 0 0 2px rgba(199,153,255,0.2)'}
          onBlur={e  => e.target.style.boxShadow='none'}
        />
        {loading && (
          <div style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
            width:18, height:18, border:'2px solid rgba(199,153,255,.25)',
            borderTopColor:'var(--color-primary)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        )}
        {query && !loading && (
          <button onClick={clear} className="icon-btn"
            style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)' }}>
            <X size={16} />
          </button>
        )}

        {/* Autocomplete */}
        <AnimatePresence>
          {showSugg && sugg.length>0 && (
            <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
              exit={{ opacity:0, y:-8 }} transition={{ duration:0.13 }}
              style={{
                position:'absolute', top:'100%', left:0, right:0, marginTop:8,
                background:'var(--color-surface-container-high)', borderRadius:12,
                border:`1px solid ${C.outline}`, boxShadow:'0 16px 48px rgba(0,0,0,0.45)',
                zIndex:50, overflow:'hidden',
              }}>
              {sugg.map((s,i) => (
                <button key={i} onMouseDown={()=>doSearch(s.title)}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:12,
                    padding:'10px 16px', background:'transparent', border:'none',
                    cursor:'pointer', textAlign:'left', color:C.text, transition:'background 0.1s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--color-surface-container-highest)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                >
                  <Search size={15} color={C.muted} style={{ flexShrink:0 }} />
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.title}</p>
                    <p style={{ fontSize:11, color:C.muted }}>{s.artist}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Recent searches ──────────────────────── */}
      <AnimatePresence mode="wait">
        {showHome && recent.length>0 && (
          <motion.div key="recent" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ marginBottom:28 }}>
            <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.15em',
              color:C.muted, marginBottom:10 }}>Recent searches</p>
            {recent.map((q,i) => (
              <button key={i} onClick={()=>doSearch(q)} className="track-row"
                style={{ width:'100%', color:C.text }}>
                <Clock size={15} color={C.muted} style={{ flexShrink:0 }} />
                <span style={{ fontSize:13, flex:1, textAlign:'left' }}>{q}</span>
                <button onClick={e=>{ e.stopPropagation(); setRecent(p=>p.filter(x=>x!==q)); }}
                  className="icon-btn" style={{ opacity:0.5 }}><X size={14}/></button>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Categories ───────────────────────────── */}
      <AnimatePresence mode="wait">
        {showHome && (
          <motion.div key="cats" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
            exit={{ opacity:0 }} transition={{ delay:0.08 }}>
            <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.15em',
              color:C.muted, marginBottom:14 }}>Browse categories</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10 }}>
              {CATS.map((cat,i) => (
                <motion.button key={cat.label}
                  initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
                  transition={{ delay:0.04+i*0.03 }}
                  onClick={()=>doSearch(cat.label)}
                  style={{ height:90, borderRadius:12, background:cat.grad, border:'none',
                    cursor:'pointer', display:'flex', alignItems:'flex-end', padding:'12px 14px',
                    fontFamily:'var(--font-headline)', fontWeight:800, fontSize:16, color:'#fff',
                    transition:'filter 0.15s, transform 0.15s' }}
                  onMouseEnter={e=>{ e.currentTarget.style.filter='brightness(1.15)'; e.currentTarget.style.transform='scale(1.02)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.filter='brightness(1)';    e.currentTarget.style.transform='scale(1)'; }}
                >
                  {cat.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Results ──────────────────────────────── */}
      <AnimatePresence mode="wait">
        {(results!==null || loading) && (
          <motion.div key="results" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            {results!==null && (
              <div style={{ marginBottom:18 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, flexWrap:'wrap' }}>
                  <span style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:20 }}>Results for</span>
                  <span style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:20, color:C.primary }}>"{query}"</span>
                </div>
                <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }} className="no-scrollbar">
                  {FILTERS.map(f => (
                    <button key={f} onClick={()=>setFilter(f)}
                      className={`chip${filter===f?' active':''}`} style={{ flexShrink:0 }}>{f}</button>
                  ))}
                </div>
              </div>
            )}

            {loading && <div style={{ display:'flex', flexDirection:'column', gap:3 }}>{Array(8).fill(0).map((_,i)=><SkRow key={i}/>)}</div>}

            {!loading && results?.length===0 && (
              <div style={{ textAlign:'center', padding:'56px 0', color:C.muted }}>
                <Search size={52} style={{ display:'block', margin:'0 auto 14px', opacity:0.3 }} />
                <p style={{ fontWeight:600, fontSize:15 }}>No results for "{query}"</p>
                <p style={{ fontSize:13, marginTop:4 }}>Try different keywords or check spelling.</p>
              </div>
            )}

            {!loading && results && results.length>0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                {results.map((t,i) => <TrackRow key={t.id} track={t} index={i} queue={results} isMusic={true} />)}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
