import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { musicApi, historyApi } from '../api/client.js';
import TrackRow from '../components/TrackRow.jsx';

const FILTERS = ['All', 'Songs', 'Artists', 'Albums', 'Podcasts'];

const CATEGORIES = [
  { label: 'Pop',         gradient: 'linear-gradient(135deg,rgba(236,72,153,.6),rgb(131,24,67))' },
  { label: 'Hip Hop',     gradient: 'linear-gradient(135deg,rgba(245,158,11,.6),rgb(120,53,15))' },
  { label: 'Electronic',  gradient: 'linear-gradient(135deg,rgba(6,182,212,.5),rgb(30,58,138))'  },
  { label: 'R&B',         gradient: 'linear-gradient(135deg,rgba(139,92,246,.6),rgb(76,29,149))' },
  { label: 'Rock',        gradient: 'linear-gradient(135deg,rgba(239,68,68,.6),rgb(17,24,39))'   },
  { label: 'Classical',   gradient: 'linear-gradient(135deg,rgba(16,185,129,.6),rgb(6,78,59))'   },
  { label: 'Jazz',        gradient: 'linear-gradient(135deg,rgba(217,119,6,.6),rgb(28,25,23))'   },
  { label: 'K-Pop',       gradient: 'linear-gradient(135deg,rgba(217,70,239,.6),rgb(88,28,135))' },
];

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px' }}>
      <div className="skeleton" style={{ width: 32, height: 16, flexShrink: 0 }} />
      <div className="skeleton" style={{ width: 40, height: 40, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="skeleton" style={{ height: 12, width: '60%' }} />
        <div className="skeleton" style={{ height: 10, width: '35%' }} />
      </div>
      <div className="skeleton" style={{ width: 36, height: 10 }} />
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery]             = useState('');
  const [filter, setFilter]           = useState('All');
  const [results, setResults]         = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecent]   = useState([]);
  const [loading, setLoading]         = useState(false);
  const [showSugg, setShowSugg]       = useState(false);
  const inputRef  = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    historyApi.getSearches()
      .then((data) => setRecent((data || []).map((d) => d.query).slice(0, 8)))
      .catch(() => {});
  }, []);

  const handleInput = useCallback((val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setSuggestions([]); setShowSugg(false); setResults(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const sugg = await musicApi.suggestions(val);
        setSuggestions(sugg || []);
        setShowSugg((sugg || []).length > 0);
      } catch { /* no-op */ }
    }, 250);
  }, []);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) return;
    setQuery(q);
    setShowSugg(false);
    setLoading(true);
    setResults(null);

    try {
      const data = await musicApi.search(q);
      setResults(data?.results || []);
      setRecent((prev) => [q, ...prev.filter((x) => x !== q)].slice(0, 8));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSearch = () => {
    setQuery(''); setResults(null); setSuggestions([]); setShowSugg(false);
    inputRef.current?.focus();
  };

  const showHome = !query && !results;

  // CSS vars
  const C = {
    surface:   'var(--color-surface-container)',
    surfaceHi: 'var(--color-surface-container-high)',
    muted:     'var(--color-on-surface-variant)',
    text:      'var(--color-on-surface)',
    primary:   'var(--color-primary)',
    outline:   'rgba(72,72,71,0.2)',
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1280, margin: '0 auto' }}>
      <motion.h1
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ fontFamily: 'var(--font-headline)', fontWeight: 900, fontSize: 30, letterSpacing: '-0.03em', marginBottom: 24 }}
      >
        Search
      </motion.h1>

      {/* ── Input ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        style={{ position: 'relative', marginBottom: 32 }}
      >
        <span className="material-symbols-outlined"
          style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            color: C.muted, fontSize: 22, pointerEvents: 'none' }}>search</span>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doSearch(query)}
          onFocus={() => suggestions.length > 0 && setShowSugg(true)}
          onBlur={() => setTimeout(() => setShowSugg(false), 160)}
          placeholder="Artists, songs, podcasts..."
          autoComplete="off"
          style={{
            width: '100%',
            background: C.surfaceHi,
            border: 'none',
            borderRadius: 12,
            padding: '14px 48px 14px 52px',
            color: C.text,
            fontSize: 15,
            fontFamily: 'var(--font-body)',
            outline: 'none',
            transition: 'background 0.15s, box-shadow 0.15s',
          }}
          onFocusCapture={(e) => {
            e.target.style.boxShadow = '0 0 0 3px rgba(199,153,255,0.15)';
          }}
          onBlurCapture={(e) => {
            e.target.style.boxShadow = 'none';
          }}
        />

        <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center', gap: 8 }}>
          {loading && (
            <div style={{ width: 20, height: 20, border: '2px solid rgba(199,153,255,.3)',
              borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          )}
          {query && !loading && (
            <button onClick={clearSearch} style={{ background: 'none', border: 'none',
              color: C.muted, cursor: 'pointer', padding: 0, display: 'flex' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          )}
        </div>

        {/* Autocomplete */}
        <AnimatePresence>
          {showSugg && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
              style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8,
                background: C.surfaceHi, borderRadius: 12,
                border: `1px solid ${C.outline}`,
                boxShadow: '0 16px 48px rgba(0,0,0,0.4)', zIndex: 50, overflow: 'hidden',
              }}
            >
              {suggestions.map((s, i) => (
                <button key={i} onMouseDown={() => doSearch(s.title)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    gap: 12, padding: '10px 16px', background: 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    color: C.text, transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-container-highest)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span className="material-symbols-outlined" style={{ color: C.muted, fontSize: 18 }}>search</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>{s.title}</p>
                    <p style={{ fontSize: 11, color: C.muted }}>{s.artist}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Recent Searches ──────────────────────────── */}
      <AnimatePresence mode="wait">
        {showHome && recentSearches.length > 0 && (
          <motion.div key="recent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.15em', color: C.muted, marginBottom: 12 }}>
              Recent searches
            </p>
            {recentSearches.map((q, i) => (
              <button key={i} onClick={() => doSearch(q)}
                className="track-row"
                style={{ width: '100%', color: C.text }}
              >
                <span className="material-symbols-outlined" style={{ color: C.muted, fontSize: 18 }}>history</span>
                <span style={{ fontSize: 13, flex: 1, textAlign: 'left' }}>{q}</span>
                <span className="material-symbols-outlined"
                  style={{ color: C.muted, fontSize: 16, opacity: 0.6 }}
                  onClick={(e) => { e.stopPropagation(); setRecent((p) => p.filter((x) => x !== q)); }}
                >close</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Category Grid ────────────────────────────── */}
      <AnimatePresence mode="wait">
        {showHome && (
          <motion.div key="cats" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} transition={{ delay: 0.1 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.15em', color: C.muted, marginBottom: 16 }}>
              Browse categories
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
              {CATEGORIES.map((cat, i) => (
                <motion.button key={cat.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.04 + i * 0.03 }}
                  onClick={() => doSearch(cat.label)}
                  style={{
                    height: 100, borderRadius: 12,
                    background: cat.gradient,
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'flex-end',
                    padding: '14px 16px',
                    fontFamily: 'var(--font-headline)',
                    fontWeight: 800, fontSize: 17,
                    color: '#fff',
                    transition: 'filter 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.15)'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)';    e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {cat.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Results ──────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {(results !== null || loading) && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {results !== null && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: 20 }}>
                    Results for
                  </span>
                  <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: 20, color: C.primary }}>
                    "{query}"
                  </span>
                </div>
                {/* Filter chips */}
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }} className="no-scrollbar">
                  {FILTERS.map((f) => (
                    <button key={f} onClick={() => setFilter(f)}
                      className={`chip${filter === f ? ' active' : ''}`}
                      style={{ flexShrink: 0 }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {Array(8).fill(0).map((_, i) => <SkeletonRow key={i} />)}
            </div>}

            {!loading && results?.length === 0 && (
              <div style={{ textAlign: 'center', padding: '64px 0', color: C.muted }}>
                <span className="material-symbols-outlined" style={{ fontSize: 56, display: 'block', marginBottom: 12 }}>
                  search_off
                </span>
                <p style={{ fontWeight: 600, fontSize: 15 }}>No results for "{query}"</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Try different keywords or check spelling.</p>
              </div>
            )}

            {!loading && results && results.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {results.map((track, i) => (
                  <TrackRow key={track.id} track={track} index={i} queue={results} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
