import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore.js';
import usePlayerStore from '../store/playerStore.js';
import { musicApi, historyApi } from '../api/client.js';
import TrackRow from '../components/TrackRow.jsx';

const GRADIENTS = [
  'from-violet-600/60 to-purple-950',
  'from-cyan-600/50 to-teal-950',
  'from-rose-600/50 to-pink-950',
  'from-amber-600/50 to-orange-950',
  'from-emerald-600/50 to-green-950',
  'from-blue-600/50 to-indigo-950',
];

function SkeletonCard() {
  return <div className="w-44 h-56 flex-shrink-0 skeleton" />;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="w-8 h-4 skeleton flex-shrink-0" />
      <div className="w-10 h-10 skeleton flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 skeleton w-3/4" />
        <div className="h-2.5 skeleton w-1/2" />
      </div>
      <div className="w-10 h-3 skeleton" />
    </div>
  );
}

const STAGGER = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } },
  item:      { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0,
               transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } },
};

export default function HomePage() {
  const { profile } = useAuthStore();
  const { play } = usePlayerStore();
  const [trending, setTrending]     = useState(null);
  const [history, setHistory]       = useState(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = profile?.display_name || 'there';

  useEffect(() => {
    musicApi.trending()
      .then(tracks => setTrending(tracks))
      .catch(() => setTrending([]));

    historyApi.get()
      .then(tracks => setHistory(tracks.slice(0, 6)))
      .catch(() => setHistory([]));
  }, []);

  const quickPicks = [
    { label: 'Liked Songs',      icon: 'favorite',      color: '#ff94a4', gradient: 'from-tertiary/30 to-rose-950' },
    { label: 'Your Mix',         icon: 'auto_awesome',  color: '#c799ff', gradient: 'from-primary/30 to-purple-950' },
    { label: 'Recently Played',  icon: 'history',       color: '#4af8e3', gradient: 'from-secondary/30 to-teal-950' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-screen-xl mx-auto">

      {/* ── Header ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <p className="text-on-surface-variant text-sm font-medium">{greeting}</p>
          <h1 className="font-headline font-black text-3xl tracking-tight mt-0.5">{name}</h1>
        </div>
      </motion.div>

      {/* ── Quick picks ─────────────────────────────── */}
      <motion.div
        variants={STAGGER.container}
        initial="hidden" animate="show"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10"
      >
        {quickPicks.map((item, i) => (
          <motion.button
            key={i}
            variants={STAGGER.item}
            onClick={() => {
              if (trending?.length) play(trending[i % trending.length], trending);
            }}
            className="flex items-center gap-3 bg-surface-container-high hover:bg-surface-bright
                       rounded-md transition-colors group text-left overflow-hidden"
          >
            <div className={`w-14 h-14 flex-shrink-0 bg-gradient-to-br ${item.gradient}
                             flex items-center justify-center`}>
              <span className="material-symbols-outlined"
                style={{ color: item.color, fontVariationSettings: "'FILL' 1" }}>
                {item.icon}
              </span>
            </div>
            <span className="font-semibold text-sm truncate pr-2">{item.label}</span>
            <span className="material-symbols-outlined text-primary ml-auto mr-3 text-[20px]
                             opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ fontVariationSettings: "'FILL' 1" }}>
              play_circle
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* ── Trending ────────────────────────────────── */}
      <section className="mb-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center justify-between mb-5"
        >
          <h2 className="font-headline font-bold text-xl tracking-tight">Trending Now</h2>
          <button className="text-xs text-on-surface-variant hover:text-primary transition-colors
                             font-semibold uppercase tracking-wide">See all</button>
        </motion.div>

        <div className="flex gap-4 overflow-x-auto pb-3 no-scrollbar">
          {trending === null
            ? Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
            : trending.slice(0, 8).map((track, i) => (
                <motion.button
                  key={track.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  onClick={() => play(track, trending)}
                  className="w-44 flex-shrink-0 card text-left"
                >
                  <div className={`h-44 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]}
                                   flex items-center justify-center relative group overflow-hidden`}>
                    {track.thumbnail ? (
                      <img src={track.thumbnail} alt={track.title}
                        className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-white/30 text-6xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}>album</span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100
                                    transition-opacity flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-5xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm truncate">{track.title}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5 truncate">{track.artist}</p>
                  </div>
                </motion.button>
              ))
          }
        </div>
      </section>

      {/* ── Recently Played ─────────────────────────── */}
      <section className="mb-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex items-center justify-between mb-5"
        >
          <div>
            <h2 className="font-headline font-bold text-xl tracking-tight">Recently Played</h2>
            <p className="text-on-surface-variant text-xs mt-0.5">Pick up where you left off</p>
          </div>
        </motion.div>

        <div className="space-y-1">
          {history === null
            ? Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />)
            : history.length === 0
              ? (
                  <p className="text-on-surface-variant text-sm py-6 text-center">
                    No history yet. Start listening!
                  </p>
                )
              : history.map((track, i) => (
                  <TrackRow key={track.id} track={track} index={i} queue={history} />
                ))
          }
        </div>
      </section>

      {/* ── Recommended ─────────────────────────────── */}
      {trending && trending.length > 0 && (
        <section className="mb-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-between mb-5"
          >
            <h2 className="font-headline font-bold text-xl tracking-tight">Recommended</h2>
            <button className="text-xs text-on-surface-variant hover:text-primary transition-colors
                               font-semibold uppercase tracking-wide">Refresh</button>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {trending.slice(8, 16).map((track, i) => (
              <motion.button
                key={track.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.04 }}
                onClick={() => play(track, trending.slice(8))}
                className="card p-3 text-left w-full"
              >
                <div className="w-full aspect-square rounded-md overflow-hidden mb-3 bg-surface-container-high">
                  {track.thumbnail ? (
                    <img src={track.thumbnail} alt={track.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]}
                                     flex items-center justify-center`}>
                      <span className="material-symbols-outlined text-white/30 text-4xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}>album</span>
                    </div>
                  )}
                </div>
                <p className="font-semibold text-sm truncate">{track.title}</p>
                <p className="text-xs text-on-surface-variant mt-0.5 truncate">{track.artist}</p>
              </motion.button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
