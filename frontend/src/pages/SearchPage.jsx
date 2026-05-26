import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock } from 'lucide-react';
import { musicApi, historyApi } from '../api/client.js';
import TrackRow from '../components/TrackRow.jsx';
import useT from '../i18n/useT.js';

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

const FILTERS = ['All','Songs','Artists','Albums','Podcasts'];

export default function SearchPage() {
  const [query,   setQuery]   = useState('');
  const [filter,  setFilter]  = useState('All');
  const [results, setResults] = useState(null);
  const [sugg,    setSugg]    = useState([]);
  const [recent,  setRecent]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSugg,setShowSugg]= useState(false);
  const inputRef  = useRef(null);
  const debRef    = useRef(null);
  const t         = useT();

  useEffect(() => {
    historyApi.getSearches().then(d=>setRecent((d||[]).map(x=>x.query).slice(0,8))).catch(()=>{});
  }, []);

  const handleInput = useCallback(val => {
    setQuery(val);
    clearTimeout(debRef.current);
    if(!val.trim()){setSugg([]);setShowSugg(false);setResults(null);return;}
    debRef.current = setTimeout(async()=>{
      try{const s=await musicApi.suggestions(val);setSugg(s||[]);setShowSugg((s||[]).length>0);}catch{}
    }, 240);
  }, []);

  const doSearch = useCallback(async q => {
    if(!q.trim())return;
    setQuery(q);setShowSugg(false);setLoading(true);setResults(null);
    try{
      const d=await musicApi.search(q);
      setResults(d?.results||[]);
      setRecent(p=>[q,...p.filter(x=>x!==q)].slice(0,8));
    }catch{setResults([]);}
    finally{setLoading(false);}
  }, []);

  const clear=()=>{setQuery('');setResults(null);setSugg([]);setShowSugg(false);inputRef.current?.focus();};
  const showHome=!query&&!results;

  return (
    <div style={{padding:'20px 16px 0',maxWidth:1280,margin:'0 auto'}}>
      <motion.h1 initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
        style={{fontFamily:'var(--font-headline)',fontWeight:900,fontSize:26,
          letterSpacing:'-0.03em',marginBottom:18,color:'var(--color-on-surface)'}}>
        {t('search')}
      </motion.h1>

      {/* Input */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.05}}
        style={{position:'relative',marginBottom:24}}>
        <Search size={17} color="var(--color-on-surface-variant)"
          style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}/>
        <input ref={inputRef} type="text" value={query} autoComplete="off"
          onChange={e=>handleInput(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&doSearch(query)}
          onFocus={e=>{if(sugg.length>0)setShowSugg(true);e.target.style.boxShadow='0 0 0 2px rgba(199,153,255,0.2)';}}
          onBlur={e=>{setTimeout(()=>setShowSugg(false),160);e.target.style.boxShadow='none';}}
          placeholder={t('searchPlaceholder')}
          style={{width:'100%',background:'var(--color-surface-container-high)',border:'none',
            borderRadius:12,padding:'13px 44px 13px 44px',
            color:'var(--color-on-surface)',fontSize:14,fontFamily:'var(--font-body)',outline:'none',
            transition:'background 0.15s,box-shadow 0.15s'}}/>
        <div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',display:'flex',gap:6}}>
          {loading&&<div style={{width:16,height:16,border:'2px solid rgba(199,153,255,.25)',
            borderTopColor:'var(--color-primary)',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>}
          {query&&!loading&&(
            <button onClick={clear} className="icon-btn"><X size={15}/></button>
          )}
        </div>

        {/* Autocomplete */}
        <AnimatePresence>
          {showSugg&&sugg.length>0&&(
            <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}}
              exit={{opacity:0,y:-6}} transition={{duration:0.12}}
              style={{position:'absolute',top:'100%',left:0,right:0,marginTop:6,
                background:'var(--color-surface-container-high)',borderRadius:12,
                border:'1px solid var(--color-outline-variant)',boxShadow:'var(--shadow-md)',
                zIndex:50,overflow:'hidden'}}>
              {sugg.map((s,i)=>(
                <button key={i} onMouseDown={()=>doSearch(s.title)}
                  style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 14px',
                    background:'transparent',border:'none',cursor:'pointer',textAlign:'left',
                    color:'var(--color-on-surface)',transition:'background 0.1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--color-surface-container-highest)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <Search size={13} color="var(--color-on-surface-variant)" style={{flexShrink:0}}/>
                  <div>
                    <p style={{fontSize:12,fontWeight:500}}>{s.title}</p>
                    <p style={{fontSize:11,color:'var(--color-on-surface-variant)'}}>{s.artist}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Recent */}
      <AnimatePresence mode="wait">
        {showHome&&recent.length>0&&(
          <motion.div key="recent" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{marginBottom:24}}>
            <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.15em',
              color:'var(--color-on-surface-variant)',marginBottom:8}}>{t('recentSearches')}</p>
            {recent.map((q,i)=>(
              <button key={i} onClick={()=>doSearch(q)} className="track-row"
                style={{width:'100%',color:'var(--color-on-surface)'}}>
                <Clock size={13} color="var(--color-on-surface-variant)" style={{flexShrink:0}}/>
                <span style={{fontSize:12,flex:1,textAlign:'left'}}>{q}</span>
                <button onClick={e=>{e.stopPropagation();setRecent(p=>p.filter(x=>x!==q));}} className="icon-btn" style={{opacity:0.5}}>
                  <X size={12}/>
                </button>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories */}
      <AnimatePresence mode="wait">
        {showHome&&(
          <motion.div key="cats" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
            <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.15em',
              color:'var(--color-on-surface-variant)',marginBottom:12}}>{t('browseCategories')}</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:8}}>
              {CATS.map((cat,i)=>(
                <motion.button key={cat.label}
                  initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} transition={{delay:0.03+i*0.03}}
                  onClick={()=>doSearch(cat.label)}
                  style={{height:82,borderRadius:10,background:cat.grad,border:'none',cursor:'pointer',
                    display:'flex',alignItems:'flex-end',padding:'10px 12px',
                    fontFamily:'var(--font-headline)',fontWeight:800,fontSize:15,color:'#fff',transition:'filter 0.15s,transform 0.15s'}}
                  onMouseEnter={e=>{e.currentTarget.style.filter='brightness(1.15)';e.currentTarget.style.transform='scale(1.02)';}}
                  onMouseLeave={e=>{e.currentTarget.style.filter='brightness(1)';e.currentTarget.style.transform='scale(1)';}}>
                  {cat.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence mode="wait">
        {(results!==null||loading)&&(
          <motion.div key="results" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            {results!==null&&(
              <div style={{marginBottom:16}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,flexWrap:'wrap'}}>
                  <span style={{fontFamily:'var(--font-headline)',fontWeight:800,fontSize:18,color:'var(--color-on-surface)'}}>{t('resultsFor')}</span>
                  <span style={{fontFamily:'var(--font-headline)',fontWeight:800,fontSize:18,color:'var(--color-primary)'}}>"{query}"</span>
                </div>
                <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:4}} className="no-scrollbar">
                  {FILTERS.map(f=>(
                    <button key={f} onClick={()=>setFilter(f)}
                      className={`chip${filter===f?' active':''}`} style={{flexShrink:0}}>{f}</button>
                  ))}
                </div>
              </div>
            )}
            {loading&&<div style={{display:'flex',flexDirection:'column',gap:3}}>
              {Array(6).fill(0).map((_,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px'}}>
                  <div className="skeleton" style={{width:26,height:12}}/>
                  <div className="skeleton" style={{width:38,height:38}}/>
                  <div style={{flex:1}}>
                    <div className="skeleton" style={{height:11,width:'55%',marginBottom:5}}/>
                    <div className="skeleton" style={{height:9,width:'30%'}}/>
                  </div>
                </div>
              ))}
            </div>}
            {!loading&&results?.length===0&&(
              <div style={{textAlign:'center',padding:'48px 0',color:'var(--color-on-surface-variant)'}}>
                <Search size={46} style={{display:'block',margin:'0 auto 12px',opacity:0.3}}/>
                <p style={{fontWeight:600,fontSize:14}}>{t('noResults')} "{query}"</p>
                <p style={{fontSize:12,marginTop:4}}>{t('noResultsHint')}</p>
              </div>
            )}
            {!loading&&results&&results.length>0&&(
              <div style={{display:'flex',flexDirection:'column',gap:2}}>
                {results.map((track,i)=><TrackRow key={track.id} track={track} index={i} queue={results} isMusic={true}/>)}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
