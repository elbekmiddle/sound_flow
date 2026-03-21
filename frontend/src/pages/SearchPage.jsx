import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { musicApi, historyApi } from '../api/client.js';
import usePlayerStore from '../store/playerStore.js';
import TrackRow from '../components/TrackRow.jsx';

const FILTERS = ['All', 'Songs', 'Artists', 'Albums', 'Podcasts'];
const CATEGORIES = [
  { label: 'Pop',        gradient: 'from-pink-600/60 to-rose-950' },
  { label: 'Hip Hop',    gradient: 'from-yellow-600/60 to-orange-950' },
  { label: 'Electronic', gradient: 'from-cyan-600/50 to-blue-950' },
  { label: 'R&B',        gradient: 'from-purple-600/60 to-violet-950' },
  { label: 'Rock',       gradient: 'from-red-700/60 to-gray-950' },
  { label: 'Classical',  gradient: 'from-emerald-600/60 to-teal-950' },
  { label: 'Jazz',       gradient: 'from-amber-700/60 to-stone-950' },
  { label: 'K-Pop',      gradient: 'from-fuchsia-600/60 to-purple-950' },
];

export default function SearchPage() {
  const [query, setQuery]           = useState('');
  const [filter, setFilter]         = useState('All');
  const [results, setResults]       = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecent] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [showSugg, setShowSugg]     = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const { play } = usePlayerStore();

  useEffect(() => {
    historyApi.getSearches()
      .then(data => setRecent(data.map(d => d.query).slice(0, 8)))
      .catch(() => {});
  }, []);

  const handleInput = useCallback((val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);

    if (!val.trim()) {
      setSuggestions([]);
      setShowSugg(false);
      setResults(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const sugg = await musicApi.suggestions(val);
        setSuggestions(sugg);
        setShowSugg(true);
      } catch {}
    }, 220);
  }, []);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) return;
    setQuery(q);
    setShowSugg(false);
    setLoading(true);
    setResults(null);

    try {
      const { results: res } = await musicApi.search(q);
      setResults(res || []);
      setRecent(prev => [q, ...prev.filter(x => x !== q)].slice(0, 8));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSearch = () => {
    setQuery('');
    setResults(null);
    setSuggestions([]);
    setShowSugg(false);
    inputRef.current?.focus();
  };

  const showHome = !query && !results;

  return (
    <div className="p-6 md:p-8 max-w-screen-xl mx-auto">
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-headline font-black text-3xl tracking-tight mb-6"
      >
        Search
      </motion.h1>

      {/* ── Search Input ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative mb-8"
      >
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2
                         text-on-surface-variant text-[22px] pointer-events-none">search</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch(query)}
          onFocus={() => suggestions.length > 0 && setShowSugg(true)}
          onBlur={() => setTimeout(() => setShowSugg(false), 150)}
          placeholder="Artists, songs, podcasts..."
          className="w-full bg-surface-container-high rounded-lg py-4 pl-14 pr-12
                     text-on-surface placeholder:text-outline outline-none text-base transition-all"
          autoComplete="off"
        />

        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {loading && (
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          )}
          {query && !loading && (
            <button onClick={clearSearch} className="icon-btn">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>

        {/* Autocomplete dropdown */}
        <AnimatePresence>
          {showSugg && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="absolute top-full left-0 right-0 mt-2 bg-surface-container-high rounded-lg
                         shadow-2xl z-50 overflow-hidden border border-outline-variant/10"
            >
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onMouseDown={() => doSearch(s.title)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
                  <div>
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-on-surface-variant">{s.artist}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Recent Searches (shown when empty) ─────────── */}
      <AnimatePresence mode="wait">
        {showHome && recentSearches.length > 0 && (
          <motion.div
            key="recent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-8"
          >
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-3">
              Recent searches
            </h3>
            <div className="space-y-1">
              {recentSearches.map((q, i) => (
                <button
                  key={i}
                  onClick={() => doSearch(q)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded
                             hover:bg-surface-container transition-all text-left group"
                >
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">history</span>
                  <span className="text-sm flex-1">{q}</span>
                  <span
                    className="material-symbols-outlined text-on-surface-variant text-[16px]
                               opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); setRecent(p => p.filter(x => x !== q)); }}
                  >
                    close
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Browse Categories ───────────────────────── */}
      <AnimatePresence mode="wait">
        {showHome && (
          <motion.div
            key="categories"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-4">
              Browse categories
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {CATEGORIES.map((cat, i) => (
                <motion.button
                  key={cat.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 + i * 0.04 }}
                  onClick={() => doSearch(cat.label)}
                  className={`h-24 rounded-lg bg-gradient-to-br ${cat.gradient}
                              flex items-end p-4 font-headline font-bold text-lg
                              hover:brightness-110 active:scale-95 transition-all`}
                >
                  {cat.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Results ─────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {(results !== null || loading) && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Results header + filter chips */}
            {results !== null && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <h2 className="font-headline font-bold text-xl">Results for</h2>
                  <span className="text-primary font-headline font-bold text-xl">"{query}"</span>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {FILTERS.map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`chip flex-shrink-0 ${filter === f ? 'active' : ''}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading skeleton */}
            {loading && (
              <div className="space-y-2">
                {Array(8).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="w-8 h-4 skeleton" />
                    <div className="w-10 h-10 skeleton" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 skeleton w-2/3" />
                      <div className="h-2.5 skeleton w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && results?.length === 0 && (
              <div className="text-center py-16 text-on-surface-variant">
                <span className="material-symbols-outlined text-5xl mb-3 block">search_off</span>
                <p className="font-semibold">No results for "{query}"</p>
                <p className="text-sm mt-1">Try different keywords or check your spelling.</p>
              </div>
            )}

            {/* Track list */}
            {!loading && results && results.length > 0 && (
              <div className="space-y-1">
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
