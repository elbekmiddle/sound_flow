import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore.js';
import usePlayerStore from '../store/playerStore.js';
import { musicApi, historyApi } from '../api/client.js';
import TrackRow from '../components/TrackRow.jsx';

const GRADS = [
  'linear-gradient(135deg,rgba(139,92,246,.5),rgb(46,16,101))',
  'linear-gradient(135deg,rgba(6,182,212,.4),rgb(22,78,99))',
  'linear-gradient(135deg,rgba(244,63,94,.4),rgb(136,19,55))',
  'linear-gradient(135deg,rgba(245,158,11,.4),rgb(120,53,15))',
  'linear-gradient(135deg,rgba(16,185,129,.4),rgb(6,78,59))',
  'linear-gradient(135deg,rgba(99,102,241,.5),rgb(49,46,129))',
];

function Skeleton({ w, h, style }) {
  return <div className="skeleton" style={{ width: w, height: h, ...style }} />;
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } },
};
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export default function HomePage() {
  const { profile } = useAuthStore();
  const { play }    = usePlayerStore();
  const [trending, setTrending] = useState(null);
  const [history,  setHistory]  = useState(null);

  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const name = profile?.display_name || 'there';

  useEffect(() => {
    musicApi.trending().then(setTrending).catch(() => setTrending([]));
    historyApi.get().then((t) => setHistory(t.slice(0, 6))).catch(() => setHistory([]));
  }, []);

  const quickPicks = [
    { label: 'Liked Songs',     icon: 'favorite',     grad: 'linear-gradient(135deg,rgba(255,148,164,.3),rgb(136,19,55))',  iconColor: 'var(--color-tertiary)' },
    { label: 'Your Mix',        icon: 'auto_awesome', grad: 'linear-gradient(135deg,rgba(199,153,255,.3),rgb(68,0,128))',   iconColor: 'var(--color-primary)'  },
    { label: 'Recently Played', icon: 'history',      grad: 'linear-gradient(135deg,rgba(74,248,227,.25),rgb(0,91,81))',   iconColor: 'var(--color-secondary)'},
  ];

  const C = {
    text:    'var(--color-on-surface)',
    muted:   'var(--color-on-surface-variant)',
    surface: 'var(--color-surface-container)',
    surfHi:  'var(--color-surface-container-high)',
    surfBr:  'var(--color-surface-bright)',
    primary: 'var(--color-primary)',
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1280, margin: '0 auto' }}>

      {/* ── Header ───────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: C.muted, fontSize: 13, fontWeight: 500 }}>{greeting}</p>
          <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 900, fontSize: 28,
            letterSpacing: '-0.03em', marginTop: 2 }}>
            {name}
          </h1>
        </div>
      </motion.div>

      {/* ── Quick picks ──────────────────────────────── */}
      <motion.div variants={container} initial="hidden" animate="show"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 40 }}>
        {quickPicks.map((item2, i) => (
          <motion.button key={i} variants={item}
            onClick={() => trending?.length && play(trending[i % trending.length], trending)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: C.surfHi, borderRadius: 10,
              border: 'none', cursor: 'pointer',
              overflow: 'hidden', transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = C.surfBr; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = C.surfHi; }}
          >
            <div style={{
              width: 56, height: 56, flexShrink: 0,
              background: item2.grad,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined ms-fill"
                style={{ color: item2.iconColor, fontSize: 24 }}>{item2.icon}</span>
            </div>
            <span style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{item2.label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* ── Trending ─────────────────────────────────── */}
      <section style={{ marginBottom: 40 }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>
            Trending Now
          </h2>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: C.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            See all
          </button>
        </motion.div>

        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 12 }} className="no-scrollbar">
          {trending === null
            ? Array(6).fill(0).map((_, i) => <Skeleton key={i} w={176} h={224} style={{ flexShrink: 0 }} />)
            : trending.slice(0, 8).map((track, i) => (
                <motion.button key={track.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  onClick={() => play(track, trending)}
                  style={{
                    width: 176, flexShrink: 0,
                    background: 'var(--color-surface-container)',
                    borderRadius: 12, overflow: 'hidden',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    transition: 'transform 0.2s, background 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.background = 'var(--color-surface-container-high)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.background = 'var(--color-surface-container)'; }}
                >
                  <div style={{ height: 176, background: GRADS[i % GRADS.length], position: 'relative', overflow: 'hidden' }}>
                    {track.thumbnail && (
                      <img src={track.thumbnail} alt={track.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(0,0,0,0.4)',
                      opacity: 0, transition: 'opacity 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                    >
                      <span className="material-symbols-outlined ms-fill" style={{ color: '#fff', fontSize: 52 }}>play_circle</span>
                    </div>
                  </div>
                  <div style={{ padding: '12px 12px 14px' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.text,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</p>
                    <p style={{ fontSize: 11, color: C.muted, marginTop: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist}</p>
                  </div>
                </motion.button>
              ))
          }
        </div>
      </section>

      {/* ── Recently Played ──────────────────────────── */}
      <section style={{ marginBottom: 40 }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
          style={{ marginBottom: 16 }}>
          <h2 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>
            Recently Played
          </h2>
          <p style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Pick up where you left off</p>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {history === null
            ? Array(5).fill(0).map((_, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px' }}>
                <Skeleton w={32} h={14} /> <Skeleton w={40} h={40} />
                <div style={{ flex: 1 }}><Skeleton w="60%" h={12} style={{ marginBottom: 6 }} /><Skeleton w="35%" h={10} /></div>
              </div>)
            : history.length === 0
              ? <p style={{ color: C.muted, fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
                  No history yet. Start listening!
                </p>
              : history.map((t, i) => <TrackRow key={t.id} track={t} index={i} queue={history} />)
          }
        </div>
      </section>

      {/* ── Recommended ──────────────────────────────── */}
      {trending && trending.length > 8 && (
        <section style={{ marginBottom: 40 }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>
              Recommended
            </h2>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: C.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Refresh
            </button>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 16 }}>
            {trending.slice(8, 16).map((track, i) => (
              <motion.button key={track.id}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.28 + i * 0.04 }}
                onClick={() => play(track, trending.slice(8))}
                style={{
                  background: 'var(--color-surface-container)', borderRadius: 12,
                  padding: 12, border: 'none', cursor: 'pointer', textAlign: 'left',
                  transition: 'transform 0.2s, background 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.background = 'var(--color-surface-container-high)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.background = 'var(--color-surface-container)'; }}
              >
                <div style={{ width: '100%', aspectRatio: '1', borderRadius: 8, overflow: 'hidden',
                  background: GRADS[i % GRADS.length], marginBottom: 12 }}>
                  {track.thumbnail && (
                    <img src={track.thumbnail} alt={track.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                      onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                    />
                  )}
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</p>
                <p style={{ fontSize: 11, color: C.muted, marginTop: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist}</p>
              </motion.button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
