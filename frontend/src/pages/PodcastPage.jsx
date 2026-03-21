import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { podcastApi } from '../api/client.js';
import usePlayerStore from '../store/playerStore.js';

const COLORS = [
  'from-amber-700/60 to-stone-950',
  'from-blue-700/60 to-indigo-950',
  'from-rose-700/60 to-pink-950',
  'from-emerald-600/60 to-teal-950',
  'from-violet-700/60 to-purple-950',
  'from-cyan-700/60 to-blue-950',
];

// Demo data while backend is empty
const DEMO_PODCASTS = [
  { id: 'p1', name: 'Lex Fridman Podcast',       description: 'AI, science, technology, history, philosophy and the human condition.',   episode_count: 380 },
  { id: 'p2', name: 'The Joe Rogan Experience',   description: 'Long-form conversations exploring comedy, politics, science, and more.',   episode_count: 2100 },
  { id: 'p3', name: 'How I Built This',           description: 'Guy Raz dives into the stories behind the world\'s best-known companies.', episode_count: 450 },
  { id: 'p4', name: 'Darknet Diaries',            description: 'True stories from the dark side of the internet.',                        episode_count: 140 },
  { id: 'p5', name: 'My First Million',           description: 'Shaan and Sam brainstorm business ideas and discuss trends.',              episode_count: 600 },
  { id: 'p6', name: 'The Diary of a CEO',         description: 'Deep insights from world-class entrepreneurs and thinkers.',              episode_count: 200 },
];

export default function PodcastPage() {
  const [podcasts, setPodcasts]     = useState(null);
  const [continueList, setContinue] = useState([]);
  const { play } = usePlayerStore();

  useEffect(() => {
    podcastApi.getAll()
      .then(data => setPodcasts(data.length ? data : DEMO_PODCASTS))
      .catch(() => setPodcasts(DEMO_PODCASTS));

    // Fake "continue listening" from demos
    setContinue(DEMO_PODCASTS.slice(0, 2).map(p => ({
      ...p,
      episode: `Episode ${Math.floor(Math.random() * 100) + 50}`,
      progress: Math.random() * 80 + 10,
    })));
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-screen-xl mx-auto">
      {/* ── Header ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="font-headline font-black text-3xl tracking-tight">Podcasts</h1>
          <p className="text-on-surface-variant text-sm mt-1">Discover and follow shows</p>
        </div>
      </motion.div>

      {/* ── Continue Listening ──────────────────────── */}
      {continueList.length > 0 && (
        <section className="mb-10">
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-headline font-bold text-xl tracking-tight mb-5"
          >
            Continue Listening
          </motion.h2>
          <div className="space-y-3">
            {continueList.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + i * 0.05 }}
                className="flex items-center gap-4 p-4 bg-surface-container rounded-lg
                           hover:bg-surface-container-high transition-all cursor-pointer group"
              >
                <div className={`w-14 h-14 rounded-lg flex-shrink-0 bg-gradient-to-br ${COLORS[i % COLORS.length]}
                                 flex items-center justify-center`}>
                  <span className="material-symbols-outlined text-white/60"
                    style={{ fontVariationSettings: "'FILL' 1" }}>podcasts</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{p.name}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{p.episode}</p>
                  <div className="mt-2 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full transition-all"
                      style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
                <button className="flex-shrink-0 w-10 h-10 bg-surface-container-high rounded-full
                                   flex items-center justify-center hover:bg-primary/20 transition-colors
                                   opacity-80 group-hover:opacity-100">
                  <span className="material-symbols-outlined text-on-surface"
                    style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── Popular Shows ───────────────────────────── */}
      <section>
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="font-headline font-bold text-xl tracking-tight mb-5"
        >
          Popular Shows
        </motion.h2>

        {podcasts === null ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="skeleton rounded-lg" style={{ aspectRatio: '0.8' }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {podcasts.map((p, i) => (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                className="card text-left overflow-hidden"
              >
                <div className={`w-full aspect-square bg-gradient-to-br ${COLORS[i % COLORS.length]}
                                 flex items-center justify-center`}>
                  <span className="material-symbols-outlined text-white/30 text-5xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}>podcasts</span>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm truncate">{p.name}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5 truncate line-clamp-2">
                    {p.description}
                  </p>
                  {p.episode_count && (
                    <p className="text-xs text-on-surface-variant/60 mt-1">
                      {p.episode_count} episodes
                    </p>
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
